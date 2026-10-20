"""Unconfirmed human input, separate from approval resolutions."""
from difflib import SequenceMatcher
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
    segment_text = next(p["text"] for p in report.get("coverage", []) if p["id"] == check["segment_id"])
    return {"claim_fingerprint": claim_fingerprint(check), "segment_id": check["segment_id"],
            "original_quote": check["original_quote"], "segment_text": segment_text,
            "claim": check["claim"], "verdict": check["verdict"],
            "report_id": report["id"], "source_revision": report["source_revision"],
            "evidence_fingerprint": evidence_fingerprint(report),
            "input": dict(item.model_dump(), confirmed=False)}


def overlap_ratio(first, second):
    """Longest shared run of characters relative to the shorter quote."""
    first, second = normalized_quote(first or ""), normalized_quote(second or "")
    if not first or not second:
        return 0.0
    match = SequenceMatcher(None, first, second, autojunk=False).find_longest_match(0, len(first), 0, len(second))
    return match.size / min(len(first), len(second))


def same_unchanged_text(record, check, segment_texts):
    """AI quoted a different span of text that is unchanged between the saved and current drafts."""
    old_quote, new_quote = normalized_quote(record.get("original_quote", "")), normalized_quote(check["original_quote"])
    old_text = normalized_quote(record.get("segment_text") or "")
    new_text = segment_texts.get(check["segment_id"], "")
    return bool(old_quote and new_quote and old_text and new_text and
                old_quote in new_text and new_quote in old_text and overlap_ratio(old_quote, new_quote) >= 0.5)


def uses_report_evidence(item):
    # Externally checked (B) evidence and editorial judgements do not depend on this report's excerpts.
    return item.get("action") != "editorial" and not item.get("external_evidence")


# Report keys that must still match for input saved before re-verification: same original, sources, original check.
PENDING_BASE_KEYS = ("original_revision", "source_revision", "original_report_id")


def unchanged_checks(report, content):
    """Unresolved checks whose quoted sentence is still in the saved draft (re-verification pending)."""
    from final_review import draft_segments  # lazy: final_review imports storage
    try:
        current = {part["id"]: normalized_quote(part["text"]) for part in draft_segments(content)}
    except ValueError:
        return []
    ids = []
    for check in report.get("checks", []):
        try:
            anchored_check(report, check["id"])
        except HumanReviewError:
            continue
        quote = normalized_quote(check["original_quote"])
        text = current.get(check["segment_id"])
        if quote in text if text is not None else any(quote in value for value in current.values()):
            ids.append(check["id"])
    return ids


def review_draft_hints(report, records, pending=False):
    """pending=True: the report predates the saved draft; inputs come back again after re-verification."""
    if not report or not records:
        return []
    # Recompute keys from stored text so pre-upgrade records remain usable without migration.
    latest = {claim_fingerprint(r): r for r in sorted(records, key=lambda r: (r.get("saved_at", ""), r.get("report_id", "")))}
    segment_texts = {p["id"]: normalized_quote(p["text"]) for p in report.get("coverage", [])}
    checks = []
    for check in report.get("checks", []):
        try:
            anchored_check(report, check["id"])
        except HumanReviewError:
            continue
        checks.append(check)
    matched, used = {}, set()
    for check in checks:
        key = claim_fingerprint(check)
        if key in latest:
            matched[check["id"]] = (latest[key], False)
            used.add(key)
    # Same article text, different AI quote span: pair one saved input with one current item.
    candidates = sorted(((r.get("segment_id") != check["segment_id"], -overlap_ratio(r.get("original_quote"), check["original_quote"]),
                          index, key) for index, check in enumerate(checks) if check["id"] not in matched
                         for key, r in latest.items() if key not in used and same_unchanged_text(r, check, segment_texts)))
    for _, _, index, key in candidates:
        check = checks[index]
        if check["id"] not in matched and key not in used:
            matched[check["id"]] = (latest[key], True)
            used.add(key)
    hints = []
    for check in checks:
        if check["id"] not in matched:
            # Only for an earlier input about this sentence, not any input elsewhere in the paragraph.
            if any(key not in used and r.get("segment_id") == check["segment_id"] and
                   overlap_ratio(r.get("original_quote"), check["original_quote"]) >= 0.3 for key, r in latest.items()):
                hints.append({"check_id": check["id"], "input": None, "message":
                              "재검증 후 다시 확인 · 이전 문장에 입력한 검토는 불러오지 않았습니다." if pending else
                              "기사 문장이 변경되어 재확인 필요 · 이전 입력은 바뀐 문장에 맞지 않을 수 있어 불러오지 않았습니다."})
            continue
        previous, shifted = matched[check["id"]]
        item = dict(previous["input"], check_id=check["id"], confirmed=False)
        message = ("임시 저장한 검토 내용 · 재검증 후 다시 불러오며 확인 체크는 그때 합니다." if pending else
                   "이전 검토 내용 불러옴 · 현재 결과를 다시 확인해주세요.")
        if shifted:
            message += " 같은 문장을 AI가 다른 범위로 인용해 이전 입력을 연결했습니다."
        if uses_report_evidence(item) and (previous["source_revision"] != report["source_revision"] or
                                           previous["evidence_fingerprint"] != evidence_fingerprint(report)):
            message += " 근거가 변경되어 재확인 필요."
        if previous.get("verdict") and previous["verdict"] != check["verdict"]:
            message += " AI 판정이 변경되었습니다. 기존 검토 내용을 확인해 주세요."
        if check["verdict"] == "mismatch" and item["action"] == "editorial":
            item["action"] = ""
            message += " 현재 불일치 판정에 맞는 검토 방법을 다시 선택해주세요."
        hints.append({"check_id": check["id"], "message": message, "input": item})
    return hints
