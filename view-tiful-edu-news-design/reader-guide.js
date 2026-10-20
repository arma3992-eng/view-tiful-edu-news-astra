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
    const panel=root.querySelector(".guide-panel");panel.id="reader-guide-panel";panel.setAttribute("role","tabpanel");
    const buttons=[];
    function select(index,focus=false){
      const story=available[index],record=registry[story.id];
      document.getElementById("guide-title").textContent=record.article_title || story.title.replace(/<br\s*\/?\s*>/gi," ");
      document.getElementById("guide-read").href="article.html?id="+encodeURIComponent(story.id);
      render(document.getElementById("role-grid"),record.reader_guide);
      sources(document.getElementById("guide-sources"),record);
      buttons.forEach((b,i)=>{b.setAttribute("aria-selected",String(i===index));b.tabIndex=i===index?0:-1;});
      panel.setAttribute("aria-labelledby",buttons[index].id);
      if(focus)buttons[index].focus();
    }
    available.forEach((story,i)=>{
      const b=node("button");b.type="button";b.id="reader-guide-tab-"+i;
      b.setAttribute("role","tab");b.setAttribute("aria-controls",panel.id);
      b.append(node("small",story.category),node("span",registry[story.id].article_title || story.title.replace(/<br\s*\/?\s*>/gi," ")));
      b.addEventListener("click",()=>select(i));
      b.addEventListener("keydown",event=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
        event.preventDefault();select(event.key==="Home"?0:event.key==="End"?available.length-1:
          (i+(event.key==="ArrowRight"?1:-1)+available.length)%available.length,true);
      });
      buttons.push(b);tabs.append(b);
    });
    root.hidden=false;select(0);
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
