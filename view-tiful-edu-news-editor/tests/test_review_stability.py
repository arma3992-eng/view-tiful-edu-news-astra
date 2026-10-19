"""Coverage repair is bounded and saved human inputs follow article text, not AI prose."""
import copy
import json
import unittest
from unittest.mock import patch
import test_human_review as human
from final_review import FinalAIReport, verify_draft, draft_segments
from human_review import report_reviewable
from review_drafts import claim_fingerprint, digest, review_draft_hints
from storage import Store
from verification import VerificationError

class CoverageRepairTests(unittest.TestCase):
    def setUp(self):
        self.parts=[{'id':f'section_{i}_body_1','text':f'검토할 표현 {i}','location':f'본문 {i}','kind':'analysis'} for i in range(32)]
    def response(self, parts):
        return FinalAIReport.model_validate({'segments':[{'segment_id':p['id'],'reviewed_text':p['text'],'classification':'editorial','all_claims_checked':True,'checks':[]} for p in parts],'coverage_notes':[]})
    def run_review(self, first, retry=None):
        calls=[]
        def ask(instructions,data,*args):
            calls.append(copy.deepcopy(data))
            if len(calls)==1:return first,{'input_tokens':10,'output_tokens':20}
            if isinstance(retry,Exception):raise retry
            return retry,{'input_tokens':3,'output_tokens':4}
        with patch('final_review.draft_segments',return_value=self.parts),patch('final_review.ai_config',return_value={'configured':True,'model':'test'}),patch('final_review.verification_evidence',return_value=([],[],{})),patch('final_review.ask_structured',side_effect=ask):
            result=verify_draft({'draft':{'content':{}}},None)
        return result,calls
    def test_normal_32_no_retry(self):
        report,calls=self.run_review(self.response(self.parts))
        self.assertEqual(report['reviewed_count'],32);self.assertEqual(len(calls),1)
        self.assertTrue(report_reviewable(report))
    def test_missing_three_only_retry_three(self):
        initial=self.response(self.parts[:-3]);retry=self.response(self.parts[-3:])
        report,calls=self.run_review(initial,retry)
        self.assertEqual([p['id'] for p in calls[1]['segments']],[p['id'] for p in self.parts[-3:]])
        self.assertEqual(len(calls),2);self.assertEqual(report['reviewed_count'],32)
        self.assertTrue(report_reviewable(report));self.assertEqual(report['usage']['input_tokens'],13)
        self.assertEqual(report['coverage_retry']['initial_incomplete'],{p['id']:'missing' for p in self.parts[-3:]})
    def test_retry_failure_preserves_29_and_blocks_approval(self):
        report,calls=self.run_review(self.response(self.parts[:-3]),VerificationError('mock failure',502))
        self.assertEqual(len(calls),2);self.assertEqual(report['reviewed_count'],29)
        self.assertEqual(report['report_status'],'partial');self.assertFalse(report_reviewable(report))
        self.assertEqual(sum(p['status']=='unreviewed' for p in report['coverage']),3)
    def test_retry_incomplete_does_not_fabricate_coverage(self):
        report,_=self.run_review(self.response(self.parts[:-3]),self.response(self.parts[-3:-2]))
        self.assertEqual(report['reviewed_count'],30);self.assertFalse(report_reviewable(report))
    def test_24_of_32_reproduction_and_repair(self):
        initial=self.response(self.parts)
        for item in initial.segments[-8:]:item.classification='factual';item.checks=[]
        report,_=self.run_review(initial,VerificationError('failed',502))
        self.assertEqual(report['reviewed_count'],24)
        self.assertEqual(set(report['coverage_retry']['initial_incomplete'].values()),{'factual_without_checks'})
        repaired,calls=self.run_review(initial,self.response(self.parts[-8:]))
        self.assertEqual(len(calls[1]['segments']),8);self.assertEqual(repaired['reviewed_count'],32)
    def test_identical_duplicate_coalesced_conflict_reverified(self):
        initial=self.response(self.parts);initial.segments.append(initial.segments[0].model_copy(deep=True))
        report,calls=self.run_review(initial);self.assertEqual(len(calls),1);self.assertEqual(report['reviewed_count'],32)
        initial.segments[-1].reviewed_text='서로 다른 결과'
        report,calls=self.run_review(initial,self.response(self.parts[:1]))
        self.assertEqual(len(calls[1]['segments']),1);self.assertEqual(report['reviewed_count'],32)
        self.assertEqual(report['coverage_retry']['initial_incomplete'][self.parts[0]['id']],'duplicate_conflict')
    def test_reviewed_text_difference_repaired_without_loosening_match(self):
        initial=self.response(self.parts);initial.segments[0].reviewed_text='다른 본문'
        report,_=self.run_review(initial,VerificationError('failed',502))
        self.assertEqual(report['reviewed_count'],31)
        self.assertEqual(report['coverage_retry']['initial_incomplete'][self.parts[0]['id']],'reviewed_text_mismatch')
    def test_retry_unanchored_quote_still_blocks(self):
        retry=self.response(self.parts[-1:]);raw=retry.model_dump();raw['segments'][0].update(classification='factual',checks=[{'original_quote':'기사에 없는 인용','claim':'다른 주장','category':'other','verdict':'unverifiable','reason':'확인 불가','suggestion':'','evidence':[]}])
        report,_=self.run_review(self.response(self.parts[:-1]),FinalAIReport.model_validate(raw))
        self.assertTrue(report['unanchored_checks']);self.assertFalse(report_reviewable(report))
    def test_explicit_notes_and_unrequested_results_not_silently_removed(self):
        first=self.response(self.parts[:-1]);first.coverage_notes=['추가 검사 한계가 있음']
        report,_=self.run_review(first,self.response(self.parts[-1:]));self.assertFalse(report_reviewable(report))
        report,_=self.run_review(self.response(self.parts[:-1]),self.response(self.parts[-2:]))
        self.assertFalse(report_reviewable(report))

class ReviewMatchingTests(unittest.TestCase):
    def setUp(self):self.f=human.HumanReviewTests();self.f.setUp()
    def tearDown(self):self.f.tearDown()
    def test_legacy_input_survives_other_edit_ai_claim_and_verdict_change(self):
        f=self.f;item=f.decisions()[0];item.pop('confirmed');item['reason']='입력한 메모'
        item['external_evidence']=[{'source_url':'https://example.org/official','source_label':'공식 자료','quote':'실시일은 10월 3일이다.'}];item['evidence']=[]
        self.assertEqual(f.client.post(f.route+'/human-review-draft',json=dict(f.final_payload(),review=item)).status_code,200)
        # Reproduce old persisted format: claim-dependent key and no stored verdict.
        with Store(f.db).connect() as db:
            row=db.execute('SELECT * FROM human_review_drafts').fetchone();record=json.loads(row['draft_json']);record.pop('verdict')
            old_key=digest([record['segment_id'],record['original_quote'],record['claim']]);record['claim_fingerprint']=old_key
            db.execute('UPDATE human_review_drafts SET claim_fingerprint=?,draft_json=?',(old_key,json.dumps(record)))
        old_parts=draft_segments(f.article['draft']['content'])
        body=copy.deepcopy(f.article['draft']['content']);body['title']+=' 수정'
        new_parts=draft_segments(body)
        self.assertEqual([x['id'] for x in old_parts],[x['id'] for x in new_parts])
        self.assertEqual(sum(x['text']!=y['text'] for x,y in zip(old_parts,new_parts)),1)
        f.save_manual(body)
        def change(data):
            for p in data['segments']:
                for c in p['checks']:c.update(claim='AI가 새 표현으로 요약한 같은 사실',verdict='needs_context')
        f.review(change)
        hint=Store(f.db).get(f.article['id'])['human_review_drafts'][0]
        self.assertEqual(hint['input']['external_evidence'],item['external_evidence']);self.assertEqual(hint['input']['reason'],'입력한 메모')
        self.assertEqual(hint['input']['action'],item['action']);self.assertFalse(hint['input']['confirmed'])
        self.assertIn('AI 판정이 변경',hint['message']);self.assertIn('이전 검토 내용 불러옴',hint['message'])
    def test_latest_saved_input_wins_across_legacy_and_current_keys(self):
        check=self.f.article['final_verification_report']['checks'][0]
        records=[dict(check,claim_fingerprint='old',saved_at='2026-01-01',report_id='r1',source_revision=0,evidence_fingerprint='',input={'action':'confirm_evidence','reason':'이전 메모','evidence':[]}),dict(check,claim_fingerprint=claim_fingerprint(check),saved_at='2026-02-01',report_id='r2',source_revision=0,evidence_fingerprint='',input={'action':'confirm_evidence','reason':'최근 메모','evidence':[]})]
        hint=review_draft_hints(self.f.article['final_verification_report'],list(reversed(records)))[0]
        self.assertEqual(hint['input']['reason'],'최근 메모');self.assertIn('근거가 변경',hint['message'])

if __name__=='__main__':unittest.main()
