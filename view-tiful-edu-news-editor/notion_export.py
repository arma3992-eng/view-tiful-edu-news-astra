"""Approved article snapshots to Notion; no local persistence or AI calls."""
import json
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
from urllib.parse import urlsplit
import httpx
from exporting import export_payload
from reader_guide import LABELS

VERSION = "2025-09-03"
KINDS = {"fact":"사실·과거 사례·트렌드", "analysis":"편집자 분석", "opinion":"기자 의견·주장", "guidance":"학습 제안", "interview":"인터뷰·취재"}
VERDICTS = {"match":"일치", "mismatch":"불일치", "needs_context":"조건 보완 필요", "unverifiable":"확인 불가"}

class NotionExportError(Exception):
    pass


def rich(text):
    text = str(text)
    return [{"type":"text", "text":{"content":text[i:i+1800]}} for i in range(0, len(text), 1800)]


def build_blocks(article, data, saved_at):
    blocks = []
    def add(text, kind="paragraph"):
        text = str(text or "기록 없음")
        for i in range(0, len(text), 1800):
            blocks.append({"object":"block", "type":kind, kind:{"rich_text":rich(text[i:i+1800])}})
    def heading(text): add(text, "heading_2")
    heading("1. 기사 목록·출처")
    add(data['original']['title'])
    add("원문 URL: " + (data['original']['url'] or "기록 없음"))
    sources = {source['id']: source for source in article.get('evidence_sources', article.get('sources', []))}
    sources.update({source['id']: source for source in data['sources']})
    for source in sources.values():
        add(" · ".join(str(source.get(k) or "기록 없음") for k in ('id','name','url','locator')))
        if source.get('attachment_name'): add("첨부 자료: " + source['attachment_name'])
    if not sources: add("근거 출처: 기록 없음")
    heading("2. 근거자료(Fact Sheet)")
    checks = (article.get('verification_report') or {}).get('checks', [])
    if not checks: add("기록 없음")
    for check in checks:
        add(check.get('claim') or check.get('original_quote'))
        add("판정: " + VERDICTS.get(check.get('verdict'), str(check.get('verdict') or '기록 없음')))
        add("검증 이유: " + (check.get('reason') or '기록 없음'))
        for evidence in check.get('evidence', []):
            add("근거 ID: " + str(evidence.get('source_id') or '기록 없음') + " · 인용: " + (evidence.get('quote') or '기록 없음'))
    heading("3. 최종 기사")
    content = data['article']
    add(content['category']); add(content['title'], 'heading_3')
    for summary in content['summary']: add(summary)
    for section in content['sections']:
        add(KINDS[section['kind']]); add(section['heading'], 'heading_3'); add(section['text'])
    heading("4. 수정 내용·이유")
    plan = (article.get('rewrite_plan') or {}).get('content', {})
    decisions = [x for x in plan.get('decisions', []) if x.get('revised_text') or x.get('note') or x.get('action') in ('revise','hold','exclude')]
    if not decisions: add("항목별 수정 기록: 기록 없음")
    actions = {'include':'포함','revise':'수정','hold':'보류','exclude':'제외'}
    for item in decisions:
        add(str(item.get('claim_id')) + ' · ' + actions.get(item.get('action'), '기록 없음'))
        add('수정 내용: ' + (item.get('revised_text') or '기록 없음')); add('이유: ' + (item.get('note') or '기록 없음'))
    add('편집 요청: ' + (plan.get('editor_note') or '기록 없음'))
    add('독자 가이드 수정 메모: ' + (article['draft'].get('metadata', {}).get('reader_guide_note') or '기록 없음'))
    for resolution in data['approval'].get('resolutions', []):
        add('사람 검토: ' + str(resolution.get('check_id') or '기록 없음') + ' · ' + (resolution.get('reason') or '기록 없음'))
    heading("5. 실행 시각·수집 건수·실패 항목")
    add('Notion 저장 요청 시각: ' + saved_at.isoformat())
    add('원문 검증 시각: ' + str((article.get('verification_report') or {}).get('checked_at') or '기록 없음'))
    add('최종 검증 시각: ' + str(data['verification'].get('checked_at') or '기록 없음'))
    add('기사 수집 건수: 기록 없음')
    failures = [s for s in article['final_verification_report'].get('read_sources', []) if s.get('error')]
    for source in failures: add('자료 읽기 실패: ' + str(source.get('name') or source.get('source_id')) + ' · ' + str(source['error']))
    if not failures: add('자료 읽기 실패 항목: 기록 없음')
    guide = content.get('reader_guide')
    if guide and guide['enabled']:
        heading('6. 독자 가이드')
        for audience in guide['audiences']:
            add(audience['label'] + ' · ' + audience['title'], 'heading_3')
            for section in audience['sections']:
                add(LABELS[section['type']])
                for item in section['items']: add(item['text'], 'bulleted_list_item')
    heading('7. 최종 승인 정보')
    approval = data['approval']
    add('최종 검토자: ' + approval['reviewer']); add('승인 시각: ' + approval['approved_at'])
    add('기사 ID: ' + data['article_id']); add('기사 버전: ' + str(approval['draft_revision']))
    add('승인 ID: ' + approval['id'])
    return blocks


def properties_for(schema, data, day):
    values = {'이름':day+' | '+data['article']['title'], '자료 유형':'기사', '구분':'대표 기사·기획기사',
              '기록일':day, '기사 분류':data['article']['category'], '상태':'보관',
              '설명':'편집실 최종 승인 후 저장', '원문 URL':data['original']['url'] or None}
    properties = {}
    for name, value in values.items():
        field = schema.get(name, {}); kind = field.get('type')
        allowed = {'이름':('title',), '기록일':('date',), '원문 URL':('url',)}.get(name, ('select','multi_select','status','rich_text'))
        if kind not in allowed:
            raise NotionExportError(f"Edu_news DB의 '{name}' 속성 이름·유형을 확인하세요.")
        if kind in ('select','multi_select','status'):
            options = field.get(kind, {}).get('options', [])
            if not any(x.get('name') == value for x in options):
                raise NotionExportError(f"Edu_news DB의 '{name}' 속성에 '{value}' 선택값을 먼저 추가하세요.")
            properties[name] = {kind:[{'name':value}] if kind=='multi_select' else {'name':value}}
        elif kind in ('title','rich_text'): properties[name] = {kind:rich(value or '')}
        elif kind=='date': properties[name] = {'date':{'start':value}}
        else:
            if value and (len(value)>2000 or urlsplit(value).scheme not in ('http','https')):
                raise NotionExportError('원문 URL은 2,000자 이하의 http/https 주소여야 합니다.')
            properties[name] = {'url':value}
    return properties


def identifier(value, name):
    try: return str(UUID(value))
    except (ValueError, TypeError, AttributeError): raise NotionExportError(name + '에는 올바른 Notion ID를 입력하세요.') from None


def save_to_notion(article, check_current):
    token = os.environ.get('NOTION_API_KEY', '').strip()
    database = os.environ.get('NOTION_DATABASE_ID', '').strip()
    source = os.environ.get('NOTION_DATA_SOURCE_ID', '').strip()
    if not token or not (database or source):
        raise NotionExportError('.env의 NOTION_API_KEY와 NOTION_DATABASE_ID 또는 NOTION_DATA_SOURCE_ID를 설정하고 서버를 재시작하세요.')
    if database: database = identifier(database, 'NOTION_DATABASE_ID')
    if source: source = identifier(source, 'NOTION_DATA_SOURCE_ID')
    data = export_payload(article)
    saved_at = datetime.now(timezone(timedelta(hours=9)))
    blocks = build_blocks(article, data, saved_at)
    def request(client, method, path, payload=None):
        try:
            response = client.request(method, path, json=payload)
        except httpx.HTTPError:
            raise NotionExportError('Notion 통신 결과를 확인하지 못했습니다. 재시도 전에 DB에 페이지가 생성되었는지 확인하세요.') from None
        if response.is_error:
            messages = {401:'API 키를 확인하세요.',403:'DB 연결 권한 또는 Notion 사용량 제한을 확인하세요.',404:'DB·데이터 소스 ID와 연결 공유 권한을 확인하세요.',429:'요청 제한입니다. 잠시 후 다시 시도하세요.'}
            raise NotionExportError('Notion 저장 실패 ('+str(response.status_code)+'). '+messages.get(response.status_code, 'DB 속성 설정과 Notion 상태를 확인하세요.'))
        try: return response.json()
        except ValueError: raise NotionExportError('Notion 응답을 읽지 못했습니다. 재시도 전에 DB를 확인하세요.') from None
    with httpx.Client(base_url='https://api.notion.com/v1/', headers={'Authorization':'Bearer '+token,'Notion-Version':VERSION}, timeout=30) as client:
        if database:
            db = request(client,'GET','databases/'+database)
            ids = [identifier(x['id'], '데이터 소스 ID') for x in db.get('data_sources', [])]
            if source and source not in ids: raise NotionExportError('설정한 데이터 소스가 NOTION_DATABASE_ID에 속하지 않습니다.')
            if not source:
                if len(ids)!=1: raise NotionExportError('데이터 소스가 여러 개이거나 없습니다. NOTION_DATA_SOURCE_ID를 지정하세요.')
                source = ids[0]
        schema = request(client,'GET','data_sources/'+source)
        properties = properties_for(schema.get('properties', {}), data, saved_at.date().isoformat())
        # Keep each request below Notion's block-count and byte limits.
        batches = []; batch = []
        for block in blocks:
            candidate = batch + [block]
            if batch and (len(candidate)>80 or len(json.dumps(candidate,ensure_ascii=False).encode())>300000):
                batches.append(batch); batch=[]
            batch.append(block)
        if batch: batches.append(batch)
        check_current()
        page = request(client,'POST','pages',{'parent':{'type':'data_source_id','data_source_id':source},'properties':properties,'children':batches[0]})
        page_id = identifier(page.get('id'), '생성된 페이지 ID')
        url = page.get('url', '')
        if urlsplit(url).scheme!='https': raise NotionExportError('페이지 생성 응답에 URL이 없습니다. Notion DB를 확인하세요.')
        try:
            for batch in batches[1:]: request(client,'PATCH','blocks/'+page_id+'/children',{'children':batch})
        except NotionExportError as error:
            raise NotionExportError(str(error)+' 본문 일부만 저장되었을 수 있습니다. 페이지를 확인하세요: '+url) from None
    return {'ok':True,'url':url}
