/* 저장된 초안 전체의 검증, 현재 버전 승인, 승인된 기사 다운로드. */
window.createFinalReview = function (host) {
  "use strict";
  const $ = id => document.getElementById(id);
  let article = null, stamp = "", verifying = false, baselineForm = "";
  const reviewRows = new Map(); let chunks = [];
  const labels = {match:"일치",mismatch:"불일치",needs_context:"조건 보완 필요",unverifiable:"확인 불가"};
  const classes = {factual:"사실 포함",mixed:"사실·의견 함께 포함",editorial:"AI 분류: 사실 단정 없는 표현",unknown:"범위 확인 필요"};
  const time = value => new Intl.DateTimeFormat("ko-KR", {timeZone:"Asia/Seoul",dateStyle:"short",timeStyle:"short"}).format(new Date(value));
  function node(tag, text, className = "") {
    const item = document.createElement(tag); item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function tell(text, error = false) {$("final-message").textContent=text;$("final-message").classList.toggle("error",error);}
  function field(label, tag, className, value = "") {
    const box=node("label",label), input=document.createElement(tag);input.className=className;input.value=value;
    if(tag==="textarea")input.classList.add("small-textarea");box.append(input);return {box,input};
  }
  const normalize = text => text.normalize("NFC").replace(/\s+/g," ").trim();
  function readRows() {
    return [...reviewRows].map(([id,row])=>{
      const option=chunks[Number(row.querySelector(".human-chunk").value)];
      return {check_id:id,action:row.querySelector(".human-action").value,reason:row.querySelector(".human-reason").value,
        confirmed:row.querySelector(".human-confirmed").checked,
        evidence:row.querySelector(".human-action").value==="confirm_evidence" && row.querySelector(".human-chunk").value!=="" && option ?
          [{source_id:option.source_id,chunk_id:option.chunk_id,quote:row.querySelector(".human-quote").value}] : []};
    });
  }
  function rowComplete(item) {
    if(!item.confirmed || item.reason.trim().length<5)return false;
    if(item.action==="editorial")return true;
    if(item.action!=="confirm_evidence" || !item.evidence.length)return false;
    return item.evidence.every(citation=>{
      const source=chunks.find(chunk=>chunk.source_id===citation.source_id && chunk.chunk_id===citation.chunk_id);
      return source && normalize(citation.quote).length>=5 && normalize(source.text).includes(normalize(citation.quote));
    });
  }
  function formSnapshot() {
    return JSON.stringify({reviewer:$("approval-reviewer").value,rows:readRows(),
      checks:["approval-facts","approval-editorial","approval-rights"].map(id=>$(id).checked)});
  }
  function hasUnsaved() {return !!(article && article.final_verification_report && article.approval_status!=="approved" && baselineForm && baselineForm!==formSnapshot());}
  function renderHumanReview(card, check, saved) {
    const row=node("fieldset","","human-review-panel");row.dataset.checkId=check.id;reviewRows.set(check.id,row);
    row.append(node("h4","항목별 사람 검토"),node("p","검토 미완료","human-state secondary"));
    const action=field("검토 방법","select","human-action");
    const options={"":"검토 방법 선택",confirm_evidence:"실제 근거로 직접 확인",editorial:"사실 단정 없는 의견·분석·제안으로 확인",edit:"기사 문장 수정·제외 후 재검증"};
    if(check.verdict==="mismatch")delete options.editorial;
    for(const [key,label]of Object.entries(options)){const option=node("option",label);option.value=key;action.input.append(option);}
    action.input.value=saved?saved.action:"";row.append(action.box);
    const body=node("fieldset","","human-decision-body");
    const reason=field("직접 확인한 내용·판단 이유 · 5자 이상","textarea","human-reason",saved?saved.reason:"");reason.input.maxLength=2000;
    body.append(reason.box);
    const evidence=node("div","","human-evidence");
    const choice=field("이번 보고서에서 실제 읽은 근거 발췌","select","human-chunk");
    const placeholder=node("option","자료·쪽·발췌를 선택하세요");placeholder.value="";choice.input.append(placeholder);
    chunks.forEach((chunk,index)=>{const option=node("option",chunk.source_name+" · "+chunk.locator);option.value=String(index);choice.input.append(option);});
    const sourceText=field("읽은 자료 내용 · 필요한 문장을 드래그해 선택","textarea","human-chunk-text");sourceText.input.readOnly=true;
    const quote=field("사람이 확인한 실제 근거 인용","textarea","human-quote",saved && saved.evidence[0]?saved.evidence[0].quote:"");quote.input.maxLength=1500;
    const copy=node("button","선택 문장 또는 이 발췌를 근거 인용에 넣기","button");copy.type="button";
    if(saved && saved.evidence[0]) {
      const citation=saved.evidence[0], index=chunks.findIndex(chunk=>chunk.source_id===citation.source_id && chunk.chunk_id===citation.chunk_id);
      choice.input.value=index<0?"":String(index);sourceText.input.value=index<0?"":chunks[index].text;
    }
    choice.input.addEventListener("change",()=>{sourceText.input.value=choice.input.value===""?"":chunks[Number(choice.input.value)].text;quote.input.value="";row.querySelector(".human-confirmed").checked=false;host.onChange();});
    copy.addEventListener("click",()=>{const input=sourceText.input;quote.input.value=(input.selectionEnd>input.selectionStart?input.value.slice(input.selectionStart,input.selectionEnd):input.value).trim();row.querySelector(".human-confirmed").checked=false;host.onChange();});
    quote.input.addEventListener("input",()=>{row.querySelector(".human-confirmed").checked=false;});
    evidence.append(choice.box,sourceText.box,copy,quote.box);body.append(evidence);
    const confirm=node("label","","review-checkbox"), checkbox=document.createElement("input"), confirmText=node("span","");
    checkbox.type="checkbox";checkbox.className="human-confirmed";checkbox.checked=!!(saved && saved.confirmed);confirm.append(checkbox,confirmText);body.append(confirm);row.append(body);
    const instruction=node("p","","secondary");row.append(instruction);
    function actionState() {
      const value=action.input.value;body.disabled=!["confirm_evidence","editorial"].includes(value);body.hidden=value==="" || value==="edit";
      evidence.hidden=value!=="confirm_evidence";
      confirmText.textContent=value==="editorial"?"이 문장은 사실 단정이 없는 안내·의견·분석임을 확인했습니다. 수치·규정·조건이 들어 있으면 근거로 확인하거나 수정해야 합니다.":
        "선택한 발췌와 기사 전체 문맥을 읽고, 학년도·대상·조건까지 현재 기사 문장을 뒷받침함을 확인했습니다.";
      instruction.textContent=value==="edit"?"아래 '해당 기사 부분 수정'으로 이동해 내용을 고치고 초안 저장·최종 재검증을 진행하세요. 수정 선택만으로 현재 문장의 문제가 해결되지는 않습니다.":
        value==="editorial"?"분류 이름만 바꿔 사실 검증을 면제하지 않습니다. 사실이 없는 표현인지 판단 이유를 남깁니다.":
        "근거로 직접 확인할 때는 이번 보고서가 실제 읽은 발췌를 선택합니다. 결정은 최종 승인할 때 함께 저장합니다.";
    }
    action.input.addEventListener("change",()=>{checkbox.checked=false;actionState();host.onChange();});actionState();
    const actions=node("div","","rewrite-actions"), edit=node("button","해당 기사 부분 수정","text-button"), sources=node("button","근거 등록으로 이동","text-button");
    edit.type="button";sources.type="button";
    edit.addEventListener("click",()=>{
      const part=(article.final_verification_report.coverage || []).find(part=>part.id===check.segment_id);
      host.openDraftLocation(check.segment_id,check.original_quote,part?part.text:"");
    });sources.addEventListener("click",host.openSources);
    actions.append(edit,sources);card.append(row,actions);
    row.addEventListener("input",host.onChange);row.addEventListener("change",host.onChange);
  }
  function loadArticle(next, fresh = false) {
    const nextStamp = JSON.stringify([next.id,next.revision,next.source_revision,next.plan_revision,next.draft_revision,
      next.verification_report && next.verification_report.id,next.final_verification_report && next.final_verification_report.id]);
    const reset=fresh || nextStamp!==stamp, previous=reset?null:readRows();
    if (reset) {$("approval-form").reset();tell("");}
    article = next; stamp = nextStamp; renderReport(previous);
    if(article.approval_status==="approved") {
      $("approval-reviewer").value=article.approval.reviewer;
      ["approval-facts","approval-editorial","approval-rights"].forEach(id=>{$(id).checked=true;});
    }
    if(reset || article.approval_status==="approved")baselineForm=formSnapshot();
  }
  function clear() {article=null;stamp="";baselineForm="";$("approval-form").reset();tell("");renderReport();}
  function renderReport(previous = null) {
    const report = article && article.final_verification_report;
    const meta=$("final-meta"), coverage=$("coverage-list"), checks=$("final-check-list"), blockers=$("final-blockers");
    meta.replaceChildren();coverage.replaceChildren();checks.replaceChildren();blockers.replaceChildren();
    reviewRows.clear();chunks=[];
    meta.hidden=!report;$("final-coverage").hidden=!report;blockers.hidden=true;
    if (!report) return;
    chunks=(report.read_sources || []).flatMap(source=>(source.chunks || []).map(chunk=>({...chunk,source_name:source.name})));
    const saved=new Map((article.approval_status==="approved"?(article.approval.resolutions || []):(previous || [])).map(item=>[item.check_id,item]));
    meta.append(node("p","초안 v"+report.draft_revision+" · 근거 v"+report.source_revision+" · 검증 "+time(report.checked_at)+" · 모델 "+report.model));
    meta.append(node("p","검사 범위 "+report.reviewed_count+" / "+report.coverage_count+"개 · 사실 판정 "+report.checks.length+"개"));
    meta.append(node("p",report.scope));
    const origins={manual:"사용자 입력 발췌",interview:"인터뷰·취재 기록",web_search:"자동 검색한 공개 본문",uploaded_pdf:"첨부 PDF",saved_url:"주소에서 저장한 자료",url:"이번 검증에서 읽은 주소"};
    for(const source of report.read_sources || []) {
      meta.append(node("p",source.name+" · "+origins[source.origin]+" · 발췌 "+source.selected_chunks+" / "+source.total_chunks+"개 · 자료 읽기 "+time(source.read_at),"secondary"));
      if(source.error)meta.append(node("p","자료 읽기 안내: "+source.error,"error"));
      if(source.warning)meta.append(node("p",source.warning,"secondary"));
    }
    if(window.renderWebResearch)window.renderWebResearch(meta,report);
    const counts = node("div","","verdict-counts");
    for (const [key,label] of Object.entries(labels)) counts.append(node("span",label+" "+report.checks.filter(check=>check.verdict===key).length,"verdict-label verdict-"+key));
    meta.append(counts);
    meta.append(node("p","판정 수는 AI의 원래 결과입니다. 사람 검토는 각 항목과 승인 기록에 따로 표시하며 AI 판정을 일치로 바꾸지 않습니다.","secondary"));
    for (const part of report.coverage || []) {
      const row=node("div","","coverage-row");
      row.append(node("strong",part.location),node("p",(part.status==="reviewed"?"검토됨 · ":"검사 누락·차이 · ")+classes[part.classification],"secondary"));
      row.append(node("p",part.text,"claim-original"));coverage.append(row);
    }
    const reasons = report.approval_blockers || [];
    blockers.hidden=!reasons.length;
    reasons.forEach(text=>blockers.append(node("p",text)));
    for (const check of report.checks) {
      const card=node("article","","claim-card");
      card.append(node("span",labels[check.verdict],"verdict-label verdict-"+check.verdict),node("h4",check.original_quote),
        node("p",check.original_location+" · 검증 당시 기사 인용","claim-original"),node("p",check.reason));
      if(normalize(check.claim)!==normalize(check.original_quote)) {
        const interpretation=node("details",""), summary=node("summary","AI가 정리한 주장 보기");
        interpretation.append(summary,node("p",check.claim));card.append(interpretation);
      }
      if(check.suggestion)card.append(node("p","수정·확인: "+check.suggestion));
      if(check.cross_check)card.append(node("p","교차 대조 · 인용 근거 "+check.cross_check.source_count+"개 · 사이트 "+check.cross_check.sites.length+"곳. "+check.cross_check.note,"secondary"));
      if(check.verdict==="needs_context")card.append(node("p","조건 보완은 문장 수정·문맥 확인·분석 구분 중 무엇이 필요한지 위 이유로 판단합니다. 새 자료가 항상 필요한 것은 아닙니다.","notice"));
      if(check.verdict==="unverifiable" && /인용.*근거.*발췌/.test(check.reason))card.append(node("p","근거 인용 확인 오류입니다. 내용이 거짓이라는 확정이 아닙니다. 실제 발췌를 읽고 아래에서 근거와 판단 이유를 기록할 수 있습니다.","notice"));
      if(check.citation_issues && check.citation_issues.length) {
        const details=node("details",""), summary=node("summary","AI 근거 인용 오류 보기");details.append(summary);
        check.citation_issues.forEach(issue=>details.append(node("p",issue.reason+" · 「"+issue.quote+"」","claim-original")));card.append(details);
      }
      if(check.citation_corrections && check.citation_corrections.length) {
        const details=node("details",""), summary=node("summary","PDF 인용·발췌 위치 연결 내역");details.append(summary);
        check.citation_corrections.forEach(item=>details.append(node("p",item.reason,"secondary")));card.append(details);
      }
      for(const evidence of check.evidence) {
        card.append(node("p",evidence.source_name+" · "+evidence.locator,"secondary"),node("blockquote",evidence.quote,"evidence-quote"));
        if(evidence.url) {
          const link=node("a","근거 자료 열기");link.href=evidence.url;link.target="_blank";link.rel="noopener noreferrer";card.append(link);
        } else {
          const source=article.sources.find(item=>item.id===evidence.source_id);
          if(source && source.material && source.material.has_file) {
            const link=node("a","첨부 PDF 열기");link.href="/api/materials/"+source.material.id+"/file";link.target="_blank";link.rel="noopener noreferrer";card.append(link);
          }
        }
      }
      if(check.verdict!=="match")renderHumanReview(card,check,saved.get(check.id));
      checks.append(card);
    }
    for(const check of report.unanchored_checks || []) {
      const card=node("article","","claim-card");
      card.append(node("span","판정 제외 · 승인 불가","verdict-label"),node("h4",check.claim),node("p",check.location+" · "+check.ai_quote,"claim-original"),node("p",check.reason));checks.append(card);
    }
  }
  function updateState() {
    const state=host.getState(), draft=article && article.draft;
    const current=draft && article.draft_status!=="stale" && article.rewrite_plan_status==="current";
    const report=article && article.final_verification_report;
    const approved=article && article.approval_status==="approved";
    const clean=!state.unsaved, available=current && clean && !state.busy;
    const decisions=readRows(), complete=decisions.filter(rowComplete).length;
    const reviewComplete=decisions.length===complete;
    $("nav-final").disabled=!draft || state.busy;
    $("edit-draft").disabled=!draft || state.busy;
    $("verify-draft").disabled=!available || !state.configured;
    $("verify-draft").textContent=verifying?"기사 전체 대조 중…":"최종 재검증 실행";
    $("final-status").textContent=!draft?"초안 저장 대기":!clean?"수정 내용 저장 필요":!current?"초안 기준 변경 · 확인 필요":
      approved?"승인 완료 · 내보내기 가능":article.final_verification_status==="stale"?"재검증 필요":
      article.can_review && reviewComplete?"재검증·항목 검토 완료 · 승인 대기":report?"항목별 검토·수정 필요":"최종 재검증 전";
    $("final-help").textContent=!draft?"기사 재작성에서 초안을 만들고 저장하면 최종 검증을 시작할 수 있습니다.":
      !clean?"저장하지 않은 원문·근거·편집 결정·초안이 있습니다. 저장하거나 입력 중인 근거를 정리한 뒤 진행하세요.":
      !current?"원문·근거·편집 결정이 바뀌었습니다. 원문 검증과 편집 결정을 확인하고 초안을 다시 저장해주세요.":
      approved?"현재 버전을 승인했습니다. 기사나 근거를 변경·저장하거나 새 검증 결과를 저장하면 다시 승인해야 합니다.":
      article.final_verification_status==="stale"?"표시된 결과는 이전 버전입니다. 현재 초안을 다시 검증해주세요.":
      !state.configured?"AI 키를 설정한 뒤 저장된 기사 전체를 재검증해주세요.":
      article.can_review && reviewComplete?"항목별 확인이 준비되었습니다. 기사 전체를 직접 검토하고 이름·세 가지 확인을 입력해 승인하세요. 검토 기록은 승인할 때 함께 저장합니다.":
      report?"아래에서 미해결 항목을 하나씩 검토하세요. 실제 조건 누락은 수정·재검증하고, AI 판정 오류는 근거·판단 이유를 기록해 보완합니다.":"저장된 초안 전체를 등록 자료와 대조합니다.";
    $("approval-fields").disabled=!available || approved;
    $("approve-draft").disabled=!available || approved || !article.can_review || !reviewComplete || !$("approval-reviewer").value.trim() ||
      !["approval-facts","approval-editorial","approval-rights"].every(id=>$(id).checked);
    $("approval-help").textContent=approved?"현재 버전의 승인 기록을 저장했습니다. 기사 변경 후에는 다시 검토·승인합니다.":
      !report?"이름은 입력할 수 있습니다. 승인은 최종 검증 결과와 항목별 검토를 마친 뒤 가능합니다.":
      !article.can_review?"기사 검사 범위가 누락되었거나 이전 버전의 결과입니다. 이름·체크만으로는 승인할 수 없으며 현재 초안을 다시 검증해야 합니다.":
      "AI 추가 검토 대상 "+decisions.length+"개 · 항목별 검토 입력 완료 "+complete+"개 · 남은 "+(decisions.length-complete)+"개. 검토 기록은 최종 승인과 함께 저장합니다.";
    const blockers=$("final-blockers");blockers.replaceChildren();
    if(report && article.final_verification_status!=="stale") {
      if(!article.can_review)(report.approval_blockers || []).forEach(text=>blockers.append(node("p",text)));
      else if(!reviewComplete)blockers.append(node("p","AI 추가 검토 대상 "+decisions.length+"개 중 "+(decisions.length-complete)+"개가 남았습니다. 기사 수정·재검증 또는 항목별 근거·판단 기록을 마쳐주세요."));
    }
    blockers.hidden=!blockers.childElementCount;
    decisions.forEach(item=>{
      const row=reviewRows.get(item.check_id);row.disabled=!available || approved || !article.can_review;
      row.querySelector(".human-state").textContent=approved?"사람 검토 · 승인 기록에 저장됨":rowComplete(item)?"검토 입력 완료 · 승인할 때 저장":"검토 미완료";
    });
    $("export-html").disabled=!available || !article.can_export;
    $("export-json").disabled=!available || !article.can_export;
    const record=$("approval-record");record.replaceChildren();
    if(article && article.approval) {
      const approval=article.approval;
      record.append(node("p",approved && clean?"현재 기사 버전 승인됨":"이전 승인 기록 · 현재 작업에는 사용 불가"),
        node("p",approval.reviewer+" · "+time(approval.approved_at)),node("p","초안 v"+approval.draft_revision+" · 근거 v"+approval.source_revision));
      if(approval.resolutions && approval.resolutions.length)record.append(node("p","사람이 근거·판단을 기록한 항목 "+approval.resolutions.length+"개 · AI 판정은 원본 유지"));
    } else record.append(node("p","아직 승인한 기사가 없습니다."));
  }
  function payload() {
    return {expected_revision:article.revision,expected_source_revision:article.source_revision,
      report_id:article.verification_report.id,expected_plan_revision:article.plan_revision,expected_draft_revision:article.draft_revision,
      expected_final_report_id:article.final_verification_report?article.final_verification_report.id:null};
  }
  function allowed() {
    const state=host.getState();
    return !state.busy && !state.unsaved && article && article.draft && article.draft_status!=="stale" && article.rewrite_plan_status==="current";
  }
  $("nav-final").addEventListener("click",()=>$("final-panel").scrollIntoView({behavior:"smooth",block:"start"}));
  $("edit-draft").addEventListener("click",()=>$("draft-area").scrollIntoView({behavior:"smooth",block:"start"}));
  $("approval-form").addEventListener("input",host.onChange);
  $("approval-form").addEventListener("change",host.onChange);
  $("verify-draft").addEventListener("click",async()=>{
    if(!allowed())return;
    if(hasUnsaved() && !window.confirm("승인에 저장하지 않은 검토 입력이 있습니다. 새 검증 결과를 저장하면 입력이 초기화됩니다. 다시 검증할까요?"))return;
    verifying=true;host.setBusy(true);tell("저장한 기사 전체를 근거와 대조하고 있습니다.");
    try {
      const data=await host.api("/api/articles/"+article.id+"/draft/verify",{method:"POST",body:JSON.stringify({...payload(),web_search:$("web-search-enabled").checked})});
      host.applyArticle(data);tell(data.can_approve?"최종 검증 결과를 저장했습니다. 기사 전체를 직접 확인하고 승인해주세요.":"최종 검증 결과를 저장했습니다. 미해결 항목·범위를 확인하고 수정 후 다시 검증해주세요.");await host.refreshArticles();
    }catch(error){tell(error.message+" 이전에 저장한 초안·검증 결과는 보관했습니다.",true);}
    finally{verifying=false;host.setBusy(false);}
  });
  $("approval-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!allowed() || !article.can_review || $("approve-draft").disabled)return;
    host.setBusy(true);
    try {
      const data=await host.api("/api/articles/"+article.id+"/approve",{method:"POST",body:JSON.stringify({...payload(),reviewer:$("approval-reviewer").value,
        facts_reviewed:$("approval-facts").checked,editorial_reviewed:$("approval-editorial").checked,rights_reviewed:$("approval-rights").checked,
        resolutions:readRows().filter(item=>["confirm_evidence","editorial"].includes(item.action))})});
      host.applyArticle(data);tell("현재 기사 버전의 승인 기록을 저장했습니다. HTML 또는 JSON으로 내려받을 수 있습니다.");await host.refreshArticles();
    }catch(error){tell(error.message,true);}finally{host.setBusy(false);}
  });
  async function download(format) {
    if(!allowed() || !article.can_export)return;
    host.setBusy(true);
    try {
      const response=await fetch("/api/articles/"+article.id+"/export/"+format+"?approval_id="+encodeURIComponent(article.approval.id));
      if(!response.ok){const data=await response.json();throw new Error(typeof data.detail==="string"?data.detail:"다운로드 결과를 확인해주세요.");}
      const url=URL.createObjectURL(await response.blob()), anchor=document.createElement("a");
      anchor.href=url;anchor.download="article-"+article.id+"-v"+article.draft_revision+"."+format;
      document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      tell("승인된 기사 파일을 내려받았습니다. 실제 웹사이트 게시와 첨부 PDF 연결은 별도로 진행합니다.");
    }catch(error){tell(error.message,true);}finally{host.setBusy(false);}
  }
  $("export-html").addEventListener("click",()=>download("html"));
  $("export-json").addEventListener("click",()=>download("json"));
  return {loadArticle,clear,updateState,hasUnsaved};
};
