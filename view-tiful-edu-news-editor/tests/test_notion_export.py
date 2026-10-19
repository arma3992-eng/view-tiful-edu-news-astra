"""Notion tests: mocked HTTP and temporary databases, no remote writes."""
import copy
import json
import os
import unittest
from unittest.mock import patch
import httpx
import notion_export as ne
import test_final_review as ft
DB='11111111-1111-4111-8111-111111111111'
DS='22222222-2222-4222-8222-222222222222'
PAGE='33333333-3333-4333-8333-333333333333'
URL='https://www.notion.so/'+PAGE.replace('-','')
ENV={'NOTION_API_KEY':'test-secret-key','NOTION_DATABASE_ID':DB,'NOTION_DATA_SOURCE_ID':DS}
def schema():
    fields={'이름':{'type':'title'},'기록일':{'type':'date'},'설명':{'type':'rich_text'},'원문 URL':{'type':'url'}}
    for name,kind,value in [('자료 유형','select','기사'),('구분','select','대표 기사·기획기사'),('기사 분류','multi_select','입시·수능'),('상태','status','보관')]:
        fields[name]={'type':kind,kind:{'options':[{'name':value}]}}
    return fields
class NotionTests(unittest.TestCase):
    for name in ('setUp','tearDown','revisions','ai_response','run_mocked_ai','verified','plan','base','save_plan','body','draft_request','save_manual','final_payload','final_response','review','approve','approved','export'):
        locals()[name]=getattr(ft.FinalReviewTests,name)
    def send(self,approval_id=None):
        return self.client.post(self.route+'/notion',json={'approval_id':approval_id or (self.article.get('approval') or {}).get('id','no-approval')})
    def mock_client(self,calls,fail=None,mutate=None,fail_append=False):
        real=httpx.Client
        def handler(request):
            calls.append(request)
            self.assertEqual(request.headers['Authorization'],'Bearer test-secret-key')
            if (fail and request.method=='POST') or (fail_append and request.method=='PATCH'):
                return httpx.Response(fail or 500,json={'message':'test-secret-key must not leak'})
            if '/databases/' in request.url.path:return httpx.Response(200,json={'data_sources':[{'id':DS}]})
            if '/data_sources/' in request.url.path:
                if mutate:mutate()
                return httpx.Response(200,json={'properties':schema()})
            return httpx.Response(200,json={'id':PAGE,'url':URL})
        return patch('notion_export.httpx.Client',side_effect=lambda **kw:real(transport=httpx.MockTransport(handler),**kw))
    def test_approval_gate_properties_body_and_downloads(self):
        with patch('main.save_to_notion') as save:
            self.assertEqual(self.send().status_code,409);save.assert_not_called()
        self.approved();calls=[];before=copy.deepcopy(self.article)
        with patch.dict(os.environ,ENV),self.mock_client(calls):response=self.send()
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json(),{'ok':True,'url':URL})
        payload=json.loads(next(r.content for r in calls if r.method=='POST'));props=payload['properties']
        self.assertEqual(payload['parent']['data_source_id'],DS)
        self.assertEqual(props['상태']['status']['name'],'보관')
        self.assertEqual(props['자료 유형']['select']['name'],'기사')
        self.assertEqual(props['구분']['select']['name'],'대표 기사·기획기사')
        self.assertEqual(props['기사 분류']['multi_select'][0]['name'],'입시·수능')
        self.assertEqual(props['설명']['rich_text'][0]['text']['content'],'편집실 최종 승인 후 저장')
        self.assertTrue(props['이름']['title'][0]['text']['content'].endswith(' | '+self.article['draft']['content']['title']))
        text=json.dumps(payload['children'],ensure_ascii=False)
        for heading in ('1. 기사 목록·출처','2. 근거자료(Fact Sheet)','3. 최종 기사','4. 수정 내용·이유','5. 실행 시각·수집 건수·실패 항목','7. 최종 승인 정보'):self.assertIn(heading,text)
        self.assertNotIn('6. 독자 가이드',text);self.assertIn('기사 수집 건수: 기록 없음',text)
        self.assertEqual(before,self.article)
        for fmt in ('html','json','docx'):self.assertEqual(self.export(fmt).status_code,200)
        self.assertEqual(self.send('wrong-approval').status_code,409)
        content=copy.deepcopy(self.article['draft']['content']);content['title']+=' 수정'
        self.assertEqual(self.save_manual(content).status_code,200)
        with patch('main.save_to_notion') as save:
            self.assertEqual(self.send().status_code,409);save.assert_not_called()
    def test_config_failure_and_recheck(self):
        self.approved()
        with patch.dict(os.environ,{k:'' for k in ENV}):self.assertEqual(self.send().status_code,502)
        with patch.dict(os.environ,ENV),self.mock_client([],fail=401):
            response=self.send();self.assertEqual(response.status_code,502);self.assertNotIn('test-secret-key',response.text)
        calls=[]
        def change():
            content=copy.deepcopy(self.article['draft']['content']);content['title']+=' 변경';self.save_manual(content)
        with patch.dict(os.environ,ENV),self.mock_client(calls,mutate=change):self.assertEqual(self.send().status_code,409)
        self.assertTrue(all(r.method=='GET' for r in calls))
    def test_long_text_guides_schema_and_partial_failure(self):
        self.approved();article=copy.deepcopy(self.article)
        article['draft']['content']['sections'][0]['text']='긴 본문'*50000
        article['draft']['content']['reader_guide']={'enabled':True,'audiences':[{'id':'school','label':'학교','title':'가이드 제목','sections':[{'id':'check','type':'check','items':[{'text':'학교 가이드','item_ids':[]}]}]}]}
        calls=[]
        with patch.dict(os.environ,ENV),self.mock_client(calls):self.assertEqual(ne.save_to_notion(article,lambda:None)['url'],URL)
        writes=[json.loads(r.content) for r in calls if r.method in ('POST','PATCH')]
        self.assertGreater(len(writes),1)
        text=''.join(x[x['type']]['rich_text'][0]['text']['content'] for w in writes for x in w['children'])
        self.assertIn('긴 본문'*50000,text);self.assertIn('6. 독자 가이드',text)
        for w in writes:
            self.assertLessEqual(len(w['children']),80)
            for b in w['children']:self.assertLessEqual(len(b[b['type']]['rich_text'][0]['text']['content']),1800)
        with patch.dict(os.environ,ENV),self.mock_client([],fail_append=True):
            with self.assertRaisesRegex(ne.NotionExportError,'일부만 저장'):ne.save_to_notion(article,lambda:None)
        data=ne.export_payload(article);bad=schema();bad['상태']['status']['options']=[]
        with self.assertRaises(ne.NotionExportError):ne.properties_for(bad,data,'2026-10-19')
        article['draft']['content']['reader_guide']['enabled']=False
        blocks=ne.build_blocks(article,ne.export_payload(article),ne.datetime.now(ne.timezone.utc))
        self.assertNotIn('학교 가이드',json.dumps(blocks,ensure_ascii=False))
