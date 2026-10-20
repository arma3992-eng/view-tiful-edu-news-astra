"""Temporary input is never an approval resolution."""
import copy
import json
import unittest
from unittest.mock import patch
import test_human_review as human
from storage import Store
from review_drafts import claim_fingerprint, review_draft_hints

class ReviewDraftTests(unittest.TestCase):
    def setUp(self):
        self.f=human.HumanReviewTests();self.f.setUp()
    def tearDown(self): self.f.tearDown()
    def save(self,item=None,payload=None):
        f=self.f;item=copy.deepcopy(item or f.decisions()[0]);item.pop('confirmed',None)
        return f.client.post(f.route+'/human-review-draft',json=payload or dict(f.final_payload(),review=item))
    def records(self):
        with Store(self.f.db).connect() as db:
            return [json.loads(r['draft_json']) for r in db.execute('SELECT draft_json FROM human_review_drafts')]
    def test_partial_save_keeps_approval_blocked(self):
        f=self.f
        def change(d):
            f.unknown(d);d['segments'][0].update(classification='factual',checks=[])
        f.review(change);before=copy.deepcopy(f.article['final_verification_report'])
        self.assertEqual(self.save().status_code,200)
        a=Store(f.db).get(f.article['id'])
        self.assertEqual(a['final_verification_report'],before)
        self.assertFalse(a['can_review'])
        self.assertEqual(f.approve(resolutions=f.decisions()).status_code,409)
        self.assertIsNone(a['approval'])
        self.assertFalse(a['human_review_drafts'][0]['input']['confirmed'])
    def test_other_edit_restores_unconfirmed_and_exports_work(self):
        f=self.f
        for item in f.decisions(): self.assertEqual(self.save(item).status_code,200)
        body=copy.deepcopy(f.article['draft']['content']);body['title']+=' 수정'
        f.save_manual(body);f.review(f.unknown)
        a=Store(f.db).get(f.article['id'])
        self.assertEqual(len(a['human_review_drafts']),2)
        self.assertTrue(all(not x['input']['confirmed'] for x in a['human_review_drafts']))
        self.assertEqual(f.approve().status_code,409)
        f.human_approved()
        self.assertTrue(all(set(r)=={'check_id','action','reason','confirmed','evidence'} for r in f.article['approval']['resolutions']))
        for fmt in ('html','json','docx'): self.assertEqual(f.export(fmt).status_code,200)
        with patch('main.save_to_notion',return_value={'ok':True,'url':'https://www.notion.so/test'}):
            self.assertEqual(f.client.post(f.route+'/notion',json={'approval_id':f.article['approval']['id']}).status_code,200)
    def test_changed_sentence_not_restored_deleted_claim_excluded(self):
        f=self.f;self.save();body=copy.deepcopy(f.article['draft']['content'])
        body['summary']=[x.replace('10월 3일','10월 3일 오전') for x in body['summary']]
        for section in body['sections']: section['text']=section['text'].replace('10월 3일','10월 3일 오전')
        f.save_manual(body);f.review(f.unknown)
        hints=Store(f.db).get(f.article['id'])['human_review_drafts']
        self.assertTrue(hints);self.assertTrue(all(x['input'] is None for x in hints))
        self.assertIn('재확인 필요',hints[0]['message'])
        report=copy.deepcopy(f.article['final_verification_report']);report['checks']=[]
        self.assertEqual(review_draft_hints(report,self.records()),[]);self.assertTrue(self.records())
    def test_fingerprint_id_changes_and_evidence_changes(self):
        f=self.f;self.save();records=self.records();report=copy.deepcopy(f.article['final_verification_report'])
        c=report['checks'][0];key=claim_fingerprint(c);c['id']='draft_claim_99';c['original_quote']=' '+c['original_quote']+'\n'
        self.assertEqual(claim_fingerprint(c),key)
        h=review_draft_hints(report,records)[0]
        self.assertEqual(h['input']['check_id'],'draft_claim_99');self.assertFalse(h['input']['confirmed'])
        for mode in ('revision','text'):
            changed=copy.deepcopy(report)
            if mode=='revision': changed['source_revision']+=1
            else: changed['read_sources'][0]['chunks'][0]['text']+=' changed'
            self.assertIn('근거가 변경',review_draft_hints(changed,records)[0]['message'])
        c['claim']+=' 다른 주장'
        self.assertIsNotNone(review_draft_hints(report,records)[0]['input'])
    def test_stale_invalid_and_race_rejected(self):
        f=self.f;item=copy.deepcopy(f.decisions()[0]);item['check_id']='foreign'
        self.assertEqual(self.save(item).status_code,409)
        item=copy.deepcopy(f.decisions()[0]);item['evidence'][0]['chunk_id']='foreign'
        self.assertEqual(self.save(item).status_code,422)
        stale=dict(f.final_payload(),review={k:v for k,v in f.decisions()[0].items() if k!='confirmed'})
        f.save_manual();self.assertEqual(self.save(payload=stale).status_code,409)
        # Draft saved but the sentence is unchanged: input may be kept until re-verification (3rd patch).
        self.assertEqual(self.save().status_code,200)
        f.review(f.unknown);real=Store.save_review_draft
        def race(store,*args,**kwargs):
            f.save_manual();return real(store,*args,**kwargs)
        with patch.object(Store,'save_review_draft',race): self.assertEqual(self.save().status_code,409)
    def test_incomplete_upsert_isolation_and_migration(self):
        f=self.f;item={'check_id':f.decisions()[0]['check_id'],'action':'confirm_evidence','reason':'','evidence':[]}
        with Store(f.db).connect() as db: db.execute('DROP TABLE human_review_drafts')
        Store(f.db)
        self.assertEqual(self.save(item).status_code,200);item['reason']='메모 수정';self.assertEqual(self.save(item).status_code,200)
        self.assertEqual(len(self.records()),1)
        self.assertEqual(Store(f.db).get(f.article['id'])['human_review_drafts'][0]['input']['reason'],'메모 수정')
        self.assertEqual(Store(f.db).create('다른 기사','')['human_review_drafts'],[])

if __name__=='__main__': unittest.main()
