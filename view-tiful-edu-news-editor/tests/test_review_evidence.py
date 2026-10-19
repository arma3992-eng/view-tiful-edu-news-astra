"""Two evidence routes retain traceability and all approval coverage gates."""
import copy
import unittest
from unittest.mock import patch
import test_human_review as human
from storage import Store
from human_review import HumanResolution

class EvidenceRouteTests(unittest.TestCase):
    def setUp(self): self.f=human.HumanReviewTests();self.f.setUp()
    def tearDown(self): self.f.tearDown()
    def external(self, label=False):
        values=self.f.decisions()
        for item in values:
            item['evidence']=[];item.pop('reason')
            item['external_evidence']=[{'source_url':'' if label else 'https://example.org/official.pdf','source_label':'교육기관 발표문 2026-10-19 3쪽' if label else '', 'quote':'실시일은 10월 3일이다.'}]
        return values
    def test_system_reason_optional_and_old_shape_preserved(self):
        f=self.f;items=f.decisions()
        for x in items: x.pop('reason')
        self.assertEqual(f.approve(resolutions=items).status_code,200)
        self.assertTrue(all('external_evidence' not in x and x['reason'] for x in f.article['approval']['resolutions']))
        self.assertTrue(Store(f.db).get(f.article['id'])['can_export'])
    def test_external_url_and_label_approval_export(self):
        f=self.f
        for label in (False,True):
            if label: f.review(f.unknown)
            items=self.external(label)
            before=copy.deepcopy(f.article['final_verification_report'])
            self.assertEqual(f.approve(resolutions=items).status_code,200)
            self.assertEqual(f.article['final_verification_report'],before)
            self.assertTrue(Store(f.db).get(f.article['id'])['can_export'])
            for fmt in ('html','json','docx'): self.assertEqual(f.export(fmt).status_code,200)
            data=f.export().json()
            self.assertTrue(all(x['origin']=='human_external' for x in data['human_review']['evidence']))
            with patch('main.save_to_notion',return_value={'ok':True,'url':'https://www.notion.so/test'}):
                self.assertEqual(f.client.post(f.route+'/notion',json={'approval_id':f.article['approval']['id']}).status_code,200)
    def test_missing_locator_quote_confirmation_and_unsafe_url_rejected(self):
        for change in ({'source_url':'','source_label':''},{'quote':'     '},{'source_url':'javascript:alert(1)'},{'source_url':'data:text/html,test'},{'source_url':'https://user:pass@example.org'}):
            items=self.external();items[0]['external_evidence'][0].update(change)
            self.assertEqual(self.f.approve(resolutions=items).status_code,422)
        items=self.external();items[0]['confirmed']=False
        self.assertEqual(self.f.approve(resolutions=items).status_code,422)
        items=self.f.decisions();items[0].update(evidence=[],reason='직접 확인했습니다.')
        self.assertEqual(self.f.approve(resolutions=items).status_code,422)
    def test_partial_stale_foreign_and_mixed_paths_blocked(self):
        f=self.f;items=self.external();items[0]['check_id']='foreign'
        self.assertEqual(f.approve(resolutions=items).status_code,422)
        items=self.external();items[0]['evidence']=f.decisions()[0]['evidence']
        self.assertEqual(f.approve(resolutions=items).status_code,422)
        def partial(d): f.unknown(d);d['segments'][0].update(classification='factual',checks=[])
        f.review(partial)
        self.assertEqual(f.approve(resolutions=self.external()).status_code,409)
        f.save_manual()
        self.assertEqual(f.approve(resolutions=self.external()).status_code,409)
    def test_editorial_reason_and_mismatch_gate(self):
        f=self.f
        items=f.decisions()
        for x in items: x.update(action='editorial',evidence=[],reason='사실 단정 없는 표현인지 직접 검토했습니다.')
        invalid=copy.deepcopy(items);invalid[0]['reason']=' '
        self.assertEqual(f.approve(resolutions=invalid).status_code,422)
        self.assertEqual(f.approve(resolutions=items).status_code,200)
        def mismatch(d):
            for p in d['segments']:
                for c in p['checks']: c['verdict']='mismatch'
        f.review(mismatch)
        items=f.decisions()
        for x in items:x.update(action='editorial',evidence=[],reason='편집자의 의견으로 표시')
        self.assertEqual(f.approve(resolutions=items).status_code,422)
    def test_external_temporary_restore_unconfirmed(self):
        f=self.f;item=self.external()[0];item.pop('confirmed');item['reason']=''
        response=f.client.post(f.route+'/human-review-draft',json=dict(f.final_payload(),review=item))
        self.assertEqual(response.status_code,200,response.text)
        body=copy.deepcopy(f.article['draft']['content']);body['title']+=' 변경'
        f.save_manual(body);f.review(f.unknown)
        hint=Store(f.db).get(f.article['id'])['human_review_drafts'][0]
        self.assertEqual(hint['input']['external_evidence'],item['external_evidence'])
        self.assertFalse(hint['input']['confirmed'])
        self.assertEqual(f.approve().status_code,409)
    def test_old_record_roundtrip_remains_approved(self):
        f=self.f;f.human_approved()
        before=copy.deepcopy(f.article['approval'])
        after=Store(f.db).get(f.article['id'])
        self.assertEqual(after['approval'],before);self.assertTrue(after['can_export'])

if __name__=='__main__':unittest.main()
