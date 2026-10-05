"""AI 판정을 보존하면서 현재 보고서의 항목별 사람 검토를 검증한다."""
import re
import unicodedata
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator


class HumanReviewError(ValueError):
    def __init__(self, message, status_code=422):
        super().__init__(message)
        self.status_code = status_code


def normalized_quote(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


class HumanCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: str = Field(min_length=1, max_length=80)
    chunk_id: str = Field(min_length=1, max_length=120)
    quote: str = Field(min_length=5, max_length=1500)


class HumanResolution(BaseModel):
    model_config = ConfigDict(extra="forbid")
    check_id: str = Field(min_length=1, max_length=80)
    action: Literal["confirm_evidence", "editorial"]
    reason: str = Field(min_length=5, max_length=2000)
    confirmed: Literal[True]
    evidence: list[HumanCitation] = Field(max_length=8)

    @field_validator("reason")
    @classmethod
    def reason_required(cls, value):
        if len(value.strip()) < 5:
            raise ValueError("확인한 내용과 판단 이유를 5자 이상 입력해주세요.")
        return value.strip()

    @model_validator(mode="after")
    def evidence_required(self):
        if self.action == "confirm_evidence" and not self.evidence:
            raise ValueError("사실을 직접 확인하려면 자료의 실제 발췌가 필요합니다.")
        if self.action == "editorial" and self.evidence:
            raise ValueError("의견·분석·제안 검토에는 사실 확인 근거를 함께 저장하지 않습니다.")
        return self


def report_reviewable(report):
    return bool(report and report.get("report_status") == "complete" and report.get("coverage") and
                all(part["status"] == "reviewed" for part in report["coverage"]) and
                not report.get("coverage_notes") and not report.get("unanchored_checks"))


def validate_resolutions(report, resolutions):
    if not report_reviewable(report):
        raise HumanReviewError("기사 검사 누락·인용 오류가 있거나 결과가 오래되었습니다. 현재 초안을 재검증해주세요.", 409)
    pending = {check["id"]: check for check in report["checks"] if check["verdict"] != "match"}
    pool = {(source["source_id"], chunk["chunk_id"]): chunk
            for source in report.get("read_sources", []) for chunk in source.get("chunks", [])}
    saved, seen = [], set()
    for value in resolutions:
        item = value if isinstance(value, HumanResolution) else HumanResolution.model_validate(value)
        if item.check_id not in pending or item.check_id in seen:
            raise HumanReviewError("현재 보고서의 미해결 항목마다 검토 결정을 하나씩 입력해주세요.")
        seen.add(item.check_id)
        check = pending[item.check_id]
        if item.action == "editorial" and check["verdict"] == "mismatch":
            raise HumanReviewError("근거와 불일치한 사실은 의견·분석·제안 분류로 해제할 수 없습니다. 문장을 수정하거나 실제 근거로 확인해주세요.")
        for citation in item.evidence:
            chunk = pool.get((citation.source_id, citation.chunk_id))
            quote = normalized_quote(citation.quote)
            if not chunk or len(quote) < 5 or quote not in normalized_quote(chunk["text"]):
                raise HumanReviewError("사람 검토의 근거 인용을 이번 보고서의 실제 자료 발췌에서 찾지 못했습니다. 발췌를 선택해 그대로 넣어주세요.")
        saved.append(item.model_dump())
    if set(pending) != seen:
        raise HumanReviewError(f"아직 항목별 사람 검토가 필요한 사실이 {len(set(pending) - seen)}개 있습니다. 수정·재검증 또는 근거·판단 기록을 마쳐주세요.", 409)
    return sorted(saved, key=lambda item: item["check_id"])


def approval_ready(report, resolutions=()):
    try:
        validate_resolutions(report, resolutions)
        return all(check["verdict"] != "match" or check["evidence"] for check in report["checks"])
    except (HumanReviewError, ValidationError, KeyError, TypeError):
        return False


def human_evidence_details(report, resolutions):
    names = {source["source_id"]: source for source in report.get("read_sources", [])}
    pool = {(source["source_id"], chunk["chunk_id"]): chunk
            for source in report.get("read_sources", []) for chunk in source.get("chunks", [])}
    details = []
    for item in resolutions:
        for citation in item["evidence"]:
            source = names[citation["source_id"]]
            chunk = pool[(citation["source_id"], citation["chunk_id"])]
            details.append(dict(citation, check_id=item["check_id"], source_name=source["name"],
                                locator=chunk["locator"], url=source["resolved_url"] or source["url"], origin=source["origin"]))
    return details
