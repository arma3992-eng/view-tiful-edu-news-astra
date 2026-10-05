"""원문·근거·첨부 자료·검증 결과 저장소."""
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import uuid
import json
import hashlib
from human_review import approval_ready, report_reviewable, validate_resolutions
from evidence_catalog import evidence_catalog


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def draft_content_hash(content):
    encoded = json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def report_allows_approval(report, resolutions=()):
    return approval_ready(report, resolutions)


class RevisionConflict(Exception):
    pass


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS articles (
                    id TEXT PRIMARY KEY, original_text TEXT NOT NULL, original_url TEXT,
                    revision INTEGER NOT NULL DEFAULT 1,
                    source_revision INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    article_id TEXT NOT NULL REFERENCES articles(id),
                    name TEXT NOT NULL, kind TEXT NOT NULL, url TEXT,
                    locator TEXT NOT NULL, excerpt TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS materials (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL,
                    document_json TEXT NOT NULL, filename TEXT, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS verification_reports (
                    id TEXT PRIMARY KEY,
                    article_id TEXT NOT NULL REFERENCES articles(id),
                    original_revision INTEGER NOT NULL, source_revision INTEGER NOT NULL,
                    report_json TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS editor_work (
                    article_id TEXT PRIMARY KEY REFERENCES articles(id),
                    plan_revision INTEGER NOT NULL DEFAULT 0,
                    draft_revision INTEGER NOT NULL DEFAULT 0,
                    plan_json TEXT, draft_json TEXT
                );
                CREATE TABLE IF NOT EXISTS final_verification_reports (
                    id TEXT PRIMARY KEY,
                    article_id TEXT NOT NULL REFERENCES articles(id),
                    report_json TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS article_approvals (
                    id TEXT PRIMARY KEY,
                    article_id TEXT NOT NULL REFERENCES articles(id),
                    approval_json TEXT NOT NULL, created_at TEXT NOT NULL
                );
            """)
            columns = {row["name"] for row in db.execute("PRAGMA table_info(sources)")}
            if "material_id" not in columns:
                db.execute("ALTER TABLE sources ADD COLUMN material_id TEXT REFERENCES materials(id)")
            if "interview_json" not in columns:
                db.execute("ALTER TABLE sources ADD COLUMN interview_json TEXT")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create(self, text, url):
        article_id = str(uuid.uuid4())
        timestamp = now_iso()
        with self.connect() as db:
            db.execute(
                "INSERT INTO articles (id, original_text, original_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (article_id, text, url, timestamp, timestamp),
            )
        return self.get(article_id)

    def get(self, article_id):
        with self.connect() as db:
            db.execute("BEGIN")
            article = db.execute("SELECT * FROM articles WHERE id=?", (article_id,)).fetchone()
            if article is None:
                return None
            record = dict(article)
            record["sources"] = [dict(row) for row in db.execute(
                "SELECT * FROM sources WHERE article_id=? ORDER BY created_at, id", (article_id,)
            )]
            report = db.execute(
                "SELECT * FROM verification_reports WHERE article_id=? ORDER BY created_at DESC, id DESC LIMIT 1",
                (article_id,),
            ).fetchone()
            work = db.execute("SELECT * FROM editor_work WHERE article_id=?", (article_id,)).fetchone()
            final_row = db.execute("SELECT report_json FROM final_verification_reports WHERE article_id=? ORDER BY rowid DESC LIMIT 1", (article_id,)).fetchone()
            approval_row = db.execute("SELECT approval_json FROM article_approvals WHERE article_id=? ORDER BY rowid DESC LIMIT 1", (article_id,)).fetchone()
        for source in record["sources"]:
            source["interview"] = json.loads(source.pop("interview_json")) if source.get("interview_json") else None
            source.pop("interview_json", None)
            source["material"] = None
            if source["material_id"]:
                material = self.get_material(source["material_id"])
                if material:
                    source["material"] = {key: material[key] for key in
                        ("id", "title", "media_type", "page_count", "warning", "created_at", "has_file")}
        saved_report = json.loads(report["report_json"]) if report else None
        status = "not_run"
        if saved_report:
            current = (report["original_revision"] == record["revision"] and
                       report["source_revision"] == record["source_revision"])
            status = ("partial" if saved_report.get("report_status") == "partial" else "completed") if current else "stale"
        plan = json.loads(work["plan_json"]) if work and work["plan_json"] else None
        draft = json.loads(work["draft_json"]) if work and work["draft_json"] else None
        def current_base(value):
            return bool(value and saved_report and status != "stale" and
                        value["original_revision"] == record["revision"] and
                        value["source_revision"] == record["source_revision"] and
                        value["report_id"] == saved_report["id"])
        plan_status = "current" if current_base(plan) else "stale" if plan else "not_saved"
        draft_status = "needs_verification" if (current_base(draft) and plan_status == "current" and
                        draft["plan_revision"] == work["plan_revision"]) else "stale" if draft else "not_started"
        final_report = json.loads(final_row["report_json"]) if final_row else None
        approval = json.loads(approval_row["approval_json"]) if approval_row else None
        binding = {"original_revision": record["revision"], "source_revision": record["source_revision"],
                   "plan_revision": work["plan_revision"] if work else 0,
                   "draft_revision": work["draft_revision"] if work else 0,
                   "original_report_id": saved_report["id"] if saved_report else None,
                   "draft_hash": draft_content_hash(draft["content"]) if draft else None}
        final_current = bool(final_report and draft_status == "needs_verification" and
                             all(final_report.get(key) == value for key, value in binding.items()))
        final_status = ("partial" if final_report.get("report_status") == "partial" else "completed") if final_current else "stale" if final_report else "not_run"
        approval_matches = bool(approval and final_current and approval["final_report_id"] == final_report["id"] and
                                all(approval.get(key) == value for key, value in binding.items()))
        approved = bool(approval_matches and report_allows_approval(final_report, approval.get("resolutions", [])))
        ready = bool(final_current and (report_allows_approval(final_report) or approved))
        if draft_status == "needs_verification" and final_current:
            draft_status = "approved" if approved else "verified" if ready else "needs_revision"
        record.update(verification_status=status, checks=saved_report["checks"] if saved_report else [],
                      verification_report=saved_report, rewrite_plan=plan, rewrite_plan_status=plan_status,
                      plan_revision=work["plan_revision"] if work else 0,
                      draft_revision=work["draft_revision"] if work else 0, draft=draft,
                      draft_status=draft_status, final_verification_report=final_report,
                      final_verification_status=final_status, approval=approval,
                      approval_status="approved" if approved else "stale" if approval else "not_approved",
                      can_approve=bool(ready and not approved), can_review=bool(final_current and report_reviewable(final_report)),
                      review_required_count=sum(check["verdict"] != "match" for check in final_report["checks"]) if final_report else 0,
                      can_export=approved, can_publish=False)
        record["evidence_sources"] = evidence_catalog(record)
        return record

    def list_recent(self):
        with self.connect() as db:
            rows = db.execute(
                "SELECT id, original_text, revision, source_revision, updated_at FROM articles ORDER BY updated_at DESC, id LIMIT 50"
            ).fetchall()
        return [{
            "id": row["id"],
            "title": next((line.strip() for line in row["original_text"].splitlines() if line.strip()), "제목 없음")[:80],
            "revision": row["revision"], "source_revision": row["source_revision"], "updated_at": row["updated_at"],
        } for row in rows]

    def update(self, article_id, text, url, expected_revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM articles WHERE id=?", (article_id,)).fetchone()
            if row is None:
                return None
            if row["revision"] != expected_revision:
                raise RevisionConflict()
            if row["original_text"] != text or row["original_url"] != url:
                db.execute(
                    "UPDATE articles SET original_text=?, original_url=?, revision=revision+1, updated_at=? WHERE id=?",
                    (text, url, now_iso(), article_id),
                )
        return self.get(article_id)

    def add_source(self, article_id, source, expected_revision, expected_source_revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT revision, source_revision FROM articles WHERE id=?", (article_id,)).fetchone()
            if row is None:
                return None
            if row["revision"] != expected_revision or row["source_revision"] != expected_source_revision:
                raise RevisionConflict()
            db.execute(
                "INSERT INTO sources (id, article_id, name, kind, url, locator, excerpt, created_at, material_id, interview_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), article_id, source["name"], source["kind"], source["url"], source["locator"], source["excerpt"], now_iso(), source.get("material_id"),
                 json.dumps(source["interview"], ensure_ascii=False) if source.get("interview") else None),
            )
            db.execute(
                "UPDATE articles SET source_revision=source_revision+1, updated_at=? WHERE id=?", (now_iso(), article_id)
            )
        return self.get(article_id)

    def create_material(self, document, data=None):
        material_id = str(uuid.uuid4())
        filename = material_id + ".pdf" if data is not None else None
        if data is not None:
            folder = self.path.parent / "uploads"
            folder.mkdir(parents=True, exist_ok=True)
            (folder / filename).write_bytes(data)
        timestamp = now_iso()
        try:
            with self.connect() as db:
                db.execute(
                    "INSERT INTO materials (id, title, document_json, filename, created_at) VALUES (?, ?, ?, ?, ?)",
                    (material_id, document["title"], json.dumps(document, ensure_ascii=False), filename, timestamp),
                )
        except Exception:
            if filename:
                (self.path.parent / "uploads" / filename).unlink(missing_ok=True)
            raise
        return self.get_material(material_id)

    def get_material(self, material_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM materials WHERE id=?", (material_id,)).fetchone()
        if row is None:
            return None
        result = json.loads(row["document_json"])
        result.update(id=row["id"], created_at=row["created_at"], page_count=len(result["pages"]),
                      has_file=bool(row["filename"]))
        return result

    def material_file(self, material_id):
        with self.connect() as db:
            row = db.execute("SELECT filename FROM materials WHERE id=?", (material_id,)).fetchone()
        if row is None or not row["filename"]:
            return None
        return self.path.parent / "uploads" / row["filename"]

    def save_report(self, article_id, report, expected_revision, expected_source_revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT revision, source_revision FROM articles WHERE id=?", (article_id,)).fetchone()
            if row is None:
                return None
            if row["revision"] != expected_revision or row["source_revision"] != expected_source_revision:
                raise RevisionConflict()
            report = dict(report, id=str(uuid.uuid4()), original_revision=expected_revision,
                          source_revision=expected_source_revision, checked_at=now_iso())
            db.execute(
                "INSERT INTO verification_reports (id, article_id, original_revision, source_revision, report_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (report["id"], article_id, expected_revision, expected_source_revision,
                 json.dumps(report, ensure_ascii=False), report["checked_at"]),
            )
        return self.get(article_id)

    def editor_base(self, db, article_id, expected_revision, expected_source_revision, report_id):
        row = db.execute("SELECT revision, source_revision FROM articles WHERE id=?", (article_id,)).fetchone()
        if row is None:
            return None
        report = db.execute("SELECT * FROM verification_reports WHERE article_id=? ORDER BY created_at DESC, id DESC LIMIT 1", (article_id,)).fetchone()
        if (row["revision"] != expected_revision or row["source_revision"] != expected_source_revision or
                report is None or report["id"] != report_id or
                report["original_revision"] != expected_revision or report["source_revision"] != expected_source_revision):
            raise RevisionConflict()
        return row

    def save_plan(self, article_id, content, report_id, expected_revision, expected_source_revision, expected_plan_revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if self.editor_base(db, article_id, expected_revision, expected_source_revision, report_id) is None:
                return None
            db.execute("INSERT OR IGNORE INTO editor_work (article_id) VALUES (?)", (article_id,))
            work = db.execute("SELECT * FROM editor_work WHERE article_id=?", (article_id,)).fetchone()
            if work["plan_revision"] != expected_plan_revision:
                raise RevisionConflict()
            previous = json.loads(work["plan_json"]) if work["plan_json"] else None
            if previous is None or previous["content"] != content or previous["report_id"] != report_id:
                revision = expected_plan_revision + 1
                plan = {"content": content, "revision": revision, "report_id": report_id,
                        "original_revision": expected_revision, "source_revision": expected_source_revision, "saved_at": now_iso()}
                db.execute("UPDATE editor_work SET plan_revision=?, plan_json=? WHERE article_id=?",
                           (revision, json.dumps(plan, ensure_ascii=False), article_id))
                db.execute("UPDATE articles SET updated_at=? WHERE id=?", (plan["saved_at"], article_id))
        return self.get(article_id)

    def save_draft(self, article_id, content, metadata, report_id, expected_revision, expected_source_revision,
                   expected_plan_revision, expected_draft_revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if self.editor_base(db, article_id, expected_revision, expected_source_revision, report_id) is None:
                return None
            work = db.execute("SELECT * FROM editor_work WHERE article_id=?", (article_id,)).fetchone()
            if work is None or work["plan_revision"] != expected_plan_revision or work["draft_revision"] != expected_draft_revision:
                raise RevisionConflict()
            plan = json.loads(work["plan_json"]) if work["plan_json"] else None
            if not plan or plan["report_id"] != report_id:
                raise RevisionConflict()
            draft = {"content": content, "metadata": metadata, "revision": expected_draft_revision + 1,
                     "plan_revision": expected_plan_revision, "report_id": report_id,
                     "original_revision": expected_revision, "source_revision": expected_source_revision, "saved_at": now_iso()}
            db.execute("UPDATE editor_work SET draft_revision=?, draft_json=? WHERE article_id=?",
                       (draft["revision"], json.dumps(draft, ensure_ascii=False), article_id))
            db.execute("UPDATE articles SET updated_at=? WHERE id=?", (draft["saved_at"], article_id))
        return self.get(article_id)

    def final_base(self, db, article_id, report_id, expected_revision, expected_source_revision,
                   expected_plan_revision, expected_draft_revision, expected_final_report_id):
        if self.editor_base(db, article_id, expected_revision, expected_source_revision, report_id) is None:
            return None
        work = db.execute("SELECT * FROM editor_work WHERE article_id=?", (article_id,)).fetchone()
        if not work or work["plan_revision"] != expected_plan_revision or work["draft_revision"] != expected_draft_revision:
            raise RevisionConflict()
        draft = json.loads(work["draft_json"]) if work["draft_json"] else None
        plan = json.loads(work["plan_json"]) if work["plan_json"] else None
        binding = {"original_revision": expected_revision, "source_revision": expected_source_revision,
                   "plan_revision": expected_plan_revision, "report_id": report_id}
        if (not draft or not plan or any(draft.get(key) != value for key, value in binding.items()) or
                plan.get("report_id") != report_id):
            raise RevisionConflict()
        last = db.execute("SELECT id FROM final_verification_reports WHERE article_id=? ORDER BY rowid DESC LIMIT 1", (article_id,)).fetchone()
        if (last["id"] if last else None) != expected_final_report_id:
            raise RevisionConflict()
        return draft

    def save_final_report(self, article_id, report, report_id, expected_revision, expected_source_revision,
                          expected_plan_revision, expected_draft_revision, expected_final_report_id):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            draft = self.final_base(db, article_id, report_id, expected_revision, expected_source_revision,
                                    expected_plan_revision, expected_draft_revision, expected_final_report_id)
            if draft is None:
                return None
            if report["draft_hash"] != draft_content_hash(draft["content"]):
                raise RevisionConflict()
            report = dict(report, id=str(uuid.uuid4()), original_report_id=report_id,
                          original_revision=expected_revision, source_revision=expected_source_revision,
                          plan_revision=expected_plan_revision, draft_revision=expected_draft_revision, checked_at=now_iso())
            db.execute("INSERT INTO final_verification_reports (id, article_id, report_json, created_at) VALUES (?, ?, ?, ?)",
                       (report["id"], article_id, json.dumps(report, ensure_ascii=False), report["checked_at"]))
            db.execute("UPDATE articles SET updated_at=? WHERE id=?", (report["checked_at"], article_id))
        return self.get(article_id)

    def save_approval(self, article_id, reviewer, acknowledgements, report_id, expected_revision, expected_source_revision,
                      expected_plan_revision, expected_draft_revision, expected_final_report_id, resolutions=()):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            draft = self.final_base(db, article_id, report_id, expected_revision, expected_source_revision,
                                    expected_plan_revision, expected_draft_revision, expected_final_report_id)
            if draft is None:
                return None
            last = db.execute("SELECT report_json FROM final_verification_reports WHERE article_id=? ORDER BY rowid DESC LIMIT 1", (article_id,)).fetchone()
            report = json.loads(last["report_json"]) if last else None
            binding = {"original_revision": expected_revision, "source_revision": expected_source_revision,
                       "plan_revision": expected_plan_revision, "draft_revision": expected_draft_revision,
                       "original_report_id": report_id, "draft_hash": draft_content_hash(draft["content"])}
            if not report_reviewable(report) or any(report.get(key) != value for key, value in binding.items()):
                raise RevisionConflict()
            checked_resolutions = validate_resolutions(report, resolutions)
            if not report_allows_approval(report, checked_resolutions):
                raise RevisionConflict()
            last_approval = db.execute("SELECT approval_json FROM article_approvals WHERE article_id=? ORDER BY rowid DESC LIMIT 1", (article_id,)).fetchone()
            previous = json.loads(last_approval["approval_json"]) if last_approval else None
            if (not previous or previous["final_report_id"] != report["id"] or
                    previous.get("resolutions", []) != checked_resolutions or previous["reviewer"] != reviewer):
                approval = dict(binding, id=str(uuid.uuid4()), final_report_id=report["id"], reviewer=reviewer,
                                acknowledgements=acknowledgements, approved_at=now_iso(), resolutions=checked_resolutions,
                                review_basis="ai_and_human" if checked_resolutions else "ai_only")
                db.execute("INSERT INTO article_approvals (id, article_id, approval_json, created_at) VALUES (?, ?, ?, ?)",
                           (approval["id"], article_id, json.dumps(approval, ensure_ascii=False), approval["approved_at"]))
                db.execute("UPDATE articles SET updated_at=? WHERE id=?", (approval["approved_at"], article_id))
        return self.get(article_id)
