"""Reader guide lifecycle; uses fake AI responses and temporary databases only."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from pydantic import ValidationError
from reader_guide import GuideProposal, ReaderGuide
from final_review import draft_segments
from storage import Store
import test_final_review as final_tests

class ReaderGuideTests(unittest.TestCase):
    # Reuse setup/helpers, not the inherited test suite.
    for _name in ("setUp", "tearDown", "revisions", "ai_response", "run_mocked_ai", "verified",
                  "plan", "base", "save_plan", "body", "draft_request", "save_manual",
                  "final_payload", "final_response", "review", "approve", "approved", "export"):
        locals()[_name] = getattr(final_tests.FinalReviewTests, _name)

    def guide(self, enabled=True, count=4):
        return {"enabled":enabled,"audiences":[{"id":"a"+str(n),"label":name,"title":"일정을 확인하세요",
            "sections":[{"id":"check","type":"check","items":[{"text":"실시일은 10월 3일이다.","item_ids":["claim_3"]}]}]}
            for n,name in enumerate(["수험생","학부모","진학담당교사","학교 관리자"][:count])]}

    def generate(self, mutate=None):
        proposal = GuideProposal(recommendation="recommended", reason="시험 일정 확인이 필요합니다.", audiences=self.guide()["audiences"])
        seen = {}
        def ask(instructions, data, model, name):
            seen.update(data)
            self.assertEqual(name, "education_reader_guide")
            if mutate:
                mutate()
            return proposal, {"input_tokens":1}
        with patch("verification.ask_structured", side_effect=ask):
            result = self.client.post(self.route+"/reader-guide/generate",json=self.draft_request())
        if result.status_code==200:
            self.article=result.json()
        return result, seen

    def test_optional_legacy_roundtrip(self):
        self.assertNotIn("reader_guide",self.article["draft"]["content"])
        self.assertTrue(any(s["id"].startswith("guidance_student") for s in draft_segments(self.body())))
        self.assertEqual(self.save_manual().status_code,200)
        self.assertNotIn("reader_guide",Store(self.db).get(self.article["id"])["draft"]["content"])

    def test_variable_audiences_verification_and_off(self):
        content=self.body();content["reader_guide"]=self.guide()
        self.assertEqual(self.save_manual(content).status_code,200)
        segments=draft_segments(content)
        self.assertEqual(sum(s["id"].startswith("reader-") for s in segments),12)
        self.assertFalse(any(s["id"].startswith("guidance_") for s in segments))
        content["reader_guide"]["enabled"]=False
        self.assertFalse(any(s["id"].startswith(("reader-","guidance_")) for s in draft_segments(content)))
        invalid=copy.deepcopy(content);invalid["reader_guide"]["audiences"][0]["sections"][0]["items"][0]["item_ids"]=["unknown"]
        self.assertEqual(self.save_manual(invalid).status_code,422)
        with self.assertRaises(ValidationError):
            ReaderGuide.model_validate({"enabled":True,"audiences":[]})

    def test_generation_manual_save_approval_and_import(self):
        response,seen=self.generate()
        self.assertEqual(response.status_code,200,response.text)
        self.assertIsNone(seen["approved_article"])
        self.assertTrue(all(i["origin"]=="include" for i in seen["verified_facts"]))
        self.assertFalse(self.article["draft"]["content"]["reader_guide"]["enabled"])
        initial=copy.deepcopy(self.article["draft"]["metadata"]["reader_guide_initial"])
        content=copy.deepcopy(self.article["draft"]["content"]);content["reader_guide"]["enabled"]=True
        content["reader_guide"]["audiences"][0]["title"]="편집자가 수정한 제목"
        response=self.client.put(self.route+"/draft",json=dict(self.draft_request(),content=content,reader_guide_note="대상별 표현 수정"))
        self.assertEqual(response.status_code,200,response.text);self.article=response.json()
        self.assertEqual(initial,self.article["draft"]["metadata"]["reader_guide_initial"])
        self.approved()
        approval=self.article["approval"]["reader_guide_review"]
        self.assertEqual(approval["initial"],initial);self.assertEqual(approval["note"],"대상별 표현 수정")
        self.assertTrue(approval["approved"]);self.assertEqual(approval["final"],content["reader_guide"])
        payload=self.export().json()
        self.assertIn("학교 관리자",self.export("html").text)
        spec=importlib.util.spec_from_file_location("import_guide",Path(__file__).resolve().parents[2]/"design/tools/import_reader_guide.py")
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"lead-news.js").write_text("window.LEAD_NEWS = [{id:'lead-1'}];")
            (root/"news-data.js").write_text('window.CATEGORY_NEWS = {"test":{"articles":[]}};')
            source=root/"export.json";source.write_text(json.dumps(payload))
            target=module.import_export(source,root,"lead-1")
            registry=json.loads(target.read_text())
            self.assertEqual(len(registry["articles"]["lead-1"]["reader_guide"]["audiences"]),4)
            self.assertNotIn("initial",target.read_text());self.assertNotIn("item_ids",target.read_text())
            payload["article"]["title"]="tampered";source.write_text(json.dumps(payload))
            with self.assertRaises(ValueError):module.import_export(source,root,"lead-1")
            with self.assertRaises(ValueError):module.import_export(source,root,"missing")
        content["reader_guide"]["enabled"]=False
        self.assertEqual(self.save_manual(content).status_code,200)
        self.assertFalse(self.article["can_export"])
        self.assertEqual(self.export().status_code,409)

    def test_approved_article_input_and_concurrent_conflict(self):
        self.approved()
        result,seen=self.generate()
        self.assertEqual(result.status_code,200,result.text)
        self.assertIsNotNone(seen["approved_article"])
        self.assertFalse(self.article["can_export"])
        request=self.draft_request()
        # Save during generation using the same version: generated proposal must not overwrite it.
        result,_=self.generate(mutate=lambda:self.client.put(self.route+"/draft",json=dict(request,content=self.article["draft"]["content"])))
        self.assertEqual(result.status_code,409)

    def test_bad_ai_refs_and_empty_recommendation(self):
        proposal=GuideProposal(recommendation="not_recommended",reason="추가 행동이 필요하지 않습니다.",audiences=[])
        with patch("verification.ask_structured",return_value=(proposal,{})):
            response=self.client.post(self.route+"/reader-guide/generate",json=self.draft_request())
        self.assertEqual(response.status_code,200);self.article=response.json()
        self.assertEqual(self.article["draft"]["content"]["reader_guide"],{"enabled":False,"audiences":[]})
        proposal=GuideProposal(recommendation="optional",reason="테스트",audiences=self.guide()["audiences"])
        proposal.audiences[0].sections[0].items[0].item_ids=["missing"]
        with patch("verification.ask_structured",return_value=(proposal,{})):
            response=self.client.post(self.route+"/reader-guide/generate",json=self.draft_request())
        self.assertEqual(response.status_code,502)

if __name__=="__main__":
    unittest.main()
