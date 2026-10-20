"""Saved item reviews survive AI quote-span changes; messages only refer to the same sentence."""
import copy
import json
import unittest
import test_review_drafts as drafts
from storage import Store
from review_drafts import review_draft_hints


class ReviewRestoreTests(unittest.TestCase):
    setUp = drafts.ReviewDraftTests.setUp
    tearDown = drafts.ReviewDraftTests.tearDown
    save = drafts.ReviewDraftTests.save
    records = drafts.ReviewDraftTests.records

    def section_check(self, report):
        return next(c for c in report["checks"] if c["segment_id"] == "section_1_body_1")

    def test_same_sentence_different_ai_span_is_restored(self):
        f = self.f
        item = next(x for x in f.decisions() if x["check_id"] == self.section_check(f.article["final_verification_report"])["id"])
        self.assertEqual(self.save(item).status_code, 200)
        self.assertEqual(self.records()[0]["segment_text"], "실시일은 10월 3일이다.")

        def shorter_span(data):
            f.unknown(data)
            for part in data["segments"]:
                for check in part["checks"]:
                    if part["segment_id"] == "section_1_body_1":
                        check["original_quote"] = "10월 3일이다."
        self.assertEqual(f.review(shorter_span).status_code, 200)
        article = Store(f.db).get(f.article["id"])
        check = self.section_check(article["final_verification_report"])
        self.assertEqual(check["original_quote"], "10월 3일이다.")
        hint = next(h for h in article["human_review_drafts"] if h["check_id"] == check["id"])
        self.assertIsNotNone(hint["input"])
        self.assertEqual(hint["input"]["reason"], item["reason"])
        self.assertFalse(hint["input"]["confirmed"])
        self.assertIn("다른 범위", hint["message"])

    def test_legacy_record_without_segment_text_is_backfilled(self):
        f = self.f
        item = next(x for x in f.decisions() if x["check_id"] == self.section_check(f.article["final_verification_report"])["id"])
        self.assertEqual(self.save(item).status_code, 200)
        with Store(f.db).connect() as db:
            row = db.execute("SELECT claim_fingerprint, draft_json FROM human_review_drafts").fetchone()
            record = json.loads(row["draft_json"]); record.pop("segment_text")
            db.execute("UPDATE human_review_drafts SET draft_json=? WHERE claim_fingerprint=?",
                       (json.dumps(record, ensure_ascii=False), row["claim_fingerprint"]))

        def shorter_span(data):
            f.unknown(data)
            for part in data["segments"]:
                if part["segment_id"] == "section_1_body_1":
                    part["checks"][0]["original_quote"] = "10월 3일이다."
        self.assertEqual(f.review(shorter_span).status_code, 200)
        hints = Store(f.db).get(f.article["id"])["human_review_drafts"]
        self.assertTrue(any(h["input"] and h["input"]["reason"] == item["reason"] for h in hints))

    def test_other_claim_in_same_paragraph_gets_no_misleading_message(self):
        f = self.f
        report = f.article["final_verification_report"]
        item = next(x for x in f.decisions() if x["check_id"] == self.section_check(report)["id"])
        self.assertEqual(self.save(item).status_code, 200)
        current = copy.deepcopy(report)
        part = next(p for p in current["coverage"] if p["id"] == "section_1_body_1")
        part["text"] = "실시일은 10월 3일이다. 응시 인원은 224명이다."
        check = self.section_check(current)
        # The saved claim is resolved; a different claim in the same paragraph is now unresolved.
        check.update(id="other_claim", original_quote="응시 인원은 224명이다.", claim="응시 인원은 224명이다.")
        self.assertFalse([h for h in review_draft_hints(current, self.records()) if h["check_id"] == "other_claim"])
        # The same sentence edited: the message is still shown, without restoring old input.
        check.update(original_quote="실시일은 10월 3일 오전이다.")
        part["text"] = "실시일은 10월 3일 오전이다."
        hint = next(h for h in review_draft_hints(current, self.records()) if h["check_id"] == "other_claim")
        self.assertIsNone(hint["input"])
        self.assertIn("기사 문장이 변경되어 재확인 필요", hint["message"])

    def test_evidence_warning_only_for_report_excerpts(self):
        f = self.f
        self.assertEqual(self.save().status_code, 200)
        changed = copy.deepcopy(f.article["final_verification_report"])
        changed["source_revision"] += 1
        records = self.records()
        self.assertIn("근거가 변경", review_draft_hints(changed, records)[0]["message"])
        external = copy.deepcopy(records)
        for record in external:
            record["input"].update(evidence=[], external_evidence=[
                {"source_url": "https://example.org/official.pdf", "source_label": "", "quote": "실시일은 10월 3일이다."}])
        self.assertNotIn("근거가 변경", review_draft_hints(changed, external)[0]["message"])
        editorial = copy.deepcopy(records)
        for record in editorial:
            record["input"].update(action="editorial", evidence=[])
        self.assertNotIn("근거가 변경", review_draft_hints(changed, editorial)[0]["message"])


if __name__ == "__main__":
    unittest.main()
