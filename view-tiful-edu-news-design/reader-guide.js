/* Shared by the home and article pages. Only approved imports enter this registry. */
window.ReaderGuide = (() => {
  const labels={impact:"영향",check:"확인사항",prepare:"준비사항",action:"행동",think:"생각거리"};
  let pending;
  const node=(tag,text="",cls="")=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
  function audiences(guide) {
    if(guide?.enabled!==true || !Array.isArray(guide.audiences))return [];
    return guide.audiences.filter(a=>typeof a.label==="string" && a.label.trim() && Array.isArray(a.sections))
      .map(a=>({...a,sections:a.sections.filter(s=>labels[s.type] && Array.isArray(s.items))
        .map(s=>({...s,items:s.items.filter(i=>typeof i.text==="string" && i.text.trim())})).filter(s=>s.items.length)}))
      .filter(a=>a.sections.length);
  }
  function load() {
    if(!pending)pending=fetch("data/reader-guides.json",{cache:"no-cache"})
      .then(r=>{if(!r.ok)throw Error("Guide data unavailable");return r.json();})
      .then(data=>data.version===1 && data.articles && typeof data.articles==="object"?data.articles:{})
      .catch(()=>({}));
    return pending;
  }
  function render(container,guide) {
    container.replaceChildren();const entries=audiences(guide);
    container.hidden=!entries.length;container.dataset.count=String(entries.length);
    for(const a of entries){
      const card=node("article","","role");
      const heading=node("div","","role-heading"),wrap=node("div");
      wrap.append(node("h3",a.label),node("p",a.title || ""));heading.append(wrap);card.append(heading);
      a.sections.forEach((s,index)=>{
        const section=node("section","",index?"role-prep":"");
        section.append(node("h4",labels[s.type]));const list=node("ul");
        s.items.forEach(i=>list.append(node("li",i.text)));section.append(list);card.append(section);
      });
      container.append(card);
    }
    return entries.length;
  }
  function sources(container,record) {
    container.replaceChildren();
    for(const source of record.sources || []){
      try{
        const url=new URL(source.url);
        if(!["http:","https:"].includes(url.protocol))continue;
        const a=node("a",source.name || "근거 자료");a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";container.append(a);
      }catch{}
    }
  }
  function searchText(story,record){
    const guideText=audiences(record.reader_guide).flatMap(a=>[
      a.label,a.title,...a.sections.flatMap(s=>s.items.map(i=>i.text))
    ]);
    return [record.article_title,story.title,story.category,story.description,...guideText,...(record.sources||[]).map(s=>s.name)]
      .filter(Boolean).join(" ").toLocaleLowerCase();
  }
  async function home() {
    const root=document.getElementById("guide");if(!root)return;
    root.hidden=true;
    const registry=await load();
    const stories=[...(window.LEAD_NEWS || []),...(window.ARCHIVE_ARTICLES || [])];
    const seen=new Set();
    const available=stories.filter(s=>{
      if(seen.has(s.id))return false;seen.add(s.id);
      return !!registry[s.id]?.approval_id && audiences(registry[s.id].reader_guide).length;
    });
    const tabs=root.querySelector(".guide-tabs");tabs.replaceChildren();
    if(!available.length)return;
    const leadIds=new Set((window.LEAD_NEWS||[]).map(s=>s.id));
    const featured=available.filter(s=>leadIds.has(s.id)).slice(0,3);
    for(const story of available){if(featured.length>=3)break;if(!featured.some(s=>s.id===story.id))featured.push(story);}
    const panel=root.querySelector(".guide-panel");panel.id="reader-guide-panel";panel.setAttribute("role","tabpanel");
    const buttons=[];
    function selectStory(story,tabIndex=-1,focus=false){
      const record=registry[story.id];
      const title=record.article_title || story.title.replace(/<br\s*\/?\s*>/gi," ");
      document.getElementById("guide-title").textContent=title;
      document.getElementById("guide-read").href="article.html?id="+encodeURIComponent(story.id);
      render(document.getElementById("role-grid"),record.reader_guide);
      sources(document.getElementById("guide-sources"),record);
      buttons.forEach((b,i)=>{b.setAttribute("aria-selected",String(i===tabIndex));b.tabIndex=i===tabIndex?0:-1;});
      panel.setAttribute("aria-labelledby",tabIndex>=0?buttons[tabIndex].id:"guide-title");
      if(focus && tabIndex>=0)buttons[tabIndex].focus();
    }
    featured.forEach((story,i)=>{
      const b=node("button");b.type="button";b.id="reader-guide-tab-"+i;
      b.setAttribute("role","tab");b.setAttribute("aria-controls",panel.id);
      b.append(node("small",story.category),node("span",registry[story.id].article_title || story.title.replace(/<br\s*\/?\s*>/gi," ")));
      b.addEventListener("click",()=>selectStory(story,i));
      b.addEventListener("keydown",event=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
        event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?featured.length-1:
          (i+(event.key==="ArrowRight"?1:-1)+featured.length)%featured.length;
        selectStory(featured[next],next,true);
      });
      buttons.push(b);tabs.append(b);
    });

    let search=root.querySelector(".guide-archive-search");
    if(!search){
      search=node("div","","guide-archive-search");
      const form=document.createElement("form");form.setAttribute("role","search");
      const label=node("label","지난 독자 가이드 찾기");label.htmlFor="guide-search-input";
      const field=node("div","","guide-search-field");
      const input=document.createElement("input");input.id="guide-search-input";input.type="search";input.autocomplete="off";input.placeholder="기사 제목이나 키워드를 검색하세요 (예: AI, 특목고, 전문대)";
      const submit=node("button","검색");submit.type="submit";field.append(input,submit);
      const results=node("div","","guide-search-results");results.hidden=true;
      form.append(label,field);search.append(form,results);tabs.before(search);
      const runSearch=()=>{
        const q=input.value.trim().toLocaleLowerCase();results.replaceChildren();
        if(!q){results.hidden=true;return;}
        const matches=available.filter(story=>searchText(story,registry[story.id]).includes(q)).slice(0,8);
        if(!matches.length){results.append(node("p","검색 결과가 없습니다.","guide-search-empty"));results.hidden=false;return;}
        for(const story of matches){
          const record=registry[story.id],button=node("button","","guide-search-result");button.type="button";
          button.append(node("small",story.category),node("span",record.article_title || story.title.replace(/<br\s*\/?\s*>/gi," ")));
          button.addEventListener("click",()=>{
            const featuredIndex=featured.findIndex(s=>s.id===story.id);
            selectStory(story,featuredIndex);
            results.hidden=true;input.value="";
            panel.scrollIntoView({behavior:"smooth",block:"start"});
          });
          results.append(button);
        }
        results.hidden=false;
      };
      form.addEventListener("submit",event=>{event.preventDefault();runSearch();});
      input.addEventListener("input",runSearch);
      input.addEventListener("keydown",event=>{if(event.key==="Escape"){input.value="";results.hidden=true;}});
    }
    root.hidden=false;selectStory(featured[0],0);
  }
  async function article(story) {
    const root=document.getElementById("article-reader-guide");if(!root)return;
    root.hidden=true;const record=(await load())[story.id];
    if(!record?.approval_id || !audiences(record.reader_guide).length)return;
    render(root.querySelector(".role-grid"),record.reader_guide);
    sources(root.querySelector(".guide-sources"),record);root.hidden=false;
    if(location.hash==="#article-reader-guide")root.scrollIntoView({block:"start"});
  }
  return {render,load,home,article,audiences};
})();

// 메인 전용 레이아웃은 별도 파일로 분리해 기존 기사/카테고리 로직과 충돌을 줄입니다.
if(document.getElementById("guide") && !document.querySelector('script[data-home-layout]')){
  const script=document.createElement("script");script.src="home-layout.js?v=20261021-2";script.dataset.homeLayout="true";document.head.append(script);
}
