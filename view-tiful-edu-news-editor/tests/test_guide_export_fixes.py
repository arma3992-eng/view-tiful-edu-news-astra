"""Regression tests: stale-draft guide requests, malformed AI guide IDs, DOCX control characters."""
import copy
import io
import unittest
from unittest.mock import patch
from docx import Document
from reader_guide import GuideProposal
import test_reader_guide as guide_tests


class GuideExportFixTests(unittest.TestCase):
    for _name in ("setUp", "tearDown", "revisions", "ai_response", "run_mocked_ai", "verified", "plan", "base",
                  "save_plan", "body", "draft_request", "save_manual", "final_payload", "final_response", "review",
                  "approve", "approved", "export", "guide", "generate"):
        locals()[_name] = getattr(guide_tests.ReaderGuideTests, _name)

    def test_stale_draft_rejects_guide_generation(self):
        plan = self.plan(); plan["editor_note"] = "구성을 바꿔주세요"
        self.assertEqual(self.save_plan(plan).status_code, 200)
        self.assertEqual(self.article["draft_status"], "stale")
        before = copy.deepcopy(self.article["draft"])
        response, _ = self.generate()
        self.assertEqual(response.status_code, 409, response.text)
        current = self.client.get(self.route).json()
        self.assertEqual(current["draft_status"], "stale")
        self.assertEqual(current["draft"], before)

    def test_duplicate_ai_section_ids_return_clear_error(self):
        audiences = self.guide()["audiences"]
        audiences[0]["sections"].append(copy.deepcopy(audiences[0]["sections"][0]))
        proposal = GuideProposal(recommendation="recommended", reason="확인", audiences=audiences)
        with patch("verification.ask_structured", return_value=(proposal, {})):
            response = self.client.post(self.route + "/reader-guide/generate", json=self.draft_request())
        self.assertEqual(response.status_code, 502, response.text)
        self.assertIn("ID", response.json()["detail"])

    def test_docx_strips_control_characters(self):
        content = self.body(); content["sections"][0]["heading"] = "일정\x0b안내"
        self.assertEqual(self.save_manual(content).status_code, 200)
        self.approved()
        response = self.export("docx")
        self.assertEqual(response.status_code, 200, response.text)
        text = "\n".join(p.text for p in Document(io.BytesIO(response.content)).paragraphs)
        self.assertIn("일정안내", text)
        self.assertIn("\x0b", self.export("json").json()["article"]["sections"][0]["heading"])
