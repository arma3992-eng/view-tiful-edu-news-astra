// Run: NODE_PATH=<directory containing jsdom> node tests/test_review_drafts_ui.cjs
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'static/index.html'),'utf8'),{runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(root,'static/final.js'),'utf8'));
let ui,a,requests=[],state={busy:false,unsaved:false,configured:true},fail=false;
const host={getState:()=>state,onChange:()=>ui.updateState(),setBusy(value){state.busy=value;ui.updateState();},openSources(){},
 async api(url,options){requests.push({url,body:JSON.parse(options.body)});if(fail)throw Error('test failure');return {ok:true,draft:{check_id:'c1',input:{...requests.at(-1).body.review,confirmed:false},message:'이전 검토 내용 불러옴'}};}};
ui=w.createFinalReview(host);
function fixture(){return {id:'article-1',revision:1,source_revision:1,plan_revision:1,draft_revision:1,draft:{},draft_status:'needs_revision',rewrite_plan_status:'current',verification_report:{id:'original-1'},final_verification_status:'partial',approval_status:'not_approved',can_review:false,can_export:false,sources:[],human_review_drafts:[],
final_verification_report:{id:'report-1',checked_at:'2026-10-19T00:00:00Z',draft_revision:1,source_revision:1,model:'test',scope:'test',reviewed_count:1,coverage_count:2,approval_blockers:['누락'],coverage:[{id:'s1',text:'수능 연계율 50% 수준으로 유지',location:'본문',classification:'factual',status:'reviewed'}],checks:[{id:'c1',segment_id:'s1',original_quote:'수능 연계율 50% 수준으로 유지',claim:'수능 연계율 50% 유지',verdict:'unverifiable',original_location:'본문',reason:'확인 필요',evidence:[]}],unanchored_checks:[],read_sources:[{source_id:'source',name:'자료',origin:'manual',read_at:'2026-10-19T00:00:00Z',chunks:[{source_id:'source',chunk_id:'chunk',text:'수능 연계율 50% 수준으로 유지',locator:'1쪽'}]}]}};}
function load(value){a=value;ui.loadArticle(a,true);ui.updateState();}
const row=()=>d.querySelector('.human-review-panel');
function fill(){const select=row().querySelector('.human-action');select.value='confirm_evidence';select.dispatchEvent(new w.Event('change'));const chunk=row().querySelector('.human-chunk');chunk.value='0';chunk.dispatchEvent(new w.Event('change'));row().querySelector('.human-quote').value='수능 연계율 50% 수준으로 유지';row().querySelector('.human-reason').value='공식자료와 현재 문장을 직접 확인했습니다.';row().querySelector('.human-confirmed').checked=true;d.getElementById('approval-reviewer').value='검토자';for(const id of ['approval-facts','approval-editorial','approval-rights'])d.getElementById(id).checked=true;ui.updateState();}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 load(fixture());fill();assert.equal(row().disabled,false);assert(d.getElementById('approve-draft').disabled);
 const save=()=>[...row().querySelectorAll('button')].find(b=>b.textContent==='검토 내용 저장').click();
 save();await tick();assert.equal(requests.length,1);assert(!('confirmed' in requests[0].body.review));assert(row().querySelector('.human-draft-status').textContent.includes('임시 저장됨'));
 const hint=structuredClone(a.human_review_drafts[0]);a.final_verification_report.id='report-2';a.final_verification_report.checks[0].id='c99';hint.check_id='c99';hint.input.check_id='c99';a.human_review_drafts=[hint];a.can_review=true;a.final_verification_status='completed';load(a);
 assert.equal(row().querySelector('.human-reason').value,hint.input.reason);assert.equal(row().querySelector('.human-chunk').value,'0');assert.equal(row().querySelector('.human-confirmed').checked,false);assert(d.getElementById('approve-draft').disabled);
 fill();assert.equal(d.getElementById('approve-draft').disabled,false);
 a.human_review_drafts=[{check_id:'c99',input:null,message:'기사 문장이 변경되어 재확인 필요'}];load(a);assert.equal(row().querySelector('.human-reason').value,'');assert(row().querySelector('.human-draft-status').textContent.includes('재확인 필요'));
 a.human_review_drafts=[{...hint,message:'근거가 변경되어 재확인 필요'}];load(a);assert.equal(row().querySelector('.human-confirmed').checked,false);
 for(const verdict of ['mismatch','needs_context','unverifiable']){const p=fixture();p.final_verification_report.checks[0].verdict=verdict;load(p);assert.equal(row().disabled,false);assert(d.getElementById('approve-draft').disabled);}
 a.final_verification_status='stale';load(a);assert(row().disabled);
 load(fixture());a.final_verification_report.checks[0].original_quote='없는 문장';load(a);assert(row().disabled);
 const full=fixture();full.can_review=true;full.final_verification_status='completed';load(full);fill();
 row().querySelector('.human-reason').value='';ui.updateState();assert.equal(d.getElementById('approve-draft').disabled,false);
 const mode=row().querySelector('.human-evidence-mode');mode.value='external';mode.dispatchEvent(new w.Event('change'));
 assert.equal(row().querySelector('.human-confirmed').checked,false);
 row().querySelector('.human-quote').value='실제 공식 자료의 근거 인용 문장';row().querySelector('.human-confirmed').checked=true;ui.updateState();assert(d.getElementById('approve-draft').disabled);
 row().querySelector('.human-external-url').value='https://example.org/official.pdf';ui.updateState();assert.equal(d.getElementById('approve-draft').disabled,false);
 row().querySelector('.human-external-url').value='javascript:alert(1)';ui.updateState();assert(d.getElementById('approve-draft').disabled);
 row().querySelector('.human-external-url').value='';row().querySelector('.human-external-label').value='공식 발표문 2026-10-19 3쪽';ui.updateState();assert.equal(d.getElementById('approve-draft').disabled,false);
 row().querySelector('.human-external-label').dispatchEvent(new w.Event('input'));ui.updateState();assert.equal(row().querySelector('.human-confirmed').checked,false);
 row().querySelector('.human-confirmed').checked=true;save();await tick();
 const extHint=structuredClone(a.human_review_drafts[0]);assert.equal(extHint.input.evidence.length,0);assert.equal(extHint.input.external_evidence.length,1);
 a.final_verification_report.id='external-restored';load(a);assert.equal(row().querySelector('.human-evidence-mode').value,'external');assert.equal(row().querySelector('.human-confirmed').checked,false);assert(row().querySelector('.human-external-label').value.includes('공식'));
 const action=row().querySelector('.human-action');action.value='editorial';action.dispatchEvent(new w.Event('change'));row().querySelector('.human-reason').value='사실 단정 없는 제안으로 확인했습니다.';row().querySelector('.human-confirmed').checked=true;d.getElementById('approval-reviewer').value='검토자';for(const id of ['approval-facts','approval-editorial','approval-rights'])d.getElementById(id).checked=true;ui.updateState();assert.equal(d.getElementById('approve-draft').disabled,false);
 load(fixture());state.unsaved=true;ui.updateState();assert(row().disabled);state.unsaved=false;ui.updateState();fill();fail=true;save();await tick();assert(row().querySelector('.human-draft-status').textContent.includes('실패'));assert.equal(state.busy,false);assert(row().querySelector('.human-reason').value.length>0);
 assert.equal(requests.length,3);console.log('PASS: save/restore/reconfirmation/partial/stale/invalid/evidence warning/failure; no implicit API calls');
})().catch(e=>{console.error(e);process.exitCode=1;});
