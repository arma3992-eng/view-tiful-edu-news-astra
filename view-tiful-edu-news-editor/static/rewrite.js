/* 기존 원문·근거 화면과 분리한 기사 재작성·편집 컨트롤러. */
window.createRewriteEditor = function (host) {
  "use strict";
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const kinds = {fact:"사실·과거 사례·트렌드", analysis:"편집자 분석", opinion:"기자 의견·주장", guidance:"학습 제안", interview:"인터뷰·취재"};
  const audiences = {student:"학생", parent:"학부모", teacher:"교사"};
  let article = null, baselinePlan = "", baselineDraft = "", hasDraft = false, generating = false;
  let sectionRefs = [], factRefs = [], guidanceRefs = {};
  function node(tag, text, className = "") {
    const item = document.createElement(tag); item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function tell(id, text, error = false) {
    $(id).textContent = text; $(id).classList.toggle("error", error);
  }
  function field(label, tag, className, value, limit) {
    const row = node("label", label), input = document.createElement(tag);
    input.className = className; input.value = value || "";
    if (tag === "textarea") input.classList.add("small-textarea");
    if (limit) input.maxLength = limit;
    row.append(input); return row;
  }
  function select(className, labels, value) {
    const input = document.createElement("select"); input.className = className;
    for (const [key, text] of Object.entries(labels)) {
      const option = node("option", text); option.value = key; input.append(option);
    }
    input.value = value; return input;
  }
  function sourceChoices(ids) {
    const box = node("div", "", "source-choices");
    box.append(node("p", "근거 자료 선택", "secondary"));
    for (const source of article.evidence_sources || article.sources) {
      const label = node("label", ""), input = document.createElement("input");
      input.type = "checkbox"; input.value = source.id; input.checked = ids.includes(source.id);
      label.append(input, document.createTextNode(source.name)); box.append(label);
    }
    return box;
  }
  function selectedSources(row) {
    return [...row.querySelectorAll('.source-choices input:checked')].map(input => input.value);
  }
  function readPlan() {
    return {decisions:[...$("decision-list").children].map(row => ({
      claim_id:row.dataset.claimId, action:row.querySelector(".decision-action").value,
      revised_text:row.querySelector(".revised-text").value, source_ids:selectedSources(row),
      note:row.querySelector(".decision-note").value
    })), additions:[...$("addition-list").children].map(row => ({
      kind:row.querySelector(".addition-kind").value, text:row.querySelector(".addition-text").value,
      source_ids:selectedSources(row)
    })), editor_note:$("editor-note").value};
  }
  function planChanged() { return !!article && JSON.stringify(readPlan()) !== baselinePlan; }
  function draftChanged() { return hasDraft && JSON.stringify(readDraft()) !== baselineDraft; }
  function defaultPlan(next) {
    const report = next.verification_report;
    return {decisions:report ? [...report.checks, ...(report.unanchored_checks || [])].map(check => ({
      claim_id:check.id, action:check.verdict === "match" ? "include" : "hold", revised_text:"",
      source_ids:check.verdict === "match" ? [...new Set(check.evidence.map(e => e.source_id))] : [], note:""
    })) : [], additions:[], editor_note:""};
  }
  function renderPlan(content, setBaseline = true) {
    $("decision-list").replaceChildren(); $("addition-list").replaceChildren();
    const report = article.verification_report;
    const known = report ? [...report.checks, ...(report.unanchored_checks || [])] : [];
    for (const decision of content.decisions) {
      const check = known.find(item => item.id === decision.claim_id); if (!check) continue;
      const row = node("article", "", "claim-card decision-card"); row.dataset.claimId = check.id;
      row.append(node("span", check.verdict_label || "원문 인용 미확인", "verdict-label"), node("h4", check.claim),
        node("p", check.original_quote || check.ai_quote, "claim-original"));
      const label = node("label", "편집 결정");
      label.append(select("decision-action", check.verdict ?
        {include:"포함", revise:"근거에 맞게 수정", hold:"보류 · 초안에서 빼기", exclude:"제외"} :
        {hold:"보류 · 초안에서 빼기", exclude:"제외"}, decision.action)); row.append(label);
      const details = document.createElement("details");
      details.open = decision.action === "revise";
      details.append(node("summary", "수정 문장·근거·포함 이유"),
        field("수정할 문장", "textarea", "revised-text", decision.revised_text, 1800), sourceChoices(decision.source_ids),
        field("확인한 내용·포함 이유", "textarea", "decision-note", decision.note, 1000));
      row.append(details);
      if (!check.verdict) row.append(node("p", "이 항목은 원문 인용이 확인되지 않았습니다. 필요하면 아래 추가 내용에 근거와 함께 작성하세요.", "secondary"));
      $("decision-list").append(row);
    }
    content.additions.forEach(addAddition);
    $("editor-note").value = content.editor_note;
    if (setBaseline) baselinePlan = JSON.stringify(readPlan());
  }
  function addAddition(value = {kind:"fact",text:"",source_ids:[]}) {
    if ($("addition-list").children.length >= 10) return;
    const row = node("article", "", "claim-card");
    const label = node("label", "내용의 성격"); label.append(select("addition-kind", kinds, value.kind));
    row.append(label, field("추가할 내용 · 연도·기간·비교 범위 포함", "textarea", "addition-text", value.text, 5000), sourceChoices(value.source_ids));
    const remove = node("button", "이 추가 내용 지우기", "text-button"); remove.type = "button";
    remove.addEventListener("click", () => {row.remove(); host.onChange();});
    row.append(remove); $("addition-list").append(row);
  }
  function removeRowButton(row) {
    const remove = node("button", "항목 지우기", "text-button"); remove.type = "button";
    remove.addEventListener("click", () => {row.remove(); host.onChange();}); return remove;
  }
  function addSection(value = {heading:"",kind:"fact",text:"",item_ids:[]}) {
    if ($("draft-sections").children.length >= 10) return;
    const row = node("div", "", "draft-block"); row.dataset.ref = String(sectionRefs.length); sectionRefs.push(value.item_ids);
    row.append(field("소제목", "input", "section-heading", value.heading, 120));
    const label = node("label", "내용의 성격"); label.append(select("section-kind", kinds, value.kind)); row.append(label);
    row.append(field("본문", "textarea", "section-text", value.text, 6000), removeRowButton(row)); $("draft-sections").append(row);
  }
  function addFact(value = {label:"",value:"",item_ids:[]}) {
    if ($("draft-facts").children.length >= 8) return;
    const row = node("div", "", "draft-block"); row.dataset.ref = String(factRefs.length); factRefs.push(value.item_ids);
    row.append(field("정보 항목", "input", "fact-label", value.label, 80), field("정보 내용", "input", "fact-value", value.value, 500), removeRowButton(row));
    $("draft-facts").append(row);
  }
  function renderDraft(content) {
    hasDraft = true; $("draft-area").hidden = false;
    $("draft-category").value = content.category; $("draft-title").value = content.title;
    $("draft-summary-1").value = content.summary[0]; $("draft-summary-2").value = content.summary[1];
    sectionRefs = []; factRefs = []; guidanceRefs = {};
    $("draft-sections").replaceChildren(); $("draft-facts").replaceChildren(); $("draft-guidance").replaceChildren();
    content.sections.forEach(addSection); content.key_facts.forEach(addFact);
    for (const [key, label] of Object.entries(audiences)) {
      const item = content.audience_guidance.find(g => g.audience === key) || {heading:"먼저 확인하고 준비하세요",text:"",item_ids:[]};
      guidanceRefs[key] = item.item_ids;
      const row = node("div", "", "draft-block"); row.dataset.audience = key;
      row.append(node("h4", label), field("안내 제목", "input", "guidance-heading", item.heading, 120), field("학습·준비 제안 · 내용이 없으면 생략", "textarea", "guidance-text", item.text, 2500));
      $("draft-guidance").append(row);
    }
    baselineDraft = JSON.stringify(readDraft());
  }
  function readDraft() {
    return {category:$("draft-category").value,title:$("draft-title").value,
      summary:[$("draft-summary-1").value,$("draft-summary-2").value],
      sections:[...$("draft-sections").children].map(row => ({heading:row.querySelector(".section-heading").value,
        kind:row.querySelector(".section-kind").value,text:row.querySelector(".section-text").value,item_ids:sectionRefs[Number(row.dataset.ref)]})),
      key_facts:[...$("draft-facts").children].map(row => ({label:row.querySelector(".fact-label").value,
        value:row.querySelector(".fact-value").value,item_ids:factRefs[Number(row.dataset.ref)]})),
      audience_guidance:[...$("draft-guidance").children].filter(row => row.querySelector(".guidance-text").value.trim()).map(row => ({
        audience:row.dataset.audience,heading:row.querySelector(".guidance-heading").value,text:row.querySelector(".guidance-text").value,item_ids:guidanceRefs[row.dataset.audience]}))};
  }
  function renderPreview() {
    const preview = $("draft-preview"); preview.replaceChildren(); if (!hasDraft || !article) return;
    const body = readDraft();
    preview.append(node("p", body.category, "secondary"), node("h2", body.title || "기사 제목을 입력하세요"));
    const summary = node("div", "", "draft-summary"); body.summary.forEach(text => summary.append(node("p", text))); preview.append(summary);
    const facts = node("div", "", "draft-fact-grid");
    body.key_facts.forEach(fact => {const card = node("div", "", "draft-fact"); card.append(node("strong",fact.label),node("p",fact.value));facts.append(card);}); preview.append(facts);
    for (const section of body.sections) {
      const box = node("section", "", "draft-preview-section");
      box.append(node("span", kinds[section.kind], "verdict-label"), node("h3",section.heading),node("p",section.text)); preview.append(box);
    }
    if (body.audience_guidance.length) {
      preview.append(node("h3", "이 기사를 읽은 뒤 · 편집자의 제안"));
      const grid = node("div", "", "draft-audience-grid");
      for (const guidance of body.audience_guidance) {
        const box = node("section", "", "draft-audience");
        box.append(node("strong",audiences[guidance.audience]),node("h4",guidance.heading),node("p",guidance.text)); grid.append(box);
      }
      preview.append(grid);
    }
    preview.append(node("h3", "원문과 연결한 근거"));
    if (article.original_url) appendLink(preview, "원문 기사", article.original_url);
    const items = article.draft ? article.draft.metadata.items : [];
    const usedItems = new Set([...body.sections,...body.key_facts,...body.audience_guidance].flatMap(part => part.item_ids));
    const usedSources = new Set(items.filter(item => usedItems.has(item.id)).flatMap(item => item.source_ids));
    if (article.approval_status === "approved") {
      for (const item of article.approval.resolutions || []) for (const citation of item.evidence) usedSources.add(citation.source_id);
    }
    for (const source of (article.evidence_sources || article.sources).filter(s => usedSources.has(s.id))) {
      preview.append(node("p",source.name + (source.locator ? " · " + source.locator : ""),"secondary"));
      if (source.url) appendLink(preview,"근거 자료 열기",source.url);
      else if (source.material && source.material.has_file) appendLink(preview,"첨부 PDF 열기","/api/materials/"+source.material.id+"/file");
    }
    if (!usedSources.size) preview.append(node("p","연결한 소재·근거를 확인하고 초안 전체를 재검증하세요.","secondary"));
  }
  function appendLink(container, text, url) {
    const link = node("a",text);link.href=url;link.target="_blank";link.rel="noopener noreferrer";container.append(link);
  }
  function updateState() {
    const state = host.getState();
    const current = article && ["completed","partial"].includes(article.verification_status) && !state.originalChanged;
    const ready = current && !state.busy;
    $("nav-rewrite").disabled = !article || state.busy;
    $("rewrite-fields").disabled = !article || state.busy;
    $("save-plan").disabled = !ready;
    $("manual-draft").disabled = !ready;
    $("generate-draft").disabled = !ready || !state.configured;
    $("generate-draft").textContent = generating ? "AI 초안 작성 중…" : "AI로 초안 작성";
    $("draft-fields").disabled = !article || state.busy;
    $("save-draft").disabled = !ready || !article.rewrite_plan || article.rewrite_plan_status !== "current" || planChanged();
    $("draft-status").textContent = !hasDraft ? "초안 작성 전" : draftChanged() ? "초안 수정됨 · 저장 필요" :
      article.draft_status === "stale" ? "초안 기준 변경 · 확인 필요" : article.approval_status === "approved" ? "승인 완료 · 기사 저장됨" :
      article.draft_status === "verified" ? "재검증 완료 · 승인 대기" : article.draft_status === "needs_revision" ? "재검증 결과 · 수정 필요" :
      article.draft ? "초안 저장됨 · 재검증 전" : "직접 작성 · 저장 전";
    $("draft-preview-status").textContent = article && article.approval_status === "approved" && !draftChanged() && !planChanged() && !state.originalChanged && !state.sourceChanged ?
      "현재 기사 버전 승인 완료 · 아래에서 내려받을 수 있습니다." : "편집 초안 · 최종 재검증과 사람의 승인을 확인해주세요.";
    $("rewrite-help").textContent = !article ? "원문을 저장하면 분석·의견·학습 제안·인터뷰 소재를 작성할 수 있습니다." :
      !article.verification_report ? "추가 소재를 작성할 수 있습니다. 원문 검증을 마치면 편집 결정을 저장하고 초안을 작성할 수 있습니다." :
      !current ? "소재·초안의 유형과 내용을 편집할 수 있습니다. 원문·근거 검증 후 편집 결정을 저장해야 초안을 저장할 수 있습니다." :
      "일치 항목은 포함, 그 밖의 항목은 보류로 시작합니다. 근거를 확인한 내용은 수정하거나 포함 이유를 적어 선택하세요.";
    const counts = {include:0,revise:0,hold:0,exclude:0};
    if (article) readPlan().decisions.forEach(item => counts[item.action]++);
    $("decision-summary").textContent = "포함 " + counts.include + " · 수정 " + counts.revise + " · 보류 " + counts.hold + " · 제외 " + counts.exclude + " · 추가 내용 " + $("addition-list").children.length +
      (planChanged() ? " · 편집 결정 저장 필요" : article && article.rewrite_plan_status === "current" ? " · 결정 저장됨" : " · 결정 저장 전");
    const warnings = $("draft-warnings"); warnings.replaceChildren();
    if (article && article.draft) {
      warnings.append(node("p","초안 v"+article.draft.revision+" · 원문 v"+article.draft.original_revision+" / 근거 v"+article.draft.source_revision+" / 편집 결정 v"+article.draft.plan_revision));
      for (const text of article.draft.metadata.warnings || []) warnings.append(node("p",text));
      if (article.draft_status === "stale") warnings.append(node("p","초안 작성 기준이 달라졌습니다. 편집 결정을 저장한 뒤 새로 작성하거나 내용을 다시 확인하세요."));
    }
    warnings.append(node("p","포함·수정 결정과 초안 저장 뒤 아래 최종 재검증·승인 영역에서 현재 버전을 검토합니다."));
    renderPreview();
  }
  function loadArticle(next, fresh = false) {
    const reportChanged = article && article.id === next.id && (article.verification_report && article.verification_report.id) !== (next.verification_report && next.verification_report.id);
    const preserve = reportChanged && !fresh;
    const previousPlan = preserve ? readPlan() : null;
    const previousDraft = preserve && hasDraft ? readDraft() : null;
    const oldReport = preserve && article.verification_report;
    const key = check => (check.original_quote ? "original:" : "unanchored:") + (check.original_quote || check.ai_quote);
    const previousByQuote = new Map();
    if (oldReport) {
      const oldChecks = [...oldReport.checks,...(oldReport.unanchored_checks || [])];
      for (const decision of previousPlan.decisions) {
        const check = oldChecks.find(item => item.id === decision.claim_id);
        if (check) previousByQuote.set(key(check), previousByQuote.has(key(check)) ? null : decision);
      }
    }
    const reset = fresh || !article || article.id !== next.id || reportChanged;
    const planUpdated = !article || article.plan_revision !== next.plan_revision;
    const draftUpdated = !article || article.draft_revision !== next.draft_revision;
    article = next;
    if (reset || planUpdated) {
      const saved = next.rewrite_plan && next.verification_report && next.rewrite_plan.report_id === next.verification_report.id;
      renderPlan(saved ? next.rewrite_plan.content : defaultPlan(next));
      if (preserve) {
        const content = defaultPlan(next), report = next.verification_report;
        const checks = report ? [...report.checks,...(report.unanchored_checks || [])] : [];
        const sourceIds = new Set((next.evidence_sources || next.sources).map(source => source.id));
        content.decisions = content.decisions.map(decision => {
          const check = checks.find(item => item.id === decision.claim_id);
          const old = checks.filter(item => key(item) === key(check)).length === 1 && previousByQuote.get(key(check));
          return old ? {...clone(old),claim_id:decision.claim_id,source_ids:old.source_ids.filter(id => sourceIds.has(id))} : decision;
        });
        content.additions = previousPlan.additions; content.editor_note = previousPlan.editor_note;
        renderPlan(content, false);
      }
    }
    if (reset || draftUpdated) {
      if (next.draft) renderDraft(next.draft.content);
      else {hasDraft = false; $("draft-area").hidden = true; baselineDraft = "";}
      tell("rewrite-message", ""); tell("draft-message", "");
    }
    if (preserve) {
      if (previousDraft) {
        // 새 보고서의 claim 번호에 이전 소재 연결을 잘못 붙이지 않는다.
        for (const block of [...previousDraft.sections,...previousDraft.key_facts,...previousDraft.audience_guidance]) block.item_ids = [];
        renderDraft(previousDraft); baselineDraft = "";
      }
      tell("rewrite-message","새 검증 결과를 불러왔습니다. 같은 원문 인용의 결정과 추가 내용·초안은 화면에 보관했습니다. 결정을 다시 확인해 저장하고, 초안의 근거 연결은 새로 작성하거나 재검증할 때 확인해주세요.");
    }
  }
  function clear() {
    article = null; hasDraft = false; baselinePlan = ""; baselineDraft = "";
    $("decision-list").replaceChildren(); $("addition-list").replaceChildren(); $("editor-note").value=""; $("draft-area").hidden=true;
    tell("rewrite-message", ""); tell("draft-message", "");
  }
  function basePayload() {
    return {expected_revision:article.revision,expected_source_revision:article.source_revision,
      report_id:article.verification_report.id,expected_plan_revision:article.plan_revision || 0};
  }
  function workAllowed() {
    const state = host.getState();
    if (state.busy || !article || state.originalChanged || !["completed","partial"].includes(article.verification_status)) return false;
    if (state.sourceChanged) {tell("rewrite-message","입력 중인 근거를 먼저 등록하거나 지워주세요.",true);return false;}
    return true;
  }
  async function savePlan() {
    const data = await host.api("/api/articles/"+article.id+"/rewrite-plan",{method:"PUT",body:JSON.stringify({...basePayload(),content:readPlan()})});
    host.applyArticle(data); return data;
  }
  $("nav-rewrite").addEventListener("click",()=>$("rewrite-panel").scrollIntoView({behavior:"smooth",block:"start"}));
  $("add-background").addEventListener("click",()=>{addAddition();host.onChange();});
  $("rewrite-fields").addEventListener("input",host.onChange);
  $("rewrite-fields").addEventListener("change",host.onChange);
  $("draft-fields").addEventListener("input",host.onChange);
  $("draft-fields").addEventListener("change",host.onChange);
  $("add-draft-section").addEventListener("click",()=>{addSection();host.onChange();});
  const addKeyFact=node("button","+ 핵심 정보 추가","text-button");addKeyFact.type="button";addKeyFact.id="add-draft-fact";
  addKeyFact.addEventListener("click",()=>{addFact();host.onChange();});$("draft-facts").after(addKeyFact);
  $("save-plan").addEventListener("click",async()=>{
    if(!workAllowed())return;host.setBusy(true);
    try{await savePlan();tell("rewrite-message","편집 결정을 저장했습니다. AI 또는 직접 작성으로 초안을 만드세요.");await host.refreshArticles();}
    catch(error){tell("rewrite-message",error.message,true);}finally{host.setBusy(false);}
  });
  $("generate-draft").addEventListener("click",async()=>{
    if(!workAllowed())return;
    if(hasDraft && !window.confirm("현재 초안 대신 선택한 소재로 새 초안을 작성할까요? 저장하지 않은 초안 수정은 사라집니다."))return;
    const draftRevision = article.draft_revision || 0;
    generating=true;host.setBusy(true);tell("rewrite-message","편집 결정을 저장하고 선택한 소재로 AI 초안을 작성합니다.");
    try{
      await savePlan();
      const data=await host.api("/api/articles/"+article.id+"/draft/generate",{method:"POST",body:JSON.stringify({...basePayload(),expected_draft_revision:draftRevision})});
      host.applyArticle(data);tell("rewrite-message","AI 초안을 저장했습니다. 아래에서 제목·요약·본문·독자별 안내와 출처를 확인하세요.");await host.refreshArticles();
    }catch(error){tell("rewrite-message",error.message,true);}finally{generating=false;host.setBusy(false);}
  });
  $("manual-draft").addEventListener("click",async()=>{
    if(!workAllowed())return;
    if(hasDraft && !window.confirm("편집란을 비우고 새 초안을 직접 작성할까요? 기존 저장 초안은 새로 저장하기 전까지 보관됩니다."))return;
    host.setBusy(true);
    try{await savePlan();renderDraft({category:"입시·수능",title:"",summary:["",""],sections:[{heading:"",kind:"fact",text:"",item_ids:[]}],key_facts:[],audience_guidance:[]});
      baselineDraft="";tell("rewrite-message","직접 작성하는 초안입니다. 제목·요약 두 문장·본문을 채운 뒤 초안 저장을 누르세요.");}
    catch(error){tell("rewrite-message",error.message,true);}finally{host.setBusy(false);}
  });
  $("draft-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!workAllowed())return;
    if(planChanged()){tell("draft-message","편집 결정을 먼저 저장해주세요.",true);return;}
    host.setBusy(true);
    try{const data=await host.api("/api/articles/"+article.id+"/draft",{method:"PUT",body:JSON.stringify({...basePayload(),expected_draft_revision:article.draft_revision || 0,content:readDraft()})});
      host.applyArticle(data);tell("draft-message","초안을 저장했습니다. 최종 재검증과 승인 전 상태입니다.");await host.refreshArticles();}
    catch(error){tell("draft-message",error.message,true);}finally{host.setBusy(false);}
  });
  function quoteRange(text, quote) {
    const exact=text.indexOf(quote);
    if(quote && exact>=0)return [exact,exact+quote.length];
    const tokens=quote.trim().split(/\s+/).filter(Boolean);
    if(!tokens.length)return null;
    const pattern=tokens.map(token=>token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("\\s+");
    const match=new RegExp(pattern,"u").exec(text);
    return match?[match.index,match.index+match[0].length]:null;
  }
  function openLocation(id, quote = "", reviewedText = "") {
    let input = null, match, factRow = null;
    if (/^title_/.test(id)) input = $("draft-title");
    else if ((match = /^summary_(\d+)_/.exec(id))) input = $("draft-summary-"+match[1]);
    else if ((match = /^section_(\d+)_(heading|body)_/.exec(id))) {
      const row = $("draft-sections").children[Number(match[1])-1];
      if (row) input = row.querySelector(match[2]==="heading"?".section-heading":".section-text");
    } else if ((match = /^fact_(\d+)_/.exec(id))) {
      factRow = $("draft-facts").children[Number(match[1])-1]; if (factRow) input = factRow.querySelector(".fact-value");
    } else if ((match = /^guidance_(student|parent|teacher)_(heading|body)_/.exec(id))) {
      const row = $("draft-guidance").querySelector('[data-audience="'+match[1]+'"]');
      if (row) input = row.querySelector(match[2]==="heading"?".guidance-heading":".guidance-text");
    }
    let targetQuote=quote, range=input && quoteRange(input.value,targetQuote);
    if(factRow && !range && quote) {
      const label=factRow.querySelector(".fact-label");
      const labelRange=quoteRange(label.value,quote);
      if(labelRange){input=label;range=labelRange;}
      else {
        const prefix=label.value+": ";
        if(quote.startsWith(prefix)){targetQuote=quote.slice(prefix.length);range=quoteRange(input.value,targetQuote);}
      }
    }
    (input || $("draft-area")).scrollIntoView({behavior:"smooth",block:"center"});
    if(!input){tell("draft-message","검증 결과에 연결된 기사 입력칸을 찾지 못했습니다. 현재 초안의 해당 항목을 확인해주세요.",true);return;}
    input.focus({preventScroll:true});
    if(range) {
      input.setSelectionRange(range[0],range[1]);
      tell("draft-message","검증한 기사 인용 부분을 선택했습니다. 수정했다면 초안을 저장한 뒤 최종 재검증해주세요.");
    } else if(quote) {
      input.setSelectionRange(0,0);
      const sameText=reviewedText && input.value.replace(/\s+/g," ").trim().includes(reviewedText.replace(/\s+/g," ").trim());
      tell("draft-message",(sameText?"AI 인용 연결 확인 필요: 해당 인용문이 이 기사 문장에 없습니다.":"검증 결과의 인용문과 현재 편집 중인 문장이 다릅니다.")+
        " 인용문: 「"+quote+"」 현재 내용을 확인하고 저장한 뒤 최종 재검증해주세요.",true);
    } else input.select();
  }
  return {loadArticle,clear,updateState,openLocation,hasUnsaved:()=>planChanged() || draftChanged()};
};
