// Run: NODE_PATH=<directory containing jsdom> node tests/test_review_pending_ui.cjs
// After a draft save, unchanged sentences stay reviewable until re-verification; approval stays blocked.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'static/index.html'),'utf8'),{runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(root,'static/final.js'),'utf8'));
let ui,a,requests=[],state={busy:false,unsaved:false,configured:true},fail=false;
const host={getState:()=>state,onChange:()=>ui.updateState(),setBusy(value){state.busy=value;ui.updateState();},openSources(){},openDraftLocation(){},
 async api(url,options){requests.push({url,body:JSON.parse(options.body)});if(fail)throw Error('test failure');return {ok:true,draft:{check_id:'c1',input:{...requests.at(-1).body.review,confirmed:false},message:'이전 검토 내용 불러옴'}};}};
ui=w.createFinalReview(host);
function fixture(){return {id:'article-1',revision:1,source_revision:1,plan_revision:1,draft_revision:1,draft:{},draft_status:'needs_revision',rewrite_plan_status:'current',verification_report:{id:'original-1'},final_verification_status:'partial',approval_status:'not_approved',can_review:false,can_export:false,sources:[],human_review_drafts:[],
final_verification_report:{id:'report-1',checked_at:'2026-10-19T00:00:00Z',draft_revision:1,source_revision:1,model:'test',scope:'test',reviewed_count:1,coverage_count:2,approval_blockers:['누락'],coverage:[{id:'s1',text:'수능 연계율 50% 수준으로 유지',location:'본문',classification:'factual',status:'reviewed'}],checks:[{id:'c1',segment_id:'s1',original_quote:'수능 연계율 50% 수준으로 유지',claim:'수능 연계율 50% 유지',verdict:'unverifiable',original_location:'본문',reason:'확인 필요',evidence:[]}],unanchored_checks:[],read_sources:[{source_id:'source',name:'자료',origin:'manual',read_at:'2026-10-19T00:00:00Z',chunks:[{source_id:'source',chunk_id:'chunk',text:'수능 연계율 50% 수준으로 유지',locator:'1쪽'}]}]}};}
function load(value){a=value;ui.loadArticle(a,true);ui.updateState();}
const row=()=>d.querySelector('.human-review-panel');
function fill(){const select=row().querySelector('.human-action');select.value='confirm_evidence';select.dispatchEvent(new w.Event('change'));const chunk=row().querySelector('.human-chunk');chunk.value='0';chunk.dispatchEvent(new w.Event('change'));row().querySelector('.human-quote').value='수능 연계율 50% 수준으로 유지';row().querySelector('.human-reason').value='공식자료와 현재 문장을 직접 확인했습니다.';row().querySelector('.human-confirmed').checked=true;d.getElementById('approval-reviewer').value='검토자';for(const id of ['approval-facts','approval-editorial','approval-rights'])d.getElementById(id).checked=true;ui.updateState();}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function pendingFixture(){
 const p=fixture(),r=p.final_verification_report;p.final_verification_status='stale';p.draft_status='needs_verification';p.draft_revision=2;
 r.coverage.push({id:'s2',text:'응시 인원은 224명이다.',location:'제목',classification:'factual',status:'reviewed'});
 r.checks.push({id:'c2',segment_id:'s2',original_quote:'응시 인원은 224명이다.',claim:'응시 인원 224명',verdict:'unverifiable',original_location:'제목',reason:'확인 필요',evidence:[]});
 p.pending_review_checks=['c1'];return p;}
const rowOf=id=>d.querySelector('.human-review-panel[data-check-id="'+id+'"]');
(async()=>{
 load(pendingFixture());
 assert.equal(rowOf('c1').disabled,false,'unchanged sentence stays reviewable');
 assert.equal(rowOf('c2').disabled,true,'edited sentence is locked');
 assert(rowOf('c1').querySelector('.human-state').textContent.includes('재검증 대기'));
 assert(rowOf('c2').querySelector('.human-state').textContent.includes('문장 수정됨'));
 assert(d.getElementById('final-help').textContent.includes('1개는 재검증 전에도'));
 fill();ui.updateState();
 assert.equal(rowOf('c1').querySelector('.human-confirmed').disabled,true,'confirmation waits for re-verification');
 assert.equal(rowOf('c1').querySelector('.human-confirmed').checked,false);
 assert(d.getElementById('approve-draft').disabled,'approval still needs re-verification');
 [...rowOf('c1').querySelectorAll('button')].find(b=>b.textContent==='검토 내용 저장').click();await tick();
 assert.equal(requests.length,1);assert.equal(requests[0].body.review.check_id,'c1');
 assert(rowOf('c1').querySelector('.human-draft-status').textContent.includes('재검증 후'));
 rowOf('c1').querySelector('.human-quote').value='수능 연계율 50%';
 assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,2,'pending row auto-saved');
 assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,2,'locked row is never sent');
 const current=pendingFixture();current.final_verification_status='completed';current.pending_review_checks=[];load(current);
 assert.equal(rowOf('c1').querySelector('.human-confirmed').disabled,false,'confirmation available after re-verification');
 const sourceChanged=pendingFixture();sourceChanged.pending_review_checks=[];load(sourceChanged);
 assert(rowOf('c1').disabled && rowOf('c2').disabled,'other staleness locks all rows');
 console.log('PASS: pending rows reviewable/savable, edited rows locked, confirmation and approval wait for re-verification');
})().catch(e=>{console.error(e);process.exitCode=1;});
