(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let activeArticle = null;
  let busy = false;
  let verifying = false;
  let pendingMaterial = null;
  let materialInputUrl = "";
  let aiConfigured = false;
  const original = $("original-text");
  const originalUrl = $("original-url");
  const rewriteEditor = window.createRewriteEditor({api, refreshArticles,
    applyArticle: data => applyArticle(data, false), onChange: updateState,
    setBusy: value => {busy = value; updateState();},
    getState: () => ({busy, configured: aiConfigured, originalChanged: originalHasChanges(), sourceChanged: sourceHasChanges()})});
  const finalReview = window.createFinalReview({api, refreshArticles,
    applyArticle: data => applyArticle(data, false), onChange: updateState,
    setBusy: value => {busy = value; updateState();},
    getState: () => ({busy, configured: aiConfigured, unsaved: articleHasUnsavedText()}),
    openDraftLocation: (id, quote, text) => rewriteEditor.openLocation(id, quote, text),
    openSources: () => {$("source-name").scrollIntoView({behavior:"smooth",block:"center"});$("source-name").focus();}});
  const kindNames = {official: "공식 자료", press: "언론 기사", interview:"인터뷰·취재 기록", other: "기타 자료"};
  const timeText = value => new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short"
  }).format(new Date(value));
  function message(id, text, error = false) {
    const element = $(id);
    element.textContent = text;
    element.classList.toggle("error", error);
  }
  function originalHasChanges() {
    return activeArticle && (
      original.value.trim() !== activeArticle.original_text ||
      originalUrl.value.trim() !== (activeArticle.original_url || "")
    );
  }
  function updateState() {
    $("character-count").textContent = original.value.length.toLocaleString("ko-KR") + "자";
    $("save-state").textContent = !activeArticle ? "새 기사" :
      originalHasChanges() ? "수정됨 · 저장 필요" :
      activeArticle.verification_status === "partial" ? "저장됨 · 일부 검증" :
      activeArticle.verification_status === "completed" ? "저장됨 · AI 결과 있음" :
      activeArticle.verification_status === "stale" ? "저장됨 · 재검증 필요" : "저장됨 · 검증 전";
    $("save-original").disabled = busy;
    $("new-article").disabled = busy;
    $("sample-article").disabled = busy;
    original.disabled = busy;
    originalUrl.disabled = busy;
    $("source-fields").disabled = busy || !activeArticle || originalHasChanges();
    $("web-search-enabled").disabled = busy;
    const interview=$("source-kind").value==="interview";
    $("interview-fields").hidden=!interview;
    $("interview-speaker").required=interview;$("interview-date").required=interview;
    $("import-original").disabled = busy || !originalUrl.value.trim();
    $("import-source-url").disabled = busy || !$("source-url").value.trim();
    $("import-source-pdf").disabled = busy || !$("source-pdf").files.length;
    const canVerify = !busy && activeArticle && !originalHasChanges() && (activeArticle.sources.length > 0 || $("web-search-enabled").checked);
    $("verify-original").disabled = !canVerify;
    $("nav-verify").disabled = !canVerify;
    $("verify-original").textContent = verifying ? "검색·근거 대조 중…" : "원문 검증 실행";
    $("use-material-text").disabled = busy || !$("material-text").value.trim();
    $("verify-help").textContent = !activeArticle ? "먼저 원문을 저장해주세요." :
      originalHasChanges() ? "수정한 원문을 저장한 뒤 검증해주세요." :
      !activeArticle.sources.length && !$("web-search-enabled").checked ? "자동 웹 검색을 켜거나 근거를 등록한 뒤 실행하세요." :
      !aiConfigured ? "AI 키를 설정한 뒤 실행하세요." :
      $("web-search-enabled").checked ? "저장한 원문의 사실을 자동 검색하고 공개 본문·등록 근거와 교차 대조합니다." : "저장된 원문과 등록된 근거를 AI로 대조합니다.";
    renderVerification();
    rewriteEditor.updateState();
    finalReview.updateState();
  }
  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options, headers: {...(options.body instanceof FormData ? {} : {"Content-Type": "application/json"}), ...(options.headers || {})}
    });
    const data = await response.json();
    if (!response.ok) {
      const detail = typeof data.detail === "string" ? data.detail :
        "입력 내용을 확인해주세요. 주소 형식과 필수 항목이 올바른지 확인이 필요합니다.";
      throw new Error(detail);
    }
    return data;
  }
  function renderSources() {
    const container = $("source-list");
    container.replaceChildren();
    if (!activeArticle || !activeArticle.sources.length) {
      const empty = document.createElement("p");
      empty.className = "secondary";
      empty.textContent = activeArticle ? "등록된 근거가 없습니다." :
        "원문을 저장하면 근거를 등록할 수 있습니다.";
      container.append(empty); return;
    }
    for (const source of activeArticle.sources) {
      const item = document.createElement("div");
      item.className = "source-item";
      const heading = document.createElement("h4");
      heading.textContent = source.name; item.append(heading);
      const meta = document.createElement("p");
      meta.textContent = kindNames[source.kind] + " · " + (source.locator || "위치 미입력") + " · 근거 등록됨";
      item.append(meta);
      if(source.interview)item.append(textElement("p",source.interview.speaker+" · "+source.interview.role+" · "+source.interview.interviewed_on+" · "+source.interview.method,"secondary"));
      if (source.url) {
        const link = document.createElement("a");
        link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "자료 열기";
        item.append(link);
      }
      if (source.excerpt) {
        const details = document.createElement("details");
        const summary = document.createElement("summary"); summary.textContent = "입력한 발췌 보기"; details.append(summary);
        const quote = document.createElement("p");
        quote.className = "source-quote"; quote.textContent = source.excerpt; details.append(quote); item.append(details);
      }
      if (source.material) {
        const info = document.createElement("p");
        info.textContent = source.material.title + " · " + source.material.page_count + "페이지 · 내용 읽기 " + timeText(source.material.created_at);
        item.append(info);
        if (source.material.has_file) {
          const fileLink = document.createElement("a");
          fileLink.href = "/api/materials/" + source.material.id + "/file"; fileLink.target = "_blank"; fileLink.rel = "noopener";
          fileLink.textContent = "첨부 PDF 열기"; item.append(fileLink);
        }
      }
      container.append(item);
    }
  }
  function applyArticle(article, replaceText = true, refreshEditor = false) {
    activeArticle = article;
    if (replaceText) { original.value = article.original_text; originalUrl.value = article.original_url || ""; }
    rewriteEditor.loadArticle(article, refreshEditor);
    finalReview.loadArticle(article, refreshEditor);
    renderSources(); updateState();
  }
  async function refreshArticles() {
    const data = await api("/api/articles");
    const container = $("article-list");
    container.replaceChildren();
    if (!data.articles.length) {
      const empty = document.createElement("p");
      empty.className = "secondary"; empty.textContent = "저장한 기사가 없습니다."; container.append(empty); return;
    }
    for (const article of data.articles) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "article-button";
      const title = document.createElement("span"); title.textContent = article.title;
      const date = document.createElement("span"); date.textContent = timeText(article.updated_at);
      button.append(title, date);
      button.addEventListener("click", async () => {
        if (busy) return;
        if (hasUnsavedText() && !window.confirm("저장하지 않은 원문·근거·편집 결정·초안이 있습니다. 다른 기사를 불러올까요?")) return;
        busy = true; updateState();
        try {
          applyArticle(await api("/api/articles/" + article.id), true, true);
          resetSource();
          message("original-message", "저장한 원문과 근거를 불러왔습니다."); message("source-message", ""); message("verification-message", "");
        } catch (error) { message("original-message", error.message, true); }
        finally { busy = false; updateState(); }
      });
      container.append(button);
    }
  }
  function hasUnsavedText() {
    return articleHasUnsavedText() || finalReview.hasUnsaved();
  }
  function articleHasUnsavedText() {
    return rewriteEditor.hasUnsaved() || sourceHasChanges() || (activeArticle ? originalHasChanges() : !!(original.value.trim() || originalUrl.value.trim()));
  }
  function sourceHasChanges() {
    return ["source-name", "source-url", "source-locator", "source-excerpt"]
      .some(id => !!$(id).value.trim()) || $("source-kind").value !== "official" ||
      !!pendingMaterial || !!$("source-pdf").files.length || ($("source-kind").value==="interview" &&
      ["interview-speaker","interview-role","interview-date"].some(id=>!!$(id).value.trim()));
  }
  function resetSource() {
    $("source-form").reset(); clearMaterial(); updateState();
  }
  function clearMaterial() {
    pendingMaterial = null; materialInputUrl = "";
    $("material-preview").hidden = true; $("material-page").replaceChildren();
    $("material-text").value = ""; $("source-pdf").value = "";
  }
  function showMaterial(material, inputUrl = "") {
    pendingMaterial = material; materialInputUrl = inputUrl;
    $("material-preview").hidden = false;
    $("material-title").textContent = material.title + " · " + material.page_count + "페이지";
    $("material-warning").textContent = material.warning || "";
    $("material-page").replaceChildren();
    for (let index = 0; index < material.pages.length; index++) {
      const option = document.createElement("option");
      option.value = String(index); option.textContent = material.pages[index].locator;
      $("material-page").append(option);
    }
    if (!$("source-name").value.trim()) $("source-name").value = material.title;
    showMaterialPage();
  }
  function showMaterialPage() {
    if (!pendingMaterial) return;
    const page = pendingMaterial.pages[Number($("material-page").value)];
    $("material-text").value = page ? page.text : ""; updateState();
  }
  function textElement(tag, text, className = "") {
    const node = document.createElement(tag); node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function renderVerification() {
    const report = activeArticle && activeArticle.verification_report;
    const stale = report && (originalHasChanges() || activeArticle.verification_status === "stale");
    const unanchored = report && report.unanchored_checks || [];
    const partial = report && report.report_status === "partial";
    $("verification-status").textContent = verifying ? "AI 대조 중" : stale ? "재검증 필요" : partial ? "일부 검증 · 확인 필요" : report ? "검토 필요" : "검증 전";
    const meta = $("verification-meta"), list = $("check-list");
    meta.replaceChildren(); list.replaceChildren(); meta.hidden = !report;
    if (!report) {
      for (const label of ["날짜·숫자", "적용 대상·범위", "예외·추가 조건", "주장의 근거"]) {
        const row = document.createElement("div"); row.className = "check-row";
        row.append(textElement("span", label), textElement("span", verifying ? "대조 중" : "확인 대기")); list.append(row);
      }
      return;
    }
    if (stale) meta.append(textElement("p", "원문 또는 근거가 달라졌습니다. 아래는 이전 버전의 결과이므로 다시 검증해주세요.", "error"));
    if (partial) meta.append(textElement("p", "일부 결과입니다. 원문 인용 확인 필요 " + unanchored.length + "개는 아래 판정 수에 포함하지 않았습니다.", "error"));
    meta.append(textElement("p", "AI 검토 · " + timeText(report.checked_at) + " · 원문 v" + report.original_revision + " / 근거 v" + report.source_revision));
    meta.append(textElement("p", report.scope));
    const counts = document.createElement("div"); counts.className = "verdict-counts";
    const labels = {match:"일치", mismatch:"불일치", needs_context:"조건 보완 필요", unverifiable:"확인 불가"};
    for (const [key, label] of Object.entries(labels)) {
      counts.append(textElement("span", label + " " + report.checks.filter(c => c.verdict === key).length, "verdict-label verdict-" + key));
    }
    meta.append(counts);
    for (const note of report.coverage_notes || []) meta.append(textElement("p", note));
    const readDetails = document.createElement("details");
    readDetails.append(textElement("summary", "대조한 자료와 읽기 상태"));
    const origins = {manual:"사용자 입력 발췌",interview:"인터뷰·취재 기록",web_search:"자동 검색한 공개 본문", url:"주소에서 읽음", saved_url:"불러온 주소 자료", uploaded_pdf:"첨부 PDF"};
    for (const source of report.read_sources || []) {
      let info = source.name + " · " + origins[source.origin] + " · " + source.selected_chunks + "/" + source.total_chunks + "개 발췌 · " + timeText(source.read_at);
      if (source.error) info += " · 주소 읽기: " + source.error;
      if (source.warning) info += " · " + source.warning;
      readDetails.append(textElement("p", info));
    }
    meta.append(readDetails);
    if(window.renderWebResearch)window.renderWebResearch(meta,report);
    if (unanchored.length) {
      const details = document.createElement("details");
      details.append(textElement("summary", "원문 인용 확인 필요 " + unanchored.length + "개"));
      for (const item of unanchored) {
        const card = document.createElement("article"); card.className = "claim-card";
        card.append(textElement("h4", "AI가 제시한 주장 · 판정 제외: " + item.claim),
          textElement("p", "AI가 반환한 발췌 · 원문 인용 미확인"),
          textElement("blockquote", item.ai_quote, "evidence-quote"), textElement("p", item.reason));
        details.append(card);
      }
      meta.append(details);
    }
    for (const check of report.checks) {
      const card = document.createElement("article"); card.className = "claim-card";
      card.append(textElement("span", check.verdict_label, "verdict-label verdict-" + check.verdict),
        textElement("h4", check.claim), textElement("p", check.original_location + " · " + check.original_quote, "claim-original"),
        textElement("p", check.reason));
      if (check.suggestion) card.append(textElement("p", "확인·수정: " + check.suggestion));
      if(check.cross_check)card.append(textElement("p","교차 대조 · 인용 근거 "+check.cross_check.source_count+"개 · 사이트 "+check.cross_check.sites.length+"곳. "+check.cross_check.note,"secondary"));
      for (const evidence of check.evidence) {
        card.append(textElement("p", evidence.source_name + " · " + evidence.locator));
        card.append(textElement("blockquote", evidence.quote, "evidence-quote"));
        if (evidence.url) {
          const link = textElement("a", "근거 자료 열기");
          link.href = evidence.url; link.target = "_blank"; link.rel = "noopener noreferrer"; card.append(link);
        } else {
          const source = activeArticle.sources.find(s => s.id === evidence.source_id);
          if (source && source.material && source.material.has_file) {
            const link = textElement("a", "첨부 PDF 열기");
            link.href = "/api/materials/" + source.material.id + "/file"; link.target = "_blank"; link.rel = "noopener"; card.append(link);
          }
        }
      }
      list.append(card);
    }
  }
  async function runVerification() {
    if (busy || !activeArticle || originalHasChanges()) return;
    if (sourceHasChanges()) {
      message("verification-message", "입력 중인 근거를 먼저 등록해주세요. 검증은 저장된 자료로 실행됩니다.", true); return;
    }
    busy = true; verifying = true; updateState();
    message("verification-message", $("web-search-enabled").checked?"웹 검색·출처 본문 읽기·원문 사실 대조를 진행하고 있습니다.":"등록한 자료를 읽고 원문과 대조하고 있습니다.");
    try {
      const data = await api("/api/articles/" + activeArticle.id + "/verify", {
        method:"POST", body:JSON.stringify({expected_revision:activeArticle.revision, expected_source_revision:activeArticle.source_revision,web_search:$("web-search-enabled").checked})
      });
      applyArticle(data, false);
      const partial = data.verification_status === "partial";
      message("verification-message", partial ?
        "일부 검토 결과를 저장했습니다. ‘원문 인용 확인 필요’를 펼쳐 판정에서 제외된 항목을 확인해주세요." :
        "AI 검토 결과를 저장했습니다. 판정과 인용 근거를 확인해주세요.", partial);
    } catch (error) { message("verification-message", error.message, true); }
    finally { busy = false; verifying = false; updateState(); }
  }
  $("original-form").addEventListener("submit", async event => {
    event.preventDefault(); if (busy) return;
    if (!original.value.trim()) { message("original-message", "원문 기사 내용이 필요합니다.", true); return; }
    const payload = {original_text: original.value, original_url: originalUrl.value.trim() || null};
    const path = activeArticle ? "/api/articles/" + activeArticle.id : "/api/articles";
    if (activeArticle) payload.expected_revision = activeArticle.revision;
    busy = true; updateState();
    try {
      applyArticle(await api(path, {method: activeArticle ? "PUT" : "POST", body: JSON.stringify(payload)}));
      message("original-message", "원문을 저장했습니다. 오른쪽에서 검증 상태를 확인하세요.");
      await refreshArticles();
    } catch (error) { message("original-message", error.message, true); }
    finally { busy = false; updateState(); }
  });
  $("source-form").addEventListener("submit", async event => {
    event.preventDefault(); if (busy || !activeArticle || originalHasChanges()) return;
    const payload = {
      name: $("source-name").value, kind: $("source-kind").value,
      url: $("source-url").value.trim() || null, locator: $("source-locator").value,
      excerpt: $("source-excerpt").value,
      material_id: pendingMaterial ? pendingMaterial.id : null,
      expected_revision: activeArticle.revision, expected_source_revision: activeArticle.source_revision
    };
    if(payload.kind==="interview")payload.interview={speaker:$("interview-speaker").value,role:$("interview-role").value,
      interviewed_on:$("interview-date").value,method:$("interview-method").value};
    if (!payload.url && !payload.excerpt.trim() && !payload.material_id) { message("source-message", "자료 주소, PDF 또는 대조할 근거 내용을 넣어주세요.", true); return; }
    busy = true; updateState();
    try {
      applyArticle(await api("/api/articles/" + activeArticle.id + "/sources", {method: "POST", body: JSON.stringify(payload)}), false);
      resetSource(); message("source-message", "근거를 보관했습니다. 위의 원문 검증 실행 버튼으로 대조할 수 있습니다.");
      await refreshArticles();
    } catch (error) { message("source-message", error.message, true); }
    finally { busy = false; updateState(); }
  });
  $("new-article").addEventListener("click", () => {
    if (hasUnsavedText() && !window.confirm("저장하지 않은 원문·근거·편집 결정·초안이 있습니다. 새 기사를 시작할까요?")) return;
    activeArticle = null; rewriteEditor.clear(); finalReview.clear(); $("original-form").reset(); resetSource();
    message("original-message", ""); message("source-message", ""); message("verification-message", ""); renderSources(); updateState(); original.focus();
  });
  $("sample-article").addEventListener("click", () => {
    if (hasUnsavedText() && !window.confirm("현재 원문 대신 가상 예시를 넣을까요?")) return;
    activeArticle = null; rewriteEditor.clear(); finalReview.clear(); originalUrl.value = ""; resetSource();
    original.value = "가상 예시 — 학교 AI 활용 안내, 무엇을 확인할까?\n\n이 내용은 화면과 저장 동작을 확인하기 위한 가상 기사입니다.\n학교에서 AI 학습 도구의 활용 기준을 안내했다는 상황을 가정합니다.\n적용 대상·시행 시점·사용 범위·예외 조건은 공식 자료로 확인해야 합니다.";
    renderSources(); updateState();
    message("original-message", "가상 예시를 넣었습니다. 실제 뉴스나 검증 결과가 아닙니다."); message("source-message", ""); message("verification-message", "");
  });
  $("refresh-articles").addEventListener("click", () => {
    refreshArticles().catch(error => message("original-message", error.message, true));
  });
  original.addEventListener("input", updateState); originalUrl.addEventListener("input", updateState);
  $("source-form").addEventListener("input", updateState);
  $("source-form").addEventListener("change", updateState);
  $("source-url").addEventListener("input", () => {
    if (materialInputUrl && $("source-url").value.trim() !== materialInputUrl) clearMaterial();
    updateState();
  });
  $("source-pdf").addEventListener("change", updateState);
  $("material-page").addEventListener("change", showMaterialPage);
  $("clear-material").addEventListener("click", () => {clearMaterial(); updateState();});
  $("reset-source").addEventListener("click", () => {
    if(busy)return;
    resetSource();message("source-message","등록 입력을 비웠습니다. 저장한 근거는 그대로 보관되어 있습니다.");
  });
  $("use-material-text").addEventListener("click", () => {
    if (!pendingMaterial) return;
    const page = pendingMaterial.pages[Number($("material-page").value)];
    const preview = $("material-text");
    const text = preview.selectionEnd > preview.selectionStart ? preview.value.slice(preview.selectionStart, preview.selectionEnd) : preview.value;
    const combined = ($("source-excerpt").value.trim() ? $("source-excerpt").value.trim() + "\n\n" : "") + "[" + page.locator + "]\n" + text;
    if (combined.length > 50000) {message("source-message", "발췌는 5만 자까지 넣을 수 있습니다. 필요한 문장만 선택해주세요.", true); return;}
    $("source-excerpt").value = combined;
    $("source-locator").value = page.locator;
    message("source-message", "근거 내용을 넣었습니다. 근거 등록을 눌러 저장해주세요.");
  });
  $("import-original").addEventListener("click", async () => {
    if (busy || !originalUrl.value.trim()) return;
    if (original.value.trim() && !window.confirm("현재 본문을 주소에서 불러온 내용으로 바꿀까요?")) return;
    busy = true; updateState(); message("original-message", "기사 본문을 읽고 있습니다.");
    try {
      const material = await api("/api/materials/url", {method:"POST", body:JSON.stringify({url:originalUrl.value.trim()})});
      const body = material.pages.map(p => p.text).join("\n\n");
      const text = material.title + "\n\n" + body;
      if (text.length > 100000) throw new Error("본문이 10만 자를 넘습니다. 필요한 내용을 직접 붙여넣어주세요.");
      original.value = text;
      message("original-message", "본문을 불러왔습니다. 제목과 내용이 맞는지 확인한 뒤 원문 저장을 눌러주세요.");
    } catch (error) {message("original-message", error.message, true);}
    finally {busy = false; updateState();}
  });
  $("import-source-url").addEventListener("click", async () => {
    if (busy || !activeArticle || originalHasChanges() || !$("source-url").value.trim()) return;
    const url = $("source-url").value.trim(); busy = true; updateState();
    message("source-message", "자료 내용을 읽고 있습니다.");
    try {
      showMaterial(await api("/api/materials/url", {method:"POST", body:JSON.stringify({url})}), url);
      message("source-message", "자료를 불러왔습니다. 필요한 내용을 확인하고 근거 등록을 눌러주세요.");
    } catch (error) {message("source-message", error.message, true);}
    finally {busy = false; updateState();}
  });
  $("import-source-pdf").addEventListener("click", async () => {
    if (busy || !activeArticle || originalHasChanges()) return;
    const file = $("source-pdf").files[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) {message("source-message", "PDF는 20MB 이하로 선택해주세요.", true); return;}
    const form = new FormData(); form.append("file", file);
    busy = true; updateState(); message("source-message", "PDF 페이지에서 텍스트를 읽고 있습니다.");
    try {
      showMaterial(await api("/api/materials/pdf", {method:"POST", body:form}));
      message("source-message", "PDF를 보관했습니다. 페이지 내용을 확인한 뒤 근거 등록을 눌러 기사에 연결해주세요.");
    } catch (error) {message("source-message", error.message, true);}
    finally {busy = false; updateState();}
  });
  $("verify-original").addEventListener("click", runVerification);
  $("web-search-enabled").addEventListener("change", updateState);
  $("source-kind").addEventListener("change", updateState);
  $("nav-verify").addEventListener("click", runVerification);
  window.addEventListener("beforeunload", event => {
    if (hasUnsavedText()) { event.preventDefault(); event.returnValue = ""; }
  });
  updateState();
  api("/api/health").then(data => {
    aiConfigured = data.ai_configured;
    if(typeof data.web_search_default==="boolean")$("web-search-enabled").checked=data.web_search_default;
    $("ai-status").textContent = aiConfigured ? "AI 키 설정됨 · " + data.model : "AI 키 설정 필요";
    $("ai-setup").open = !aiConfigured; updateState();
  }).catch(() => {$("ai-status").textContent = "서버 연결 확인 필요";});
  refreshArticles().catch(() => message("original-message", "서버 연결을 확인해주세요. README의 실행 주소로 접속해야 합니다.", true));
})();
