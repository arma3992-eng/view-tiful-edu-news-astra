"""교육뉴스 편집실 — 원문 검증부터 최종 승인·기사 내보내기까지."""
from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator
from storage import RevisionConflict, Store
from dotenv import load_dotenv
from document_reader import DocumentError, MAX_FILE_BYTES, read_pdf, read_url
from verification import VerificationError, ai_config, verify_original
from rewriting import DraftContent, Plan, generate_draft, prepare_items, validate_content
from final_review import verify_draft
from exporting import html_export, json_export
from human_review import HumanResolution, HumanReviewError, validate_resolutions
from datetime import date
from web_research import web_enabled

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env", encoding="utf-8-sig")
DATABASE = Path(os.environ.get("NEWS_EDITOR_DB_PATH", str(ROOT / "data" / "editor.sqlite3")))


class OriginalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    original_text: str = Field(min_length=1, max_length=100000)
    original_url: HttpUrl | None = None

    @field_validator("original_text")
    @classmethod
    def text_must_exist(cls, value):
        if not value.strip():
            raise ValueError("원문 기사 내용이 필요합니다.")
        return value.strip()


class OriginalUpdate(OriginalInput):
    expected_revision: int = Field(ge=1)


class InterviewDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    speaker: str = Field(min_length=1, max_length=150)
    role: str = Field(default="", max_length=200)
    interviewed_on: date
    method: Literal["대면", "전화", "이메일", "서면", "기타"] = "서면"

    @field_validator("speaker", "role")
    @classmethod
    def clean_details(cls, value):
        if not value.strip() and value:
            raise ValueError("인터뷰 대상 표기를 확인해주세요.")
        return value.strip()


class SourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    kind: Literal["official", "press", "interview", "other"] = "official"
    url: HttpUrl | None = None
    locator: str = Field(default="", max_length=500)
    excerpt: str = Field(default="", max_length=50000)
    material_id: str | None = Field(default=None, max_length=36)
    interview: InterviewDetails | None = None
    expected_revision: int = Field(ge=1)
    expected_source_revision: int = Field(ge=0)

    @field_validator("name", "locator", "excerpt")
    @classmethod
    def clean_text(cls, value):
        return value.strip()

    @model_validator(mode="after")
    def evidence_required(self):
        if not self.name:
            raise ValueError("자료 이름이 필요합니다.")
        if self.url is None and not self.excerpt and not self.material_id:
            raise ValueError("자료 주소, PDF 또는 근거 내용을 입력해주세요.")
        if self.kind == "interview" and (not self.interview or not self.interview.speaker or not self.excerpt):
            raise ValueError("인터뷰 대상·날짜와 실제 발언 기록을 함께 입력해주세요.")
        if self.kind != "interview" and self.interview:
            raise ValueError("인터뷰 기록은 자료 종류를 인터뷰·취재 기록으로 선택해주세요.")
        return self


class URLInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: HttpUrl


class RevisionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    expected_source_revision: int = Field(ge=0)


class VerificationInput(RevisionInput):
    web_search: bool | None = None


class PlanInput(RevisionInput):
    report_id: str = Field(min_length=1, max_length=36)
    expected_plan_revision: int = Field(ge=0)
    content: Plan


class DraftRequest(RevisionInput):
    report_id: str = Field(min_length=1, max_length=36)
    expected_plan_revision: int = Field(ge=1)
    expected_draft_revision: int = Field(ge=0)


class DraftInput(DraftRequest):
    content: DraftContent


class FinalRequest(DraftRequest):
    expected_draft_revision: int = Field(ge=1)
    expected_final_report_id: str | None = Field(max_length=36)


class FinalVerificationInput(FinalRequest):
    web_search: bool | None = None


class ApprovalInput(FinalRequest):
    expected_final_report_id: str = Field(min_length=1, max_length=36)
    reviewer: str = Field(min_length=1, max_length=100)
    facts_reviewed: Literal[True]
    editorial_reviewed: Literal[True]
    rights_reviewed: Literal[True]
    resolutions: list[HumanResolution] = Field(default_factory=list, max_length=80)

    @field_validator("reviewer")
    @classmethod
    def reviewer_required(cls, value):
        if not value.strip():
            raise ValueError("최종 검토자 이름을 입력해주세요.")
        return value.strip()


@asynccontextmanager
async def lifespan(app):
    app.state.store = Store(DATABASE)
    yield


app = FastAPI(title="교육뉴스 편집실 — 최종 검증·승인", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


def must_exist(record):
    if record is None:
        raise HTTPException(status_code=404, detail="저장된 기사를 찾을 수 없습니다.")
    return record


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(ROOT / "static" / "index.html")


@app.exception_handler(DocumentError)
def document_error(request, error):
    return JSONResponse(status_code=400, content={"detail": str(error)})


@app.exception_handler(VerificationError)
def verification_error(request, error):
    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


@app.exception_handler(HumanReviewError)
def human_review_error(request, error):
    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(ROOT / "static" / "favicon.svg", media_type="image/svg+xml")


@app.get("/api/health")
def health():
    config = ai_config()
    return {"status": "ok", "step": 5, "verification_available": True, "rewriting_available": True,
            "final_review_available": True, "approval_available": True, "export_available": True,
            "human_review_available": True,
            "web_search_available": True, "web_search_default": web_enabled(), "interview_available": True,
            "publishing_available": False,
            "ai_configured": config["configured"], "model": config["model"]}


@app.post("/api/materials/url", status_code=201)
def import_url(payload: URLInput):
    document, data = read_url(str(payload.url))
    return app.state.store.create_material(document, data)


@app.post("/api/materials/pdf", status_code=201)
def import_pdf(file: UploadFile = File()):
    try:
        data = file.file.read(MAX_FILE_BYTES + 1)
        document = read_pdf(data, file.filename or "document.pdf")
        return app.state.store.create_material(document, data)
    finally:
        file.file.close()


@app.get("/api/materials/{material_id}")
def read_material(material_id: str):
    return must_exist(app.state.store.get_material(material_id))


@app.get("/api/materials/{material_id}/file")
def material_file(material_id: str):
    material = must_exist(app.state.store.get_material(material_id))
    path = app.state.store.material_file(material_id)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="첨부 파일을 찾을 수 없습니다.")
    return FileResponse(path, media_type="application/pdf", filename=material["title"],
                        content_disposition_type="inline")


@app.get("/api/articles")
def recent_articles():
    return {"articles": app.state.store.list_recent()}


@app.post("/api/articles", status_code=201)
def create_article(payload: OriginalInput):
    return app.state.store.create(payload.original_text, str(payload.original_url) if payload.original_url else None)


@app.get("/api/articles/{article_id}")
def read_article(article_id: str):
    return must_exist(app.state.store.get(article_id))


@app.put("/api/articles/{article_id}")
def update_article(article_id: str, payload: OriginalUpdate):
    try:
        return must_exist(app.state.store.update(
            article_id, payload.original_text,
            str(payload.original_url) if payload.original_url else None,
            payload.expected_revision,
        ))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="다른 화면에서 변경되었습니다. 저장된 기사를 다시 불러온 뒤 수정해주세요.")


@app.post("/api/articles/{article_id}/sources", status_code=201)
def add_source(article_id: str, payload: SourceInput):
    if payload.material_id:
        must_exist(app.state.store.get_material(payload.material_id))
    source = {
        "name": payload.name, "kind": payload.kind,
        "url": str(payload.url) if payload.url else None,
        "locator": payload.locator, "excerpt": payload.excerpt,
        "material_id": payload.material_id,
        "interview": payload.interview.model_dump(mode="json") if payload.interview else None,
    }
    try:
        return must_exist(app.state.store.add_source(
            article_id, source, payload.expected_revision, payload.expected_source_revision,
        ))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="기사 또는 근거가 변경되었습니다. 저장된 기사를 다시 불러온 뒤 등록해주세요.")


@app.post("/api/articles/{article_id}/verify")
def verify_article(article_id: str, payload: VerificationInput):
    article = must_exist(app.state.store.get(article_id))
    if article["revision"] != payload.expected_revision or article["source_revision"] != payload.expected_source_revision:
        raise HTTPException(status_code=409, detail="원문 또는 근거가 변경되었습니다. 저장한 기사를 다시 불러와 검증해주세요.")
    report = verify_original(article, app.state.store, payload.web_search)
    try:
        return must_exist(app.state.store.save_report(article_id, report,
            payload.expected_revision, payload.expected_source_revision))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="검증 중 원문 또는 근거가 변경되었습니다. 이번 결과를 저장하지 않았습니다. 최신 기사로 다시 검증해주세요.")


def editor_article(article_id, payload):
    article = must_exist(app.state.store.get(article_id))
    if article["revision"] != payload.expected_revision or article["source_revision"] != payload.expected_source_revision:
        raise HTTPException(status_code=409, detail="원문 또는 근거가 바뀌었습니다. 저장한 기사를 다시 불러와 검증·편집 결정을 확인해주세요.")
    return article


@app.put("/api/articles/{article_id}/rewrite-plan")
def save_rewrite_plan(article_id: str, payload: PlanInput):
    article = editor_article(article_id, payload)
    prepare_items(article, payload.report_id, payload.content)
    try:
        return must_exist(app.state.store.save_plan(article_id, payload.content.model_dump(), payload.report_id,
            payload.expected_revision, payload.expected_source_revision, payload.expected_plan_revision))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="편집 결정 또는 검증 결과가 변경되었습니다. 저장한 기사를 다시 불러와 확인해주세요.")


def draft_inputs(article_id, payload):
    article = editor_article(article_id, payload)
    if (article["rewrite_plan_status"] != "current" or article["plan_revision"] != payload.expected_plan_revision or
            article["draft_revision"] != payload.expected_draft_revision):
        raise HTTPException(status_code=409, detail="편집 결정 또는 초안이 바뀌었습니다. 저장한 기사를 다시 불러와 확인해주세요.")
    plan = Plan.model_validate(article["rewrite_plan"]["content"])
    items, warnings = prepare_items(article, payload.report_id, plan)
    return article, plan, items, warnings


@app.post("/api/articles/{article_id}/draft/generate")
def generate_article_draft(article_id: str, payload: DraftRequest):
    article, plan, _, _ = draft_inputs(article_id, payload)
    content, metadata = generate_draft(article, app.state.store, payload.report_id, plan)
    metadata["model"] = ai_config()["model"]
    try:
        return must_exist(app.state.store.save_draft(article_id, content.model_dump(), metadata, payload.report_id,
            payload.expected_revision, payload.expected_source_revision, payload.expected_plan_revision, payload.expected_draft_revision))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="AI 작성 중 기사·근거·편집 결정·초안이 바뀌었습니다. 이번 초안을 덮어쓰지 않았습니다. 저장한 기사를 다시 불러와 확인해주세요.")


@app.put("/api/articles/{article_id}/draft")
def save_article_draft(article_id: str, payload: DraftInput):
    article, _, items, warnings = draft_inputs(article_id, payload)
    warnings += validate_content(payload.content, items)
    metadata = {"items": items, "warnings": list(dict.fromkeys(warnings)), "origin": "manual", "usage": {}, "read_sources": []}
    try:
        return must_exist(app.state.store.save_draft(article_id, payload.content.model_dump(), metadata, payload.report_id,
            payload.expected_revision, payload.expected_source_revision, payload.expected_plan_revision, payload.expected_draft_revision))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="기사·근거·편집 결정·초안이 바뀌었습니다. 저장한 기사를 다시 불러와 확인해주세요.")


def final_inputs(article_id, payload):
    article = editor_article(article_id, payload)
    last = article["final_verification_report"]
    if (not article["draft"] or article["draft_status"] == "stale" or
            article["rewrite_plan_status"] != "current" or
            article["plan_revision"] != payload.expected_plan_revision or
            article["draft_revision"] != payload.expected_draft_revision or
            not article["verification_report"] or article["verification_report"]["id"] != payload.report_id or
            (last["id"] if last else None) != payload.expected_final_report_id):
        raise HTTPException(status_code=409, detail="기사·근거·편집 결정·검증 결과가 바뀌었거나 저장한 초안이 없습니다. 최신 기사를 불러와 초안을 저장해주세요.")
    return article


def final_versions(payload):
    return (payload.report_id, payload.expected_revision, payload.expected_source_revision,
            payload.expected_plan_revision, payload.expected_draft_revision, payload.expected_final_report_id)


@app.post("/api/articles/{article_id}/draft/verify")
def verify_article_draft(article_id: str, payload: FinalVerificationInput):
    article = final_inputs(article_id, payload)
    report = verify_draft(article, app.state.store, payload.web_search)
    try:
        return must_exist(app.state.store.save_final_report(article_id, report, *final_versions(payload)))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="최종 검증 중 기사 또는 검증 결과가 바뀌었습니다. 이번 결과를 저장하지 않았습니다. 최신 초안으로 다시 검증해주세요.")


@app.post("/api/articles/{article_id}/approve")
def approve_article(article_id: str, payload: ApprovalInput):
    article = final_inputs(article_id, payload)
    if not article["can_review"]:
        raise HTTPException(status_code=409, detail="최종 검증의 미해결 항목·검사 누락이 있거나 결과가 오래되었습니다. 수정·저장 후 재검증해주세요.")
    validate_resolutions(article["final_verification_report"], payload.resolutions)
    acknowledgements = {key: getattr(payload, key) for key in ("facts_reviewed", "editorial_reviewed", "rights_reviewed")}
    try:
        return must_exist(app.state.store.save_approval(article_id, payload.reviewer, acknowledgements, *final_versions(payload),
                                                       resolutions=[item.model_dump() for item in payload.resolutions]))
    except RevisionConflict:
        raise HTTPException(status_code=409, detail="승인할 기사 또는 최종 결과가 바뀌었습니다. 최신 기사를 다시 불러와 검토해주세요.")


@app.get("/api/articles/{article_id}/export/{format}")
def export_article(article_id: str, format: Literal["html", "json"], approval_id: str = Query(min_length=1, max_length=36)):
    article = must_exist(app.state.store.get(article_id))
    if not article["can_export"] or article["approval"]["id"] != approval_id:
        raise HTTPException(status_code=409, detail="현재 기사 버전의 승인이 필요합니다. 최신 기사를 불러와 재검증·승인을 확인해주세요.")
    content = html_export(article) if format == "html" else json_export(article)
    return Response(content, media_type="text/html" if format == "html" else "application/json",
                    headers={"Content-Disposition": f'attachment; filename="article-{article_id}-v{article["draft_revision"]}.{format}"',
                             "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
