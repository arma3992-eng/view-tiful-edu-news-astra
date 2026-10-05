"""재작성 소재 선택·원문 보존·초안 저장과 충돌 검사. 실제 API 호출 없음."""
import copy
import json
import os
import unittest
from unittest.mock import patch
import httpx
from storage import Store
import test_workflow as workflow


class RewriteTests(unittest.TestCase):
    setUp = workflow.WorkflowTests.setUp
    tearDown = workflow.WorkflowTests.tearDown
    revisions = workflow.WorkflowTests.revisions
    ai_response = workflow.WorkflowTests.ai_response
    run_mocked_ai = workflow.WorkflowTests.run_mocked_ai

    def verified(self, change=None):
        response = self.run_mocked_ai(change=change)
        self.assertEqual(response.status_code, 200, response.text)
        self.article = response.json()
        return self.article

    def plan(self):
        report = self.article["verification_report"]
        return {"decisions": [{"claim_id": item["id"], "action": "include" if item.get("verdict") == "match" else "hold",
                "revised_text": "", "source_ids": [item["evidence"][0]["source_id"]] if item.get("verdict") == "match" else [], "note": ""}
                for item in report["checks"] + report.get("unanchored_checks", [])], "additions": [], "editor_note": ""}

    def base(self):
        return dict(self.revisions(), report_id=self.article["verification_report"]["id"],
                    expected_plan_revision=self.article["plan_revision"])

    def save_plan(self, content=None):
        response = self.client.put(self.route + "/rewrite-plan", json=dict(self.base(), content=content or self.plan()))
        if response.status_code == 200:
            self.article = response.json()
        return response

    def body(self, item_id="claim_3", text="실시일은 10월 3일이다."):
        return {"category": "입시·수능", "title": "시험 준비, 날짜와 조건을 확인하세요",
                "summary": ["시험 일정을 안내했습니다.", "적용 대상과 준비 조건을 확인하세요."],
                "sections": [{"heading": "일정", "kind": "fact", "text": text, "item_ids": [item_id]}],
                "key_facts": [{"label": "일정", "value": text, "item_ids": [item_id]}],
                "audience_guidance": [{"audience": "student", "heading": "먼저 확인하세요", "text": "본인의 일정을 확인해보세요.", "item_ids": [item_id]}]}

    def draft_request(self):
        return dict(self.base(), expected_draft_revision=self.article["draft_revision"])

    def save_manual(self, content=None):
        response = self.client.put(self.route + "/draft", json=dict(self.draft_request(), content=content or self.body()))
        if response.status_code == 200:
            self.article = response.json()
        return response

    def run_generation(self, content=None, inspect=None, mutate=None, status=200):
        calls = []
        real_client = httpx.Client
        def handler(request):
            calls.append(request)
            payload = json.loads(request.content)
            self.assertFalse(payload["store"])
            self.assertEqual(payload["text"]["format"]["name"], "education_news_draft")
            self.assertTrue(payload["text"]["format"]["strict"])
            if inspect: inspect(json.loads(payload["input"]))
            if mutate: mutate()
            if status != 200: return httpx.Response(status, json={"error": {"message": "mock"}})
            return httpx.Response(200, json={"status": "completed", "output": [{"type": "message", "content": [
                {"type": "output_text", "text": json.dumps(content or self.body(), ensure_ascii=False)}]}],
                "usage": {"input_tokens": 100, "output_tokens": 100}})
        def client(*args, **kwargs):
            return real_client(transport=httpx.MockTransport(handler))
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-key"}), patch("verification.httpx.Client", side_effect=client):
            response = self.client.post(self.route + "/draft/generate", json=self.draft_request())
        self.assertEqual(len(calls), 1)
        if response.status_code == 200: self.article = response.json()
        return response

    def test_requires_current_report_and_saved_plan(self):
        self.assertEqual(self.article["draft_status"], "not_started")
        payload = dict(self.revisions(), report_id="not-a-report", expected_plan_revision=0, content={"decisions": [], "additions": [], "editor_note": ""})
        self.assertEqual(self.client.put(self.route + "/rewrite-plan", json=payload).status_code, 409)
        self.verified()
        request = dict(self.draft_request(), expected_plan_revision=1)
        self.assertEqual(self.client.post(self.route + "/draft/generate", json=request).status_code, 409)

    def test_plan_and_manual_draft_persist_without_changing_original(self):
        original = copy.deepcopy(self.article)
        self.verified(); self.assertEqual(self.save_plan().status_code, 200)
        self.assertEqual(self.save_manual().status_code, 200)
        reopened = Store(self.db).get(self.article["id"])
        self.assertEqual(reopened["draft"]["content"], self.body())
        self.assertEqual(reopened["draft_revision"], 1)
        self.assertEqual(reopened["draft_status"], "needs_verification")
        self.assertEqual(reopened["original_text"], original["original_text"])
        self.assertEqual(reopened["sources"], original["sources"])
        self.assertFalse(reopened["can_publish"])
        self.assertEqual(self.client.post(self.route + "/publish", json={}).status_code, 404)

    def test_held_and_excluded_items_not_sent_as_writing_material(self):
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="작성에 사용하지 않을 자료", excerpt="무관한 참고 내용"))
        self.article = response.json()
        self.verified(); plan = self.plan(); plan["decisions"][0]["action"] = "exclude"
        self.assertEqual(self.save_plan(plan).status_code, 200)
        def inspect(data):
            self.assertNotIn("original_article", data)
            self.assertEqual([item["id"] for item in data["selected_items"]], ["claim_3"])
            self.assertNotIn("시험 시간은 120분이다.", [item["text"] for item in data["selected_items"]])
            self.assertEqual([source["source_id"] for source in data["registered_evidence"]], [self.article["sources"][0]["id"]])
        self.assertEqual(self.run_generation(inspect=inspect).status_code, 200)

    def test_four_to_five_is_a_correction_candidate_not_an_approval(self):
        response = self.client.put(self.route, json={"original_text": self.article["original_text"] + "\n논술고사는 4문항이다.", "expected_revision": 1})
        self.article = response.json()
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="가상 문항 수 근거", kind="other", excerpt="논술고사는 5문항이다."))
        self.article = response.json(); source_id = self.article["sources"][-1]["id"]
        def change(rows):
            rows.append(dict(rows[-1], original_quote="논술고사는 4문항이다.", claim="논술고사는 4문항이다.", verdict="unverifiable"))
        self.verified(change)
        plan = self.plan(); plan["decisions"][-1].update(action="revise", revised_text="논술고사는 5문항이다.", source_ids=[source_id], note="문항 수 확인 후 수정 후보")
        self.assertEqual(self.save_plan(plan).status_code, 200)
        def inspect(data):
            revised = next(item for item in data["selected_items"] if item["id"] == "claim_5")
            self.assertEqual(revised["text"], "논술고사는 5문항이다.")
            self.assertEqual(revised["source_ids"], [source_id])
            self.assertEqual(revised["context"], "")
        self.assertEqual(self.run_generation(self.body("claim_5", "논술고사는 5문항이다."), inspect=inspect).status_code, 200)
        self.assertIn("4문항", self.article["original_text"])
        self.assertIn("5문항", self.article["draft"]["content"]["sections"][0]["text"])
        self.assertTrue(self.article["draft"]["metadata"]["warnings"])
        self.assertEqual(self.article["checks"][-1]["verdict"], "unverifiable")
        self.assertFalse(self.article["can_publish"])

    def test_correction_requires_text_and_registered_evidence(self):
        self.verified(); plan = self.plan()
        plan["decisions"][0].update(action="revise", revised_text="시험 시간은 100분이다.")
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan["decisions"][0]["source_ids"] = ["another-article-source"]
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan["decisions"][0]["source_ids"] = [self.article["sources"][0]["id"]]
        self.assertEqual(self.save_plan(plan).status_code, 200)

    def test_unverifiable_include_requires_evidence_and_reason(self):
        self.verified(); plan = self.plan(); plan["decisions"][-1]["action"] = "include"
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan["decisions"][-1]["source_ids"] = [self.article["sources"][0]["id"]]
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan["decisions"][-1]["note"] = "추가 확인 후 포함 후보. 최종 재검증 필요"
        self.assertEqual(self.save_plan(plan).status_code, 200)
        self.assertFalse(self.article["can_publish"])

    def test_additional_facts_require_evidence_but_analysis_is_labelled(self):
        self.verified(); plan = self.plan()
        plan["additions"] = [{"kind": "fact", "text": "이전 시험은 5문항이었다.", "source_ids": []}]
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan["additions"][0]["source_ids"] = [self.article["sources"][0]["id"]]
        plan["additions"].append({"kind": "analysis", "text": "시간을 나누어 준비하는 편이 좋겠다는 편집자의 의견이다.", "source_ids": []})
        self.assertEqual(self.save_plan(plan).status_code, 200)
        def inspect(data):
            self.assertEqual(data["selected_items"][-1]["kind"], "analysis")
            self.assertEqual(data["selected_items"][-2]["id"], "addition_1")
        self.assertEqual(self.run_generation(inspect=inspect).status_code, 200)

    def test_unanchored_quotes_can_only_be_held_or_excluded(self):
        self.verified(lambda rows: rows[0].update(original_quote="원문에 없는 발췌"))
        plan = self.plan(); self.assertEqual(self.save_plan(plan).status_code, 200)
        plan["decisions"][-1]["action"] = "include"
        self.assertEqual(self.save_plan(plan).status_code, 422)

    def test_missing_or_duplicate_decisions_are_rejected(self):
        self.verified(); plan = self.plan(); plan["decisions"].pop()
        self.assertEqual(self.save_plan(plan).status_code, 422)
        plan = self.plan(); plan["decisions"].append(plan["decisions"][0])
        self.assertEqual(self.save_plan(plan).status_code, 422)

    def test_unknown_generated_item_references_do_not_save_a_draft(self):
        self.verified(); self.save_plan()
        response = self.run_generation(self.body("claim_1"))
        self.assertEqual(response.status_code, 502)
        self.assertIsNone(self.client.get(self.route).json()["draft"])

    def test_everything_on_hold_avoids_api_call(self):
        self.verified(); plan = self.plan()
        for item in plan["decisions"]: item["action"] = "hold"
        self.save_plan(plan)
        with patch("rewriting.ask_structured") as ai:
            response = self.client.post(self.route + "/draft/generate", json=self.draft_request())
        self.assertEqual(response.status_code, 422); ai.assert_not_called()

    def test_manual_unlinked_content_is_saved_as_pending_review(self):
        self.verified(); self.save_plan(); body = self.body()
        body["sections"][0]["item_ids"] = []
        self.assertEqual(self.save_manual(body).status_code, 200)
        self.assertTrue(self.article["draft"]["metadata"]["warnings"])
        self.assertFalse(self.article["can_publish"])

    def test_exactly_two_nonblank_summary_sentences_are_required(self):
        self.verified(); self.save_plan()
        for summary in [["한 문장"], ["첫 문장", ""], ["1", "2", "3"]]:
            body = self.body(); body["summary"] = summary
            self.assertEqual(self.save_manual(body).status_code, 422)
        self.assertIsNone(self.client.get(self.route).json()["draft"])

    def test_source_change_preserves_but_invalidates_plan_and_draft(self):
        self.verified(); self.save_plan(); self.save_manual()
        response = self.client.post(self.route + "/sources", json=dict(self.revisions(), name="추가 근거", excerpt="추가 조건"))
        self.article = response.json()
        self.assertEqual(self.article["rewrite_plan_status"], "stale")
        self.assertEqual(self.article["draft_status"], "stale")
        self.assertIsNotNone(self.article["draft"])
        self.assertEqual(self.client.post(self.route + "/draft/generate", json=self.draft_request()).status_code, 409)

    def test_new_report_and_plan_changes_invalidate_previous_draft(self):
        self.verified(); self.save_plan(); self.save_manual()
        plan = self.plan(); plan["editor_note"] = "문장을 짧게"
        self.save_plan(plan); self.assertEqual(self.article["draft_status"], "stale")
        self.verified(); self.assertEqual(self.article["rewrite_plan_status"], "stale")
        self.assertEqual(self.article["draft_status"], "stale")

    def test_plan_changed_during_generation_does_not_overwrite_draft(self):
        self.verified(); self.save_plan(); self.save_manual(); original = copy.deepcopy(self.article["draft"])
        store = self.client.app.state.store
        def mutate():
            changed = self.plan(); changed["editor_note"] = "다른 창의 편집 요청"
            store.save_plan(self.article["id"], changed, self.article["verification_report"]["id"], self.article["revision"], self.article["source_revision"], self.article["plan_revision"])
        self.assertEqual(self.run_generation(mutate=mutate).status_code, 409)
        self.assertEqual(self.client.get(self.route).json()["draft"], original)

    def test_draft_changed_during_generation_is_preserved(self):
        self.verified(); self.save_plan()
        def mutate():
            response = self.save_manual(dict(self.body(), title="다른 창에서 저장한 제목"))
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.run_generation(mutate=mutate).status_code, 409)
        self.assertEqual(self.client.get(self.route).json()["draft"]["content"]["title"], "다른 창에서 저장한 제목")

    def test_failed_generation_preserves_draft_and_saved_decisions(self):
        self.verified(); self.save_plan(); self.save_manual(); previous = copy.deepcopy(self.article["draft"])
        self.assertEqual(self.run_generation(status=429).status_code, 502)
        current = self.client.get(self.route).json()
        self.assertEqual(current["draft"], previous)
        self.assertEqual(current["rewrite_plan_status"], "current")

    def test_concurrent_manual_draft_save_is_rejected(self):
        self.verified(); self.save_plan(); stale = dict(self.draft_request(), content=self.body())
        self.save_manual()
        self.assertEqual(self.client.put(self.route + "/draft", json=stale).status_code, 409)


if __name__ == "__main__":
    unittest.main()
