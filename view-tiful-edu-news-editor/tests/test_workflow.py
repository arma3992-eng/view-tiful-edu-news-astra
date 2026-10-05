"""외부 API에 비용을 발생시키지 않는 저장·추출·검증 연결 검사."""
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
import main
from document_reader import DocumentError, download_public, public_target, read_html, read_pdf
from storage import RevisionConflict, Store
from verification import AIReport, ClaimCheck, Evidence, validate_report


def fixture_pdf():
    output = io.BytesIO()
    writer = PdfWriter()
    for text in ["Exam duration 100 minutes.", "Bring your identity card."]:
        page = writer.add_blank_page(width=300, height=300)
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({
                NameObject("/F1"): DictionaryObject({
                    NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject("/Helvetica"),
                })
            })
        })
        contents = DecodedStreamObject()
        contents.set_data(("BT /F1 12 Tf 20 220 Td (" + text + ") Tj ET").encode())
        page[NameObject("/Contents")] = writer._add_object(contents)
    writer.write(output)
    return output.getvalue()


class DocumentTests(unittest.TestCase):
    def test_pdf_pages_and_text(self):
        document = read_pdf(fixture_pdf(), "notice.pdf")
        self.assertEqual(len(document["pages"]), 2)
        self.assertIn("100 minutes", document["pages"][0]["text"])
        self.assertIn("identity card", document["pages"][1]["text"])
        self.assertEqual(document["pages"][1]["locator"], "PDF 2쪽")

    def test_empty_pdf_has_warning(self):
        writer = PdfWriter(); writer.add_blank_page(300, 300)
        data = io.BytesIO(); writer.write(data)
        document = read_pdf(data.getvalue())
        self.assertIn("OCR", document["warning"])
        self.assertFalse(document["pages"][0]["text"])

    def test_invalid_and_encrypted_pdf(self):
        with self.assertRaises(DocumentError):
            read_pdf(b"not a pdf")
        writer = PdfWriter(); writer.add_blank_page(300, 300); writer.encrypt("test-password")
        data = io.BytesIO(); writer.write(data)
        with self.assertRaises(DocumentError):
            read_pdf(data.getvalue())

    def test_html_extracts_article_without_navigation(self):
        html = b'<html><head><meta property="og:title" content="Exam notice"></head><body><nav>Other news</nav><div id="article-view-content-div"><p>Exam duration is 100 minutes.</p><p>Bring identity card.</p></div><footer>Copyright</footer></body></html>'
        document = read_html(html, "https://example.org/notice")
        self.assertEqual(document["title"], "Exam notice")
        self.assertIn("100 minutes", document["pages"][0]["text"])
        self.assertNotIn("Other news", document["pages"][0]["text"])
        self.assertNotIn("Copyright", document["pages"][0]["text"])

    def test_private_addresses_and_credentials_rejected(self):
        for url in ["http://127.0.0.1", "http://169.254.169.254", "http://[::1]", "http://user:pass@example.org"]:
            with self.subTest(url=url), self.assertRaises(DocumentError):
                public_target(url)

    def test_public_resolution_cannot_include_private_ip(self):
        answers = [(2, 1, 6, "", ("8.8.8.8", 443)), (2, 1, 6, "", ("10.0.0.1", 443))]
        with patch("document_reader.socket.getaddrinfo", return_value=answers), self.assertRaises(DocumentError):
            public_target("https://example.org")

    def test_redirect_to_private_address_is_blocked(self):
        class Response:
            status = 302
            def getheader(self, name, default=None):
                return "http://127.0.0.1/private" if name == "Location" else default
        class Connection:
            def __init__(self, *args, **kwargs): pass
            def request(self, *args, **kwargs): pass
            def getresponse(self): return Response()
            def close(self): pass
        def resolve(host, port, **kwargs):
            return [(2, 1, 6, "", ("127.0.0.1" if host == "127.0.0.1" else "8.8.8.8", port))]
        with patch("document_reader.socket.getaddrinfo", side_effect=resolve), patch("document_reader.http.client.HTTPConnection", Connection):
            with self.assertRaises(DocumentError):
                download_public("http://example.org/start")


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "editor.sqlite3"
        self.database_patch = patch.object(main, "DATABASE", self.db); self.database_patch.start()
        self.environment_patch = patch.dict(os.environ, {"OPENAI_API_KEY": "", "OPENAI_MODEL": "gpt-5.4-mini", "WEB_RESEARCH_ENABLED": "false"})
        self.environment_patch.start()
        self.client = TestClient(main.app); self.client.__enter__()
        response = self.client.post("/api/articles", json={"original_text":
            "가상 기사\n시험 시간은 120분이다.\n적용 대상은 고등학생 전체다.\n실시일은 10월 3일이다.\n응시 인원은 200명이다."})
        self.article = response.json(); self.route = "/api/articles/" + self.article["id"]
        response = self.client.post(self.route + "/sources", json={
            "name": "가상 테스트 근거", "kind": "other",
            "excerpt": "시험 시간은 100분이다.\n적용 대상은 고등학교 3학년이다.\n실시일은 10월 3일이다.",
            "expected_revision": 1, "expected_source_revision": 0})
        self.article = response.json()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.environment_patch.stop(); self.database_patch.stop(); self.tmp.cleanup()

    def revisions(self):
        return {"expected_revision": self.article["revision"],
                "expected_source_revision": self.article["source_revision"]}

    def ai_response(self, change=None, mutate=None):
        source_id = self.article["sources"][0]["id"]
        rows = [
            ("시험 시간은 120분이다.", "number", "mismatch", "시험 시간은 100분이다."),
            ("적용 대상은 고등학생 전체다.", "target", "needs_context", "적용 대상은 고등학교 3학년이다."),
            ("실시일은 10월 3일이다.", "date", "match", "실시일은 10월 3일이다."),
            ("응시 인원은 200명이다.", "number", "unverifiable", None),
        ]
        checks = [{"original_quote": quote, "claim": quote, "category": category, "verdict": verdict,
                   "reason": "테스트 응답: 등록 발췌와 대조.", "suggestion": "근거를 확인하세요.",
                   "evidence": [{"source_id": source_id, "chunk_id": source_id + "_p1_c1", "quote": evidence}] if evidence else []}
                  for quote, category, verdict, evidence in rows]
        if change: change(checks)
        return {"checks": checks, "coverage_notes": ["가상 테스트 데이터입니다."]}, mutate

    def run_mocked_ai(self, change=None, mutate=None, http_status=200):
        body, mutation = self.ai_response(change, mutate)
        real_client = httpx.Client
        calls = []
        def handler(request):
            calls.append(request)
            self.assertEqual(str(request.url), "https://api.openai.com/v1/responses")
            payload = json.loads(request.content)
            self.assertFalse(payload["store"])
            self.assertEqual(payload["text"]["format"]["type"], "json_schema")
            self.assertTrue(payload["text"]["format"]["strict"])
            if mutation: mutation()
            if http_status != 200:
                return httpx.Response(http_status, json={"error": {"message": "test"}})
            return httpx.Response(200, json={"status": "completed",
                "output": [{"type": "reasoning"}, {"type": "message", "content": [
                    {"type": "output_text", "text": json.dumps(body, ensure_ascii=False)}]}],
                "usage": {"input_tokens": 100, "output_tokens": 100}})
        def mock_client(*args, **kwargs):
            return real_client(transport=httpx.MockTransport(handler))
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-key"}), patch("verification.httpx.Client", side_effect=mock_client):
            response = self.client.post(self.route + "/verify", json=self.revisions())
        self.assertEqual(len(calls), 1, "검증 한 번에 API를 자동으로 재호출하면 안 됩니다.")
        return response

    def test_health_screen_and_favicon(self):
        health = self.client.get("/api/health").json()
        self.assertEqual(health["step"], 5); self.assertFalse(health["ai_configured"])
        self.assertTrue(health["rewriting_available"])
        self.assertTrue(health["final_review_available"]); self.assertFalse(health["publishing_available"])
        for path in ["/", "/static/app.js", "/static/final.js", "/static/style.css", "/favicon.ico"]:
            self.assertEqual(self.client.get(path).status_code, 200)

    def test_key_missing_produces_no_verification(self):
        response = self.client.post(self.route + "/verify", json=self.revisions())
        self.assertEqual(response.status_code, 503)
        saved = self.client.get(self.route).json()
        self.assertEqual(saved["verification_status"], "not_run")
        self.assertIsNone(saved["verification_report"])
        self.assertFalse(saved["can_publish"])

    def test_pdf_upload_register_open_and_persist(self):
        response = self.client.post("/api/materials/pdf", files={"file": ("notice.pdf", fixture_pdf(), "application/pdf")})
        self.assertEqual(response.status_code, 201)
        material = response.json()
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="PDF 확인", kind="official", material_id=material["id"]))
        self.assertEqual(response.status_code, 201)
        saved = response.json()
        self.assertEqual(saved["source_revision"], 2)
        self.assertEqual(saved["sources"][1]["material"]["page_count"], 2)
        file = self.client.get("/api/materials/" + material["id"] + "/file")
        self.assertEqual(file.status_code, 200); self.assertTrue(file.content.startswith(b"%PDF-"))
        reopened = Store(self.db).get(self.article["id"])
        self.assertEqual(reopened["sources"][1]["material"]["id"], material["id"])

    def test_invalid_pdf_and_nonexistent_material(self):
        self.assertEqual(self.client.post("/api/materials/pdf", files={"file": ("fake.pdf", b"not pdf")}).status_code, 400)
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="없는 자료", material_id="not-found"))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get(self.route).json()["source_revision"], 1)

    def test_url_import_preview(self):
        document = read_html(b"<html><title>Notice</title><article>Exam starts at 10:00.</article></html>", "https://example.org/notice")
        with patch("main.read_url", return_value=(document, None)):
            response = self.client.post("/api/materials/url", json={"url": "https://example.org/notice"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["title"], "Notice")
        self.assertIn("10:00", response.json()["pages"][0]["text"])
        self.assertFalse(response.json()["has_file"])

    def test_url_only_registered_source_is_read_during_verification(self):
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="주소만 등록", url="https://example.org/notice"))
        self.article = response.json()
        document = read_html(b"<article>Additional official notice.</article>", "https://example.org/notice")
        with patch("verification.read_url", return_value=(document, None)) as reader:
            response = self.run_mocked_ai()
        self.assertEqual(response.status_code, 200); reader.assert_called_once()
        read = response.json()["verification_report"]["read_sources"][1]
        self.assertEqual(read["origin"], "url"); self.assertEqual(read["selected_chunks"], 1)

    def test_four_verdicts_and_saved_report(self):
        response = self.run_mocked_ai()
        self.assertEqual(response.status_code, 200, response.text)
        saved = response.json()
        self.assertEqual({c["verdict"] for c in saved["checks"]}, {"match","mismatch","needs_context","unverifiable"})
        self.assertFalse(saved["can_publish"]); self.assertEqual(saved["verification_status"], "completed")
        self.assertEqual(saved["verification_report"]["report_status"], "complete")
        self.assertEqual(saved["verification_report"]["unanchored_checks"], [])
        reopened = Store(self.db).get(self.article["id"])
        self.assertEqual(reopened["verification_report"]["id"], saved["verification_report"]["id"])
        self.assertEqual(reopened["checks"][0]["evidence"][0]["locator"], "사용자 입력 발췌 · 발췌 1")

    def test_fake_citation_is_downgraded(self):
        response = self.run_mocked_ai(change=lambda rows: rows[0]["evidence"][0].update(quote="자료에 없는 가짜 문장"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["checks"][0]["verdict"], "unverifiable")
        self.assertFalse(response.json()["checks"][0]["evidence"])

    def test_whitespace_citation_is_downgraded(self):
        response = self.run_mocked_ai(change=lambda rows: rows[0]["evidence"][0].update(quote=" "))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["checks"][0]["verdict"], "unverifiable")

    def test_invalid_original_quote_is_separated_from_valid_checks(self):
        response = self.run_mocked_ai(change=lambda rows: rows[0].update(original_quote="원문에 없는 문장"))
        self.assertEqual(response.status_code, 200, response.text)
        saved = response.json()
        self.assertEqual(saved["verification_status"], "partial")
        self.assertEqual(len(saved["checks"]), 3)
        self.assertNotIn("시험 시간은 120분이다.", [item["claim"] for item in saved["checks"]])
        excluded = saved["verification_report"]["unanchored_checks"]
        self.assertEqual(len(excluded), 1)
        self.assertEqual(excluded[0]["ai_quote"], "원문에 없는 문장")
        self.assertNotIn("verdict", excluded[0]); self.assertNotIn("evidence", excluded[0])
        self.assertFalse(saved["can_publish"])
        reopened = Store(self.db).get(self.article["id"])
        self.assertEqual(reopened["verification_status"], "partial")
        self.assertEqual(reopened["verification_report"]["unanchored_checks"], excluded)
        self.assertEqual(reopened["original_text"], self.article["original_text"])

    def test_all_invalid_original_quotes_produce_no_report(self):
        for invalid_quote in ["원문에 없는 문장", " \n "]:
            with self.subTest(quote=invalid_quote):
                response = self.run_mocked_ai(change=lambda rows: [row.update(original_quote=invalid_quote) for row in rows])
                self.assertEqual(response.status_code, 502)
                self.assertIn("모든 원문 인용", response.json()["detail"])
                self.assertIsNone(self.client.get(self.route).json()["verification_report"])

    def test_changed_number_or_year_cannot_pass_original_quote_check(self):
        self.article = self.client.put(self.route, json={
            "original_text": self.article["original_text"] + "\n2025학년도 논술은 2문항이었다.",
            "expected_revision": self.article["revision"]}).json()
        def change(rows):
            rows[0].update(original_quote="시험 시간은 100분이다.")
            rows[1].update(original_quote="2026학년도 논술은 2문항이었다.")
        response = self.run_mocked_ai(change=change)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["verification_status"], "partial")
        self.assertEqual(len(response.json()["checks"]), 2)
        self.assertEqual(len(response.json()["verification_report"]["unanchored_checks"]), 2)

    def test_historical_and_trend_claims_without_evidence_are_unverifiable(self):
        additions = ["2025학년도 논술은 2문항이었다.", "2023~2025년 이 대학의 논술 응시 인원은 매년 늘었다."]
        self.article = self.client.put(self.route, json={
            "original_text": self.article["original_text"] + "\n" + "\n".join(additions),
            "expected_revision": self.article["revision"]}).json()
        def change(rows):
            for quote in additions:
                rows.append(dict(rows[-1], original_quote=quote, claim=quote, category="other",
                                 verdict="unverifiable", reason="해당 연도와 기간의 근거가 등록되지 않았습니다.", evidence=[]))
        response = self.run_mocked_ai(change=change)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["verification_status"], "completed")
        self.assertEqual([c["verdict"] for c in response.json()["checks"][-2:]], ["unverifiable", "unverifiable"])

    def test_original_whitespace_variations_are_accepted(self):
        response = self.run_mocked_ai(change=lambda rows: rows[0].update(original_quote="시험  시간은\n120분이다."))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["verification_status"], "completed")
        self.assertEqual(len(response.json()["checks"]), 4)

    def test_partial_report_becomes_stale_after_source_change(self):
        self.assertEqual(self.run_mocked_ai(change=lambda rows: rows[0].update(original_quote="없는 발췌")).status_code, 200)
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="과거 자료", excerpt="과거 조건"))
        self.assertEqual(response.json()["verification_status"], "stale")
        self.assertEqual(response.json()["verification_report"]["report_status"], "partial")
        self.assertFalse(response.json()["can_publish"])

    def test_partial_report_becomes_stale_after_original_change(self):
        self.assertEqual(self.run_mocked_ai(change=lambda rows: rows[0].update(original_quote="없는 발췌")).status_code, 200)
        response = self.client.put(self.route, json={"original_text": self.article["original_text"] + "\n수정됨", "expected_revision": 1})
        self.assertEqual(response.json()["verification_status"], "stale")
        self.assertEqual(response.json()["verification_report"]["report_status"], "partial")

    def test_previous_reports_without_partial_metadata_remain_readable(self):
        self.assertEqual(self.run_mocked_ai().status_code, 200)
        saved_report = self.client.get(self.route).json()["verification_report"]
        saved_report.pop("report_status"); saved_report.pop("unanchored_checks")
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE verification_reports SET report_json=? WHERE article_id=?",
                       (json.dumps(saved_report, ensure_ascii=False), self.article["id"]))
        saved = Store(self.db).get(self.article["id"])
        self.assertEqual(saved["verification_status"], "completed")
        self.assertEqual(len(saved["checks"]), 4)

    def test_failed_recheck_preserves_previous_report(self):
        previous = self.run_mocked_ai().json()["verification_report"]
        response = self.run_mocked_ai(change=lambda rows: [row.update(original_quote="없는 발췌") for row in rows])
        self.assertEqual(response.status_code, 502)
        self.assertEqual(self.client.get(self.route).json()["verification_report"]["id"], previous["id"])

    def test_api_auth_failure_is_not_saved(self):
        response = self.run_mocked_ai(http_status=401)
        self.assertEqual(response.status_code, 502)
        self.assertIsNone(self.client.get(self.route).json()["verification_report"])

    def test_original_edit_marks_previous_report_stale(self):
        self.assertEqual(self.run_mocked_ai().status_code, 200)
        response = self.client.put(self.route, json={"original_text": self.article["original_text"] + "\n수정됨", "expected_revision": 1})
        self.assertEqual(response.json()["verification_status"], "stale")
        self.assertEqual(response.json()["verification_report"]["original_revision"], 1)
        self.assertFalse(response.json()["can_publish"])

    def test_source_add_marks_previous_report_stale(self):
        self.assertEqual(self.run_mocked_ai().status_code, 200)
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="추가 자료", excerpt="추가 조건"))
        self.assertEqual(response.json()["verification_status"], "stale")

    def test_stale_input_and_change_during_check_are_rejected(self):
        response = self.client.post(self.route + "/verify", json=dict(self.revisions(), expected_source_revision=0))
        self.assertEqual(response.status_code, 409)
        store = main.app.state.store
        response = self.run_mocked_ai(mutate=lambda: store.update(self.article["id"], self.article["original_text"] + "\n다른 창에서 수정", None, 1))
        self.assertEqual(response.status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["verification_report"])

    def test_client_cannot_submit_approved_verdict(self):
        response = self.client.post(self.route + "/verify", json=dict(self.revisions(), can_publish=True))
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post(self.route + "/publish", json={}).status_code, 404)


class MigrationTests(unittest.TestCase):
    def test_step1_data_survives_schema_upgrade(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "editor.sqlite3"
            with sqlite3.connect(path) as db:
                db.executescript("""
                    CREATE TABLE articles (id TEXT PRIMARY KEY, original_text TEXT NOT NULL, original_url TEXT,
                        revision INTEGER NOT NULL DEFAULT 1, source_revision INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
                    CREATE TABLE sources (id TEXT PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id),
                        name TEXT NOT NULL, kind TEXT NOT NULL, url TEXT, locator TEXT NOT NULL,
                        excerpt TEXT NOT NULL, created_at TEXT NOT NULL);
                    INSERT INTO articles VALUES ('legacy','기존 기사',NULL,1,1,'2026-10-04T12:00:00Z','2026-10-04T12:00:00Z');
                    INSERT INTO sources VALUES ('legacy-source','legacy','기존 근거','other',NULL,'1쪽','기존 발췌','2026-10-04T12:00:00Z');
                """)
            result = Store(path).get("legacy")
            self.assertEqual(result["original_text"], "기존 기사")
            self.assertEqual(result["sources"][0]["excerpt"], "기존 발췌")
            self.assertIsNone(result["sources"][0]["material_id"])
            self.assertEqual(result["verification_status"], "not_run")


if __name__ == "__main__":
    unittest.main()
