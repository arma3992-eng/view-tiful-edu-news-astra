"""의견·인터뷰·자동 검색에서 편집·사람 승인·내보내기까지 연결한다."""
from contextlib import contextmanager
import json
import os
import unittest
from unittest.mock import patch
import httpx
import test_workflow as workflow
import test_rewriting as rewriting_tests
import test_final_review as final_tests
from document_reader import DocumentError
from storage import Store
from test_web_research import read_fixture, search_response

DATE = "실시일은 10월 3일이다."


class NewsroomTests(unittest.TestCase):
    setUp = workflow.WorkflowTests.setUp
    tearDown = workflow.WorkflowTests.tearDown
    revisions = workflow.WorkflowTests.revisions
    ai_response = workflow.WorkflowTests.ai_response
    run_mocked_ai = workflow.WorkflowTests.run_mocked_ai
    verified = rewriting_tests.RewriteTests.verified
    plan = rewriting_tests.RewriteTests.plan
    base = rewriting_tests.RewriteTests.base
    save_plan = rewriting_tests.RewriteTests.save_plan
    body = rewriting_tests.RewriteTests.body
    draft_request = rewriting_tests.RewriteTests.draft_request
    save_manual = rewriting_tests.RewriteTests.save_manual
    final_payload = final_tests.FinalReviewTests.final_payload
    approve = final_tests.FinalReviewTests.approve
    export = final_tests.FinalReviewTests.export

    def new_article(self):
        self.article = self.client.post("/api/articles", json={"original_text": "행사 안내\n" + DATE}).json()
        self.route = "/api/articles/" + self.article["id"]

    @contextmanager
    def web_api(self, read=read_fixture, search=None, mutate=None):
        requests = []
        client_type = httpx.Client
        def handler(request):
            payload = json.loads(request.content); requests.append(payload)
            if payload.get("tools"):
                self.assertEqual(payload["tools"][0]["type"], "web_search")
                self.assertEqual(payload["tool_choice"], "required")
                self.assertEqual(payload["include"], ["web_search_call.action.sources"])
                self.assertEqual(payload["max_tool_calls"], 4)
                self.assertFalse(payload["store"])
                if mutate: mutate()
                if search == "fail": return httpx.Response(503, json={"error": "mock"})
                return httpx.Response(200, json=search or search_response())
            data = json.loads(payload["input"])
            sources = data.get("registered_evidence", [])
            evidence = [{"source_id": source["source_id"], "chunk_id": chunk["chunk_id"], "quote": DATE}
                        for source in sources for chunk in source["chunks"] if DATE in chunk["text"]][:8]
            def check(quote):
                return {"original_quote": quote, "claim": DATE, "category": "date", "verdict": "match" if evidence else "unverifiable",
                        "reason": "실제 본문 발췌 대조" if evidence else "읽은 근거가 없습니다.", "suggestion": "", "evidence": evidence}
            name = payload["text"]["format"]["name"]
            if name == "original_fact_check":
                parsed = {"checks": [check(DATE)] if DATE in data["original_article"] else [], "coverage_notes": []}
            elif name == "education_news_final_review":
                parsed = {"segments": [{"segment_id": segment["id"], "reviewed_text": segment["text"],
                    "classification": "factual" if DATE in segment["text"] else "editorial", "all_claims_checked": True,
                    "checks": [check(DATE)] if DATE in segment["text"] else []} for segment in data["segments"]], "coverage_notes": []}
            elif name == "education_news_draft":
                items = data["selected_items"]
                parsed = {"category": "입시·수능", "title": "자료와 의견을 읽는 기사", "summary": ["기사의 사실을 확인합니다.", "의견과 취재를 구분해 읽습니다."],
                          "sections": [{"heading": "내용", "kind": item["kind"], "text": item["text"], "item_ids": [item["id"]]} for item in items],
                          "key_facts": [], "audience_guidance": []}
            else: raise AssertionError(name)
            return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [
                {"type": "output_text", "text": json.dumps(parsed, ensure_ascii=False)}]}], "usage": {"input_tokens": 10, "output_tokens": 10}})
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-key"}), patch("verification.httpx.Client",
             side_effect=lambda *args, **kwargs: client_type(transport=httpx.MockTransport(handler))), patch("web_research.read_url", side_effect=read):
            yield requests

    def verify_web(self, **options):
        response = self.client.post(self.route + "/verify", json={**self.revisions(), "web_search": True, **options})
        if response.status_code == 200: self.article = response.json()
        return response

    def prepare_draft(self):
        self.verified(); self.assertEqual(self.save_plan().status_code, 200); self.assertEqual(self.save_manual().status_code, 200)

    def test_web_verification_without_registered_files(self):
        self.new_article()
        with self.web_api() as requests:
            self.assertEqual(self.verify_web().status_code, 200)
        self.assertEqual(len(requests), 2)
        self.assertEqual(self.article["sources"], [])
        self.assertEqual(self.article["source_revision"], 0)
        report = self.article["verification_report"]
        self.assertEqual(report["checks"][0]["verdict"], "match")
        self.assertEqual(report["checks"][0]["cross_check"]["status"], "multiple_sites")
        self.assertEqual(len(self.article["evidence_sources"]), 2)
        self.assertEqual(self.article["approval_status"], "not_approved")

    def test_web_snapshots_restore_and_are_available_to_rewriter(self):
        self.new_article()
        with self.web_api() as requests:
            self.assertEqual(self.verify_web().status_code, 200)
            report = self.article["verification_report"]
            plan = {"decisions": [{"claim_id": report["checks"][0]["id"], "action": "include", "source_ids": [self.article["evidence_sources"][0]["id"]]}],
                    "additions": [], "editor_note": ""}
            result = self.client.put(self.route + "/rewrite-plan", json={**self.base(), "content": plan})
            self.assertEqual(result.status_code, 200); self.article = result.json()
            result = self.client.post(self.route + "/draft/generate", json=self.draft_request())
            self.assertEqual(result.status_code, 200); self.article = result.json()
        input_data = json.loads(requests[-1]["input"])
        self.assertEqual(input_data["registered_evidence"][0]["origin"], "web_search")
        restored = Store(self.db).get(self.article["id"])
        self.assertEqual(restored["verification_report"]["web_research"]["read_pages"], 2)
        self.assertEqual(len(restored["evidence_sources"]), 2)

    def test_search_summary_without_readable_body_is_not_verification(self):
        self.new_article()
        def blocked(url): raise DocumentError("접근 제한. PDF 직접 첨부 필요")
        with self.web_api(read=blocked):
            self.assertEqual(self.verify_web().status_code, 200)
        report = self.article["verification_report"]
        self.assertEqual(report["web_research"]["status"], "no_readable_sources")
        self.assertEqual(report["checks"][0]["verdict"], "unverifiable")
        self.assertEqual(report["checks"][0]["evidence"], [])
        self.assertEqual(self.article["evidence_sources"], [])

    def test_no_real_search_call_does_not_read_assistant_invented_links(self):
        self.new_article(); response = search_response(); response["output"] = response["output"][1:]
        with self.web_api(search=response), patch("web_research.read_url") as read:
            self.assertEqual(self.verify_web().status_code, 200)
        read.assert_not_called()
        self.assertEqual(self.article["verification_report"]["checks"][0]["verdict"], "unverifiable")

    def test_search_failure_is_visible_while_registered_evidence_still_works(self):
        with self.web_api(search="fail"):
            self.assertEqual(self.verify_web().status_code, 200)
        report = self.article["verification_report"]
        self.assertEqual(report["web_research"]["status"], "failed")
        self.assertTrue(report["web_research"]["warnings"])
        self.assertEqual(report["checks"][0]["verdict"], "match")
        self.assertEqual(report["checks"][0]["cross_check"]["status"], "single_source")

    def test_change_during_search_cannot_save_old_article_result(self):
        self.new_article()
        def change():
            Store(self.db).update(self.article["id"], self.article["original_text"] + "\n내용 변경", None, 1)
        with self.web_api(mutate=change):
            self.assertEqual(self.verify_web().status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["verification_report"])

    def test_final_search_manual_approval_and_web_sources_export(self):
        self.prepare_draft()
        with self.web_api() as requests:
            response = self.client.post(self.route + "/draft/verify", json={**self.final_payload(), "web_search": True})
            self.assertEqual(response.status_code, 200); self.article = response.json()
            self.assertFalse(self.article["can_export"])
            self.assertEqual(self.approve().status_code, 200)
        self.assertEqual(len(requests), 2, "사람 승인에는 API를 호출하지 않는다")
        exported = self.export().json()
        self.assertEqual(exported["web_research"]["read_pages"], 2)
        self.assertEqual(sum(source["url"] is not None for source in exported["sources"]), 2)
        self.assertIn("example.edu", self.export("html").text)

    def test_new_web_search_result_invalidates_old_approval(self):
        self.prepare_draft()
        with self.web_api():
            response = self.client.post(self.route + "/draft/verify", json={**self.final_payload(), "web_search": True})
            self.article = response.json(); self.assertEqual(self.approve().status_code, 200)
            old = self.article["approval"]["id"]
            response = self.client.post(self.route + "/draft/verify", json={**self.final_payload(), "web_search": True})
            self.assertEqual(response.status_code, 200); self.article = response.json()
        self.assertEqual(self.export(approval_id=old).status_code, 409)

    def interview(self, **override):
        return {"name": "교사 취재 기록", "kind": "interview", "excerpt": "입시 준비의 부담이 크다고 생각합니다.",
                "interview": {"speaker": "익명 교사 A", "role": "고등학교 교사", "interviewed_on": "2026-10-05", "method": "전화"},
                **self.revisions(), **override}

    def test_interview_records_require_person_date_and_actual_remarks(self):
        for changes in ({"interview": None}, {"excerpt": "", "url": "https://example.com/interview"},
                        {"interview": {"speaker": " ", "interviewed_on": "2026-10-05"}},
                        {"interview": {"speaker": "교사", "interviewed_on": "bad-date"}}):
            self.assertEqual(self.client.post(self.route + "/sources", json=self.interview(**changes)).status_code, 422)

    def test_interview_record_restores_without_replacing_it_with_web_page(self):
        result = self.client.post(self.route + "/sources", json=self.interview(url="https://example.com/interview"))
        self.assertEqual(result.status_code, 201); self.article = result.json()
        from verification import collect_sources
        with patch("verification.read_url") as read:
            sources, _ = collect_sources(self.article, Store(self.db))
        read.assert_not_called()
        record = next(source for source in sources if source["kind"] == "interview")
        self.assertEqual(record["origin"], "interview")
        self.assertEqual(record["interview"]["speaker"], "익명 교사 A")
        self.assertIn("입시 준비", record["chunks"][0]["text"])
        self.assertEqual(Store(self.db).get(self.article["id"])["sources"][-1]["interview"]["method"], "전화")

    def test_opinion_and_interview_are_saved_as_separate_article_types(self):
        result = self.client.post(self.route + "/sources", json=self.interview())
        self.assertEqual(result.status_code, 201); self.article = result.json()
        self.verified()
        interview_id = self.article["sources"][-1]["id"]
        plan = self.plan(); plan["additions"] = [
            {"kind": "opinion", "text": "입시 정보는 더 이해하기 쉽게 제공돼야 한다고 본다.", "source_ids": []},
            {"kind": "interview", "text": "익명 교사 A는 준비 부담이 크다고 말했다.", "source_ids": [interview_id]}]
        self.assertEqual(self.save_plan(plan).status_code, 200)
        with self.web_api():
            response = self.client.post(self.route + "/draft/generate", json=self.draft_request())
            self.assertEqual(response.status_code, 200); self.article = response.json()
        kinds = {section["kind"] for section in self.article["draft"]["content"]["sections"]}
        self.assertTrue({"opinion", "interview"} <= kinds)
        with self.web_api():
            response = self.client.post(self.route + "/draft/verify", json={**self.final_payload(), "web_search": False})
            self.assertEqual(response.status_code, 200); self.article = response.json()
            self.assertEqual(self.approve().status_code, 200)
        exported = self.export().json()
        self.assertTrue(any(source.get("interview", {}).get("speaker") == "익명 교사 A"
                            for source in exported["sources"] if source.get("interview")))
        self.assertIn("취재 기록: 익명 교사 A", self.export("html").text)

    def test_interview_addition_needs_actual_evidence(self):
        self.verified(); plan = self.plan()
        plan["additions"] = [{"kind": "interview", "text": "관계자는 이렇게 말했다.", "source_ids": []}]
        self.assertEqual(self.save_plan(plan).status_code, 422)

    def test_new_facts_without_registered_sources_are_pending_when_web_search_enabled(self):
        self.verified(); plan = self.plan()
        plan["additions"] = [{"kind": "fact", "text": "추가 사실은 별도 공개 자료로 확인해야 한다.", "source_ids": []}]
        with patch.dict(os.environ, {"WEB_RESEARCH_ENABLED": "true"}):
            response = self.save_plan(plan)
        self.assertEqual(response.status_code, 200)

    def test_opinion_only_original_can_have_zero_factual_checks(self):
        self.new_article()
        from verification import AIReport, validate_report
        report = validate_report(AIReport(checks=[], coverage_notes=[]), "더 나은 교육을 바란다.", [], [], "mock", {})
        self.assertEqual(report["checks"], [])
        self.assertEqual(report["report_status"], "complete")

    def test_opinion_only_article_still_requires_human_final_approval(self):
        self.new_article()
        response = self.client.put(self.route, json={"original_text": "기자의 의견\n더 나은 교육을 바란다.", "expected_revision": 1})
        self.assertEqual(response.status_code, 200); self.article = response.json()
        with self.web_api(search="fail") as requests:
            self.assertEqual(self.verify_web().status_code, 200)
            self.assertEqual(self.article["verification_report"]["checks"], [])
            self.assertEqual(self.save_plan({"decisions": [], "additions": [{"kind": "opinion", "text": "더 나은 교육을 바란다.", "source_ids": []}],
                                            "editor_note": ""}).status_code, 200)
            response = self.client.post(self.route + "/draft/generate", json=self.draft_request())
            self.assertEqual(response.status_code, 200); self.article = response.json()
            response = self.client.post(self.route + "/draft/verify", json={**self.final_payload(), "web_search": True})
            self.assertEqual(response.status_code, 200); self.article = response.json()
            self.assertEqual(self.article["final_verification_report"]["checks"], [])
            self.assertFalse(self.article["can_export"])
            self.assertEqual(self.approve().status_code, 200)
        self.assertEqual(len(requests), 5, "검색 실패를 기록하고 의견을 검사하되 사람 승인은 유료 API를 쓰지 않는다")

    def test_malformed_search_response_is_visible_instead_of_server_crash(self):
        self.new_article()
        client_type = httpx.Client
        with self.web_api(), patch("web_research.request_response", side_effect=lambda payload:
             verification_response(payload, client_type)):
            self.assertEqual(self.verify_web().status_code, 200)
        self.assertEqual(self.article["verification_report"]["web_research"]["status"], "failed")
        self.assertEqual(self.article["verification_report"]["checks"][0]["verdict"], "unverifiable")


def verification_response(payload, client_type):
    from verification import request_response
    with patch("verification.httpx.Client", side_effect=lambda *args, **kwargs:
               client_type(transport=httpx.MockTransport(lambda request: httpx.Response(200, json=[])))):
        return request_response(payload)


if __name__ == "__main__":
    unittest.main()
