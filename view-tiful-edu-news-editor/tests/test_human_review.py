"""사람의 실제 근거 확인·분석 분류·AI 판정 보존과 현재 버전 승인 검사."""
import copy
import unittest
from unittest.mock import patch
import test_final_review as final_tests
from storage import Store


class HumanReviewTests(unittest.TestCase):
    tearDown = final_tests.FinalReviewTests.tearDown
    revisions = final_tests.FinalReviewTests.revisions
    ai_response = final_tests.FinalReviewTests.ai_response
    run_mocked_ai = final_tests.FinalReviewTests.run_mocked_ai
    verified = final_tests.FinalReviewTests.verified
    plan = final_tests.FinalReviewTests.plan
    base = final_tests.FinalReviewTests.base
    save_plan = final_tests.FinalReviewTests.save_plan
    body = final_tests.FinalReviewTests.body
    draft_request = final_tests.FinalReviewTests.draft_request
    save_manual = final_tests.FinalReviewTests.save_manual
    final_payload = final_tests.FinalReviewTests.final_payload
    final_response = final_tests.FinalReviewTests.final_response
    review = final_tests.FinalReviewTests.review
    approve = final_tests.FinalReviewTests.approve
    first_fact = final_tests.FinalReviewTests.first_fact
    export = final_tests.FinalReviewTests.export

    def setUp(self):
        final_tests.FinalReviewTests.setUp(self)
        self.assertEqual(self.review(self.unknown).status_code, 200)

    def unknown(self, response):
        for part in response["segments"]:
            for check in part["checks"]:
                check["verdict"] = "unverifiable"
                check["evidence"] = []

    def decisions(self, source_index=0):
        report = self.article["final_verification_report"]
        source = report["read_sources"][source_index]
        return [{"check_id": check["id"], "action": "confirm_evidence", "reason": "같은 대상의 날짜를 등록한 자료에서 직접 확인했습니다.",
                 "confirmed": True, "evidence": [{"source_id": source["source_id"], "chunk_id": source["chunks"][0]["chunk_id"],
                                                   "quote": "실시일은 10월 3일이다."}]}
                for check in report["checks"] if check["verdict"] != "match"]

    def human_approved(self):
        response = self.approve(resolutions=self.decisions())
        self.assertEqual(response.status_code, 200, response.text)

    def test_pending_report_allows_human_review_but_not_automatic_approval(self):
        self.assertTrue(self.article["can_review"])
        self.assertFalse(self.article["can_approve"])
        self.assertEqual(self.article["review_required_count"], 2)
        self.assertEqual(self.approve().status_code, 409)
        self.assertEqual(self.export().status_code, 409)

    def test_actual_citations_and_reasons_allow_current_version_approval(self):
        original = copy.deepcopy(self.article["final_verification_report"])
        self.human_approved()
        self.assertEqual(self.article["approval_status"], "approved")
        self.assertTrue(self.article["can_export"])
        self.assertEqual(self.article["approval"]["review_basis"], "ai_and_human")
        self.assertEqual(self.article["final_verification_report"], original)
        self.assertTrue(all(check["verdict"]=="unverifiable" for check in original["checks"]))
        self.assertEqual(len(self.article["approval"]["resolutions"]), 2)

    def test_all_pending_items_must_be_resolved(self):
        self.assertEqual(self.approve(resolutions=self.decisions()[:-1]).status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["approval"])

    def test_duplicate_or_foreign_claim_rejected(self):
        items = self.decisions()
        self.assertEqual(self.approve(resolutions=items+[items[0]]).status_code, 422)
        items[0]["check_id"] = "other-report-claim"
        self.assertEqual(self.approve(resolutions=items).status_code, 422)

    def test_unregistered_or_unread_citation_rejected(self):
        for fields in ({"source_id":"foreign-source"}, {"chunk_id":"not-selected-chunk"}, {"quote":"실시일은 10월 4일이다."}):
            items = self.decisions(); items[0]["evidence"][0].update(fields)
            self.assertEqual(self.approve(resolutions=items).status_code, 422)

    def test_missing_evidence_reason_or_attestation_rejected(self):
        for fields in ({"evidence":[]}, {"reason":" "}, {"confirmed":False}, {"reason":"짧음"}):
            items = self.decisions(); items[0].update(fields)
            self.assertEqual(self.approve(resolutions=items).status_code, 422)

    def test_actual_quote_whitespace_is_accepted_without_changing_number(self):
        items = self.decisions();items[0]["evidence"][0]["quote"] = "실시일은\n10월 3일이다."
        self.assertEqual(self.approve(resolutions=items).status_code, 200)

    def test_editorial_judgment_requires_reason_and_is_recorded(self):
        def change(response):
            self.unknown(response)
            part = next(part for part in response["segments"] if part["segment_id"].startswith("title_"))
            template = copy.deepcopy(self.first_fact(response)["checks"][0])
            template.update(original_quote=part["reviewed_text"], claim="준비를 권하는 기사 제목", category="other",
                            verdict="needs_context", reason="편집자의 확인 권유", evidence=[])
            part.update(classification="factual", checks=[template])
        self.assertEqual(self.review(change).status_code, 200)
        items = self.decisions()
        title_id = next(check["id"] for check in self.article["final_verification_report"]["checks"] if check["original_location"]=="기사 제목")
        item = next(item for item in items if item["check_id"]==title_id)
        item.update(action="editorial", reason="날짜를 단정하는 내용이 아니라 준비를 권하는 일반 안내 제목입니다.", evidence=[])
        self.assertEqual(self.approve(resolutions=items).status_code, 200)
        self.assertTrue(any(item["action"]=="editorial" for item in self.article["approval"]["resolutions"]))

    def test_mismatch_cannot_be_exempted_as_editorial(self):
        def change(response): self.first_fact(response)["checks"][0]["verdict"] = "mismatch"
        self.assertEqual(self.review(change).status_code, 200)
        items = self.decisions();items[0].update(action="editorial", reason="편집자의 판단으로 분류하려 합니다.", evidence=[])
        self.assertEqual(self.approve(resolutions=items).status_code, 422)

    def test_scope_gaps_cannot_be_overridden(self):
        self.assertEqual(self.review(lambda data:data["segments"].pop()).status_code, 200)
        self.assertFalse(self.article["can_review"])
        self.assertEqual(self.approve(resolutions=self.decisions()).status_code, 409)

    def test_approval_restore_and_export_include_human_evidence(self):
        self.human_approved()
        reopened = Store(self.db).get(self.article["id"])
        self.assertTrue(reopened["can_export"])
        result = self.export()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(result.json()["human_review"]["evidence"]), 2)
        self.assertEqual(result.json()["sources"][0]["id"], self.article["sources"][0]["id"])
        self.assertIn("사람의 항목별 확인: 2개", self.export("html").text)

    def test_human_approval_invalidated_by_new_draft_or_report(self):
        self.human_approved(); identifier = self.article["approval"]["id"]
        self.assertEqual(self.review(self.unknown).status_code, 200)
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export(approval_id=identifier).status_code, 409)
        self.human_approved()
        self.assertEqual(self.save_manual().status_code, 200)
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_human_approval_invalidated_by_new_source(self):
        self.human_approved()
        self.article = self.client.post(self.route+"/sources", json=dict(self.revisions(), name="새 근거", excerpt="새 자료")).json()
        self.assertEqual(self.article["approval_status"], "stale")
        self.assertEqual(self.export().status_code, 409)

    def test_human_approval_rechecks_versions_atomically(self):
        real_save = Store.save_approval
        def save(store,*args,**kwargs):
            self.assertEqual(self.save_manual().status_code, 200)
            return real_save(store,*args,**kwargs)
        with patch.object(Store,"save_approval",save):
            self.assertEqual(self.approve(resolutions=self.decisions()).status_code, 409)
        self.assertIsNone(self.client.get(self.route).json()["approval"])

    def test_no_api_call_during_human_approval(self):
        with patch("verification.httpx.Client") as client:
            self.human_approved();client.assert_not_called()

    def test_current_report_and_content_required_for_human_approval(self):
        request = dict(self.final_payload(), reviewer="검토자", facts_reviewed=True, editorial_reviewed=True, rights_reviewed=True,
                       resolutions=self.decisions())
        self.assertEqual(self.review(self.unknown).status_code, 200)
        self.assertEqual(self.client.post(self.route+"/approve", json=request).status_code, 409)


if __name__ == "__main__":
    unittest.main()
