// Run: NODE_PATH=<directory containing jsdom> node tests/test_review_keep_ui.cjs
// Item review input is saved before the draft/plan version changes or the editor jumps to the draft.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'static/index.html'),'utf8'),{runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(root,'static/final.js'),'utf8'));
let opened=0,confirms=[],ui,a,requests=[],state={busy:false,unsaved:false,configured:true},fail=false;
const host={getState:()=>state,onChange:()=>ui.updateState(),setBusy(value){state.busy=value;ui.updateState();},openSources(){},openDraftLocation(){opened++;},
 async api(url,options){requests.push({url,body:JSON.parse(options.body)});if(fail)throw Error('test failure');return {ok:true,draft:{check_id:'c1',input:{...requests.at(-1).body.review,confirmed:false},message:'이전 검토 내용 불러옴'}};}};
ui=w.createFinalReview(host);
function fixture(){return {id:'article-1',revision:1,source_revision:1,plan_revision:1,draft_revision:1,draft:{},draft_status:'needs_revision',rewrite_plan_status:'current',verification_report:{id:'original-1'},final_verification_status:'partial',approval_status:'not_approved',can_review:false,can_export:false,sources:[],human_review_drafts:[],
final_verification_report:{id:'report-1',checked_at:'2026-10-19T00:00:00Z',draft_revision:1,source_revision:1,model:'test',scope:'test',reviewed_count:1,coverage_count:2,approval_blockers:['누락'],coverage:[{id:'s1',text:'수능 연계율 50% 수준으로 유지',location:'본문',classification:'factual',status:'reviewed'}],checks:[{id:'c1',segment_id:'s1',original_quote:'수능 연계율 50% 수준으로 유지',claim:'수능 연계율 50% 유지',verdict:'unverifiable',original_location:'본문',reason:'확인 필요',evidence:[]}],unanchored_checks:[],read_sources:[{source_id:'source',name:'자료',origin:'manual',read_at:'2026-10-19T00:00:00Z',chunks:[{source_id:'source',chunk_id:'chunk',text:'수능 연계율 50% 수준으로 유지',locator:'1쪽'}]}]}};}
function load(value){a=value;ui.loadArticle(a,true);ui.updateState();}
const row=()=>d.querySelector('.human-review-panel');
function fill(){const select=row().querySelector('.human-action');select.value='confirm_evidence';select.dispatchEvent(new w.Event('change'));const chunk=row().querySelector('.human-chunk');chunk.value='0';chunk.dispatchEvent(new w.Event('change'));row().querySelector('.human-quote').value='수능 연계율 50% 수준으로 유지';row().querySelector('.human-reason').value='공식자료와 현재 문장을 직접 확인했습니다.';row().querySelector('.human-confirmed').checked=true;d.getElementById('approval-reviewer').value='검토자';for(const id of ['approval-facts','approval-editorial','approval-rights'])d.getElementById(id).checked=true;ui.updateState();}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
w.confirm=text=>{confirms.push(text);return confirmAnswer;};let confirmAnswer=false;
(async()=>{
 load(fixture());assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,0,'untouched rows are not saved');
 fill();assert.equal(await ui.protectReviews('초안을 저장하면'),true);assert.equal(requests.length,1);
 assert(!('confirmed' in requests[0].body.review));assert(row().querySelector('.human-draft-status').textContent.includes('자동 임시 저장됨'));
 assert(d.getElementById('final-message').textContent.includes('1개를 임시 저장'));
 assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,1,'already saved input is not sent again');
 row().querySelector('.human-quote').value='수능 연계율 50% 수준';
 const edit=[...d.querySelectorAll('.text-button')].find(b=>b.textContent==='해당 기사 부분 수정');edit.click();await tick();await tick();
 assert.equal(requests.length,2);assert.equal(opened,1);assert.equal(state.busy,false);
 row().querySelector('.human-quote').value='수능 연계율 50%';fail=true;
 confirmAnswer=false;assert.equal(await ui.protectReviews('초안을 저장하면'),false);assert(confirms.at(-1).includes('1개를 임시 저장하지 못했습니다'));
 confirmAnswer=true;assert.equal(await ui.protectReviews('초안을 저장하면'),true);fail=false;
 const hinted=fixture();hinted.human_review_drafts=[{check_id:'c1',message:'이전 검토 내용 불러옴',input:{check_id:'c1',action:'confirm_evidence',reason:'',confirmed:false,
  evidence:[{source_id:'source',chunk_id:'chunk',quote:'수능 연계율 50% 수준으로 유지'}],external_evidence:[]}}];
 const before=requests.length;load(hinted);assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,before,'restored input is not re-sent');
 const approved=fixture();approved.approval_status='approved';approved.approval={id:'ap',reviewer:'검토자',approved_at:'2026-10-19T00:00:00Z',draft_revision:1,source_revision:1,resolutions:[]};
 load(approved);assert.equal(await ui.protectReviews(),true);assert.equal(requests.length,before);
 console.log('PASS: auto-save before draft changes/jump, no repeat saves, failure confirmation, restored/approved rows untouched');
})().catch(e=>{console.error(e);process.exitCode=1;});
