"""After a draft save, unchanged sentences keep accepting item-review input until re-verification.
Approval still needs a current final verification."""
import copy
import unittest
import test_review_drafts as drafts
from storage import Store


class PendingReviewTests(unittest.TestCase):
    setUp = drafts.ReviewDraftTests.setUp
    tearDown = drafts.ReviewDraftTests.tearDown
    save = drafts.ReviewDraftTests.save
    records = drafts.ReviewDraftTests.records

    def ids(self):
        report = self.f.article["final_verification_report"]
        by_segment = {c["segment_id"]: c["id"] for c in report["checks"]}
        return by_segment["section_1_body_1"], by_segment["fact_1_1"]

    def edit_fact_only(self):
        body = copy.deepcopy(self.f.article["draft"]["content"])
        body["key_facts"][0]["value"] = "실시일은 10월 4일이다."
        self.assertEqual(self.f.save_manual(body).status_code, 200)
        return Store(self.f.db).get(self.f.article["id"])

    def item(self, check_id, quote="실시일은 10월 3일이다."):
        item = copy.deepcopy(next(x for x in self.f.decisions() if x["check_id"] == check_id))
        item["evidence"][0]["quote"] = quote
        return item

    def test_unchanged_sentence_reviewable_changed_sentence_locked(self):
        body_id, fact_id = self.ids()
        article = self.edit_fact_only()
        self.assertEqual(article["final_verification_status"], "stale")
        self.assertEqual(article["pending_review_checks"], [body_id])
        self.assertFalse(article["can_review"])
        self.assertEqual(self.save(self.item(body_id)).status_code, 200)
        self.assertEqual(self.save(self.item(fact_id)).status_code, 409)
        hint = next(h for h in Store(self.f.db).get(self.f.article["id"])["human_review_drafts"] if h["check_id"] == body_id)
        self.assertIsNotNone(hint["input"])
        self.assertIn("재검증 후 다시 불러오며", hint["message"])
        self.assertFalse(hint["input"]["confirmed"])

    def test_approval_still_requires_reverification_then_input_returns(self):
        body_id, _ = self.ids()
        self.edit_fact_only()
        self.assertEqual(self.save(self.item(body_id)).status_code, 200)
        self.assertEqual(self.f.approve(resolutions=self.f.decisions()).status_code, 409)
        self.assertEqual(self.f.review(self.f.unknown).status_code, 200)
        article = Store(self.f.db).get(self.f.article["id"])
        self.assertEqual(article["pending_review_checks"], [])
        new_body = next(c["id"] for c in article["final_verification_report"]["checks"] if c["segment_id"] == "section_1_body_1")
        hint = next(h for h in article["human_review_drafts"] if h["check_id"] == new_body)
        self.assertEqual(hint["input"]["evidence"][0]["quote"], "실시일은 10월 3일이다.")
        self.assertIn("이전 검토 내용 불러옴", hint["message"])
        self.assertFalse(hint["input"]["confirmed"])

    def test_source_change_locks_everything(self):
        body_id, _ = self.ids()
        self.edit_fact_only()
        f = self.f
        response = f.client.post(f.route + "/sources", json=dict(f.revisions(), name="추가 자료", kind="official",
                                                                   excerpt="추가 근거 내용입니다.", locator=""))
        self.assertEqual(response.status_code, 201, response.text)
        article = Store(f.db).get(f.article["id"])
        self.assertEqual(article["pending_review_checks"], [])

    def test_pending_wording_for_unrelated_old_input(self):
        body_id, _ = self.ids()
        self.assertEqual(self.save(self.item(body_id)).status_code, 200)
        body = copy.deepcopy(self.f.article["draft"]["content"])
        body["sections"][0]["text"] = "실시일은 10월 3일 오전이다."
        body["key_facts"][0]["value"] = "실시일은 10월 3일 오전이다."
        self.assertEqual(self.f.save_manual(body).status_code, 200)
        self.assertEqual(self.f.review(self.f.unknown).status_code, 200)
        self.f.save_manual(dict(body, title=body["title"] + " 수정"))
        article = Store(self.f.db).get(self.f.article["id"])
        messages = [h["message"] for h in article["human_review_drafts"] if h["input"] is None]
        self.assertTrue(messages)
        self.assertTrue(all(m.startswith("재검증 후 다시 확인") for m in messages))


if __name__ == "__main__":
    unittest.main()
