"""최종 사실 검증·누락 방지·현재 버전 승인·내보내기. 유료 API는 호출하지 않는다."""
import copy
import json
import os
import unittest
from unittest.mock import patch
import httpx
import test_rewriting as rewriting_tests
import test_workflow as workflow
from final_review import draft_segments, split_text
from storage import Store


class FinalReviewTests(unittest.TestCase):
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

    def setUp(self):
        workflow.WorkflowTests.setUp(self)
        self.verified()
        self.assertEqual(self.save_plan().status_code, 200)
        self.assertEqual(self.save_manual().status_code, 200)

    def final_payload(self):
        report = self.article["final_verification_report"]
        return dict(self.draft_request(), expected_final_report_id=report["id"] if report else None)

    def final_response(self, data):
        source_id = data["registered_evidence"][0]["source_id"]
        chunk_id = data["registered_evidence"][0]["chunks"][0]["chunk_id"]
        results = []
        for segment in data["segments"]:
            factual = "10월 3일" in segment["text"]
            checks = [{"original_quote": segment["text"], "claim": "실시일은 10월 3일이다.", "category": "date", "verdict": "match",
                       "reason": "등록한 가상 자료와 일치", "suggestion": "", "evidence": [{"source_id": source_id,
                       "chunk_id": chunk_id, "quote": "실시일은 10월 3일이다."}]}] if factual else []
            results.append({"segment_id": segment["id"], "reviewed_text": segment["text"],
                            "classification": "factual" if factual else "editorial", "all_claims_checked": True, "checks": checks})
        return {"segments": results, "coverage_notes": []}

    def review(self, change=None, inspect=None, mutate=None, status=200):
        calls = []
        real_client = httpx.Client
        def handler(request):
            calls.append(request)
            payload = json.loads(request.content)
            self.assertEqual(payload["text"]["format"]["name"], "education_news_final_review")
            self.assertTrue(payload["text"]["format"]["strict"])
            self.assertFalse(payload["store"])
            data = json.loads(payload["input"])
            if inspect: inspect(data)
            response = self.final_response(data)
            if change: change(response)
            if mutate: mutate()
            if status != 200: return httpx.Response(status, json={"error": {"message": "mock"}})
            return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [
                {"type": "output_text", "text": json.dumps(response, ensure_ascii=False)}]}],
                "usage": {"input_tokens": 100, "output_tokens": 100}})
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-key"}), patch("verification.httpx.Client", side_effect=lambda *a, **kw: real_client(transport=httpx.MockTransport(handler))):
            response = self.client.post(self.route + "/draft/verify", json=self.final_payload())
        self.assertEqual(len(calls), 1, "최종 검증 한 번에 API 요청은 한 번")
        if response.status_code == 200: self.article = response.json()
        return response

    def approve(self, **overrides):
        request = dict(self.final_payload(), reviewer="검토자", facts_reviewed=True, editorial_reviewed=True, rights_reviewed=True)
        request.update(overrides)
        response = self.client.post(self.route + "/approve", json=request)
        if response.status_code == 200: self.article = response.json()
        return response

    def approved(self):
        self.assertEqual(self.review().status_code, 200)
        self.assertEqual(self.approve().status_code, 200)

    def export(self, format="json", approval_id=None):
        identifier = approval_id or (self.article["approval"]["id"] if self.article["approval"] else "no-approval")
        return self.client.get(self.route + "/export/" + format, params={"approval_id": identifier})

    def first_fact(self, response):
        return next(segment for segment in response["segments"] if segment["checks"])

    def test_complete_review_does_not_automatically_approve(self):
        original = self.article["original_text"]
        self.assertEqual(self.review().status_code, 200)
        self.assertTrue(self.article["can_approve"])
        self.assertFalse(self.article["can_export"])
        self.assertEqual(self.article["approval_status"], "not_approved")
        self.assertEqual(self.article["draft_status"], "verified")
        self.assertEqual(self.article["original_text"], original)
        self.assertEqual(self.export().status_code, 409)

    def test_entire_draft_including_analysis_and_guidance_is_sent(self):
        content = self.body()
        content["title"] = "제목에 새로 넣은 5문항"
        content["summary"][0] = "요약에만 있는 사실"
        content["sections"][0]["kind"] = "analysis"
        content["audience_guidance"][0]["text"] = "안내에만 있는 준비물 의무"
        self.assertEqual(self.save_manual(content).status_code, 200)
        def inspect(data):
            self.assertEqual(data["draft"], content)
            text = "\n".join(segment["text"] for segment in data["segments"])
            for value in [content["title"], content["summary"][0], "준비물 의무", "실시일은 10월 3일이다."]:
                self.assertIn(value, text)
            self.assertNotIn("original_article", data)
        self.assertEqual(self.review(inspect=inspect).status_code, 200)

    def test_any_unresolved_verdict_blocks_approval(self):
        for verdict in ("mismatch", "needs_context", "unverifiable"):
            with self.subTest(verdict=verdict):
                def change(response): self.first_fact(response)["checks"][0]["verdict"] = verdict
                self.assertEqual(self.review(change).status_code, 200)
                self.assertFalse(self.article["can_approve"])
                self.assertEqual(self.approve().status_code, 409)
                self.assertFalse(self.article["can_export"])

    def test_invalid_evidence_is_unverifiable(self):
        for mutation in (lambda check: check["evidence"].clear(),
                         lambda check: check["evidence"][0].update(quote="실시일은 10월 4일이다."),
                         lambda check: check["evidence"][0].update(source_id="other-article")):
            def change(response): mutation(self.first_fact(response)["checks"][0])
            self.assertEqual(self.review(change).status_code, 200)
            self.assertEqual(self.article["final_verification_report"]["checks"][0]["verdict"], "unverifiable")
            self.assertEqual(self.approve().status_code, 409)

    def test_quote_must_belong_to_its_segment(self):
        def change(response):
            result = response["segments"][0]
            result.update(classification="factual", checks=copy.deepcopy(self.first_fact(response)["checks"]))
        self.assertEqual(self.review(change).status_code, 200)
        self.assertEqual(self.article["final_verification_status"], "partial")
        self.assertTrue(self.article["final_verification_report"]["unanchored_checks"])
        self.assertEqual(self.approve().status_code, 409)

    def test_missing_duplicate_unknown_or_changed_segment_cannot_pass(self):
        mutations = [lambda data: data["segments"].pop(),
                     lambda data: data["segments"].append(copy.deepcopy(data["segments"][0])),
                     lambda data: data["segments"][0].update(segment_id="unknown"),
                     lambda data: data["segments"][0].update(reviewed_text="없는 기사 문장")]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                self.assertEqual(self.review(mutate).status_code, 200)
                self.assertEqual(self.article["final_verification_status"], "partial")
                self.assertEqual(self.approve().status_code, 409)

    def test_factual_segment_without_claims_is_incomplete(self):
        def change(response): self.first_fact(response)["checks"].clear()
        self.assertEqual(self.review(change).status_code, 200)
        self.assertEqual(self.article["final_verification_status"], "partial")
        self.assertEqual(self.approve().status_code, 409)

    def test_coverage_limit_or_uncertainty_blocks_approval(self):
        for mutation in (lambda data: data["coverage_notes"].append("확인하지 못한 사실이 있음"),
                         lambda data: data["segments"][0].update(all_claims_checked=False)):
            self.assertEqual(self.review(mutation).status_code, 200)
            self.assertFalse(self.article["can_approve"])
            self.assertEqual(self.approve().status_code, 409)

    def test_entirely_unanchored_response_preserves_previous_report(self):
        self.assertEqual(self.review().status_code, 200)
        identifier = self.article["final_verification_report"]["id"]
        def change(data):
            for segment in data["segments"]: segment["reviewed_text"] = "없는 문장"
        self.assertEqual(self.review(change).status_code, 502)
        self.assertEqual(self.client.get(self.route).json()["final_verification_report"]["id"], identifier)

    def test_editorial_only_content_still_requires_full_scope_and_human_approval(self):
        self.assertEqual(self.save_manual(self.body(text="조건을 확인하며 차분하게 준비해보세요.")).status_code, 200)
        self.assertEqual(self.review().status_code, 200)
        self.assertEqual(self.article["final_verification_report"]["checks"], [])
        self.assertTrue(self.article["can_approve"])
        self.assertFalse(self.article["can_export"])

    def test_reviewer_and_all_acknowledgements_required(self):
        self.assertEqual(self.review().status_code, 200)
        for overrides in [{"reviewer":"  "}, {"facts_reviewed":False}, {"editorial_reviewed":False}, {"rights_reviewed":False}, {"can_export":True}]:
            self.assertEqual(self.approve(**overrides).status_code, 422)
        self.assertIsNone(self.client.get(self.route).json()["approval"])

    def test_approval_and_exports_restore_with_exact_version(self):
        self.approved()
        reopened = Store(self.db).get(self.article["id"])
        self.assertEqual(reopened["approval_status"], "approved")
        self.assertTrue(reopened["can_export"])
        self.assertFalse(reopened["can_publish"])
        result = self.export()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["article"], self.article["draft"]["content"])
        self.assertEqual(result.json()["verification"]["draft_hash"], self.article["approval"]["draft_hash"])
        self.assertEqual(len(result.json()["sources"]), 1)
        self.assertEqual(result.headers["cache-control"], "no-store")
        html = self.export("html")
        self.assertEqual(html.status_code, 200)
        self.assertIn("학생", html.text); self.assertIn("원문과 근거", html.text)
        self.assertIn("attachment", html.headers["content-disposition"])

    def test_wrong_approval_id_cannot_export(self):
        self.approved()
        self.assertEqual(self.export(approval_id="old-record").status_code, 409)
        self.assertEqual(self.client.get(self.route + "/export/json").status_code, 422)

    def test_saved_draft_even_same_content_invalidates_approval(self):
        self.approved(); old_id = self.article["approval"]["id"]
        self.assertEqual(self.save_manual().status_code, 200)
        self.assertEqual(self.article["final_verification_status"], "stale")
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export(approval_id=old_id).status_code, 409)
        self.assertEqual(self.review().status_code, 200)
        self.assertEqual(self.approve().status_code, 200)
        self.assertNotEqual(self.article["approval"]["id"], old_id)

    def test_original_source_and_plan_changes_invalidate_approval(self):
        self.approved()
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="추가 근거", excerpt="추가 발췌"))
        self.article = response.json()
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_original_change_invalidates_approval(self):
        self.approved()
        self.article = self.client.put(self.route, json={"original_text": self.article["original_text"]+"\n추가 사실", "expected_revision":self.article["revision"]}).json()
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_plan_change_invalidates_approval(self):
        self.approved()
        plan = self.article["rewrite_plan"]["content"]; plan["editor_note"] = "구성 변경"
        self.assertEqual(self.save_plan(plan).status_code, 200)
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_unchanged_original_and_plan_keep_approval(self):
        self.approved()
        self.article = self.client.put(self.route, json={"original_text":self.article["original_text"],"expected_revision":self.article["revision"]}).json()
        self.assertEqual(self.save_plan(self.article["rewrite_plan"]["content"]).status_code, 200)
        self.assertEqual(self.article["approval_status"], "approved")

    def test_new_original_or_final_report_invalidates_previous_approval(self):
        self.approved(); original_approval = self.article["approval"]["id"]
        self.assertEqual(self.review().status_code, 200)
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export(approval_id=original_approval).status_code, 409)
        self.assertEqual(self.approve().status_code, 200)
        self.verified()
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_stale_request_rejected_before_paid_call(self):
        request = self.final_payload()
        self.assertEqual(self.save_manual().status_code, 200)
        with patch("main.verify_draft") as mocked:
            self.assertEqual(self.client.post(self.route + "/draft/verify", json=request).status_code, 409)
            mocked.assert_not_called()

    def test_draft_changed_during_verification_cannot_save_result(self):
        def mutate(): self.assertEqual(self.save_manual().status_code, 200)
        self.assertEqual(self.review(mutate=mutate).status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["final_verification_report"])

    def test_concurrent_final_report_cannot_be_overwritten(self):
        self.assertEqual(self.review().status_code, 200)
        report = copy.deepcopy(self.article["final_verification_report"])
        payload = self.final_payload()
        def mutate():
            Store(self.db).save_final_report(self.article["id"], report, *[payload[key] for key in
                ("report_id","expected_revision","expected_source_revision","expected_plan_revision","expected_draft_revision","expected_final_report_id")])
        self.assertEqual(self.review(mutate=mutate).status_code, 409)
        saved = self.client.get(self.route).json()
        self.assertNotEqual(saved["final_verification_report"]["id"], payload["expected_final_report_id"])

    def test_atomic_approval_rechecks_draft_version(self):
        self.assertEqual(self.review().status_code, 200)
        real_save = Store.save_approval
        def save(store, *args, **kwargs):
            self.assertEqual(self.save_manual().status_code, 200)
            return real_save(store, *args, **kwargs)
        with patch.object(Store, "save_approval", save):
            self.assertEqual(self.approve().status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["approval"])

    def test_missing_key_and_api_failure_keep_saved_draft(self):
        content = self.article["draft"]["content"]
        self.assertEqual(self.client.post(self.route + "/draft/verify", json=self.final_payload()).status_code, 503)
        self.assertEqual(self.review(status=429).status_code, 502)
        self.assertEqual(self.client.get(self.route).json()["draft"]["content"], content)

    def test_source_changed_during_review_rejects_result(self):
        def mutate():
            response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="검증 중 추가 근거", excerpt="새 자료"))
            self.assertEqual(response.status_code, 201)
        self.assertEqual(self.review(mutate=mutate).status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["final_verification_report"])

    def test_old_database_migration_preserves_draft_and_sources(self):
        before = copy.deepcopy(self.article)
        store = Store(self.db)
        with store.connect() as db:
            db.execute("DROP TABLE final_verification_reports")
            db.execute("DROP TABLE article_approvals")
        migrated = Store(self.db).get(self.article["id"])
        for key in ("original_text", "sources", "rewrite_plan", "draft", "draft_revision"):
            self.assertEqual(migrated[key], before[key])
        self.assertEqual(migrated["final_verification_status"], "not_run")
        self.assertFalse(migrated["can_export"])

    def test_export_escapes_user_text(self):
        body = self.body(); body["title"] = '<script>alert(1)</script> "가상"'
        body["sections"][0]["heading"] = '<img src=x onerror=alert(2)>'
        self.assertEqual(self.save_manual(body).status_code, 200)
        self.approved()
        response = self.export("html")
        self.assertNotIn("<script>", response.text); self.assertNotIn("<img src=x", response.text)
        self.assertIn("&lt;script&gt;", response.text)

    def test_limits_checked_before_api_and_split_preserves_text(self):
        text = "첫 번째 문장입니다. " * 200
        self.assertEqual(" ".join(split_text(text)), text.strip())
        self.assertTrue(all(len(part)<=1100 for part in split_text(text)))
        body = self.body(); body["sections"] = [{"heading":"긴 기사","kind":"fact","text":"가"*6000,"item_ids":[]} for _ in range(6)]
        self.assertEqual(self.save_manual(body).status_code, 200)
        with patch("main.verify_draft", wraps=__import__("final_review").verify_draft):
            with patch("verification.httpx.Client") as mocked:
                self.assertEqual(self.client.post(self.route + "/draft/verify", json=self.final_payload()).status_code, 422)
                mocked.assert_not_called()


if __name__ == "__main__":
    unittest.main()
