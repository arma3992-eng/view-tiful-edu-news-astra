"""Unconfirmed human input, separate from approval resolutions."""
import hashlib
import json
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from human_review import HumanReviewError, normalized_quote


class DraftCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: str = Field(min_length=1, max_length=80)
    chunk_id: str = Field(min_length=1, max_length=120)
    quote: str = Field(default="", max_length=1500)


class DraftExternalCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_url: str = Field(default="", max_length=2000)
    source_label: str = Field(default="", max_length=500)
    quote: str = Field(default="", max_length=1500)


class ReviewDraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    check_id: str = Field(min_length=1, max_length=80)
    action: Literal["", "confirm_evidence", "editorial", "edit"] = ""
    reason: str = Field(default="", max_length=2000)
    evidence: list[DraftCitation] = Field(default_factory=list, max_length=1)
    external_evidence: list[DraftExternalCitation] = Field(default_factory=list, max_length=1)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def claim_fingerprint(check):
    # Article isolation is supplied by the table's article_id composite key/query.
    return digest([check["segment_id"], normalized_quote(check["original_quote"])])


def evidence_fingerprint(report):
    # Exclude read timestamps; include actual excerpts, identities and source metadata.
    sources = [{key: source.get(key) for key in ("source_id", "name", "url", "resolved_url", "origin")}
               | {"chunks": sorted([{key: chunk.get(key) for key in ("chunk_id", "text", "locator")}
                                    for chunk in source.get("chunks", [])], key=lambda x: x["chunk_id"])}
               for source in report.get("read_sources", [])]
    return digest(sorted(sources, key=lambda x: x["source_id"]))


def anchored_check(report, check_id):
    checks = [c for c in report.get("checks", []) if c["id"] == check_id]
    if len(checks) != 1:
        raise HumanReviewError("현재 보고서의 검토 항목을 확인해주세요.", 409)
    check = checks[0]
    parts = [p for p in report.get("coverage", []) if p["id"] == check["segment_id"]]
    quote = normalized_quote(check["original_quote"])
    if (check["verdict"] not in ("mismatch", "needs_context", "unverifiable") or len(parts) != 1 or
            not quote or quote not in normalized_quote(parts[0]["text"]) or
            any(c.get("id") == check_id for c in report.get("unanchored_checks", []))):
        raise HumanReviewError("유효한 기사 인용에 연결된 미해결 항목만 저장할 수 있습니다.", 409)
    return check


def prepare_review_draft(report, item):
    check = anchored_check(report, item.check_id)
    pool = {(s["source_id"], c["chunk_id"]) for s in report.get("read_sources", []) for c in s.get("chunks", [])}
    if any((c.source_id, c.chunk_id) not in pool for c in item.evidence):
        raise HumanReviewError("현재 보고서에서 읽은 근거 발췌를 선택해주세요.")
    return {"claim_fingerprint": claim_fingerprint(check), "segment_id": check["segment_id"],
            "original_quote": check["original_quote"], "claim": check["claim"], "verdict": check["verdict"],
            "report_id": report["id"], "source_revision": report["source_revision"],
            "evidence_fingerprint": evidence_fingerprint(report),
            "input": dict(item.model_dump(), confirmed=False)}


def review_draft_hints(report, records):
    if not report or not records:
        return []
    # Recompute keys from stored text so pre-upgrade records remain usable without migration.
    exact = {claim_fingerprint(r): r for r in sorted(records, key=lambda r: (r.get("saved_at", ""), r.get("report_id", "")))}
    hints = []
    for check in report.get("checks", []):
        try:
            anchored_check(report, check["id"])
        except HumanReviewError:
            continue
        previous = exact.get(claim_fingerprint(check))
        if not previous:
            if any(r["segment_id"] == check["segment_id"] for r in records):
                hints.append({"check_id": check["id"], "message": "기사 문장이 변경되어 재확인 필요", "input": None})
            continue
        item = dict(previous["input"], check_id=check["id"], confirmed=False)
        message = "이전 검토 내용 불러옴 · 현재 결과를 다시 확인해주세요."
        if (previous["source_revision"] != report["source_revision"] or
                previous["evidence_fingerprint"] != evidence_fingerprint(report)):
            message += " 근거가 변경되어 재확인 필요."
        if previous.get("verdict") and previous["verdict"] != check["verdict"]:
            message += " AI 판정이 변경되었습니다. 기존 검토 내용을 확인해 주세요."
        if check["verdict"] == "mismatch" and item["action"] == "editorial":
            item["action"] = ""
            message += " 현재 불일치 판정에 맞는 검토 방법을 다시 선택해주세요."
        hints.append({"check_id": check["id"], "message": message, "input": item})
    return hints
