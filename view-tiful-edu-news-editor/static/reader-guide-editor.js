/* Optional guide editor; content is serialized by the existing draft save flow. */
window.createReaderGuideEditor = function (onChange) {
  const $ = id => document.getElementById(id);
  const labels = {impact:"영향",check:"확인사항",prepare:"준비사항",action:"행동",think:"생각거리"};
  let legacy = [];
  const uid = () => "g-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
  function el(tag,text="",cls="") {const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;}
  function button(text,run) {const b=el("button",text,"text-button");b.type="button";b.addEventListener("click",()=>{run();onChange();});return b;}
  function input(parent,label,cls,value,max=2500) {
    const row=el("label",label), n=el(cls==="rg-text"?"textarea":"input");
    n.className=cls; n.value=value || ""; n.maxLength=max;
    if(n.tagName==="TEXTAREA")n.classList.add("small-textarea");
    row.append(n);parent.append(row);return n;
  }
  function addItem(container,item={text:"",item_ids:[]}) {
    if(container.children.length>=10)return;
    const row=el("div","","rg-item");row.dataset.refs=JSON.stringify(item.item_ids || []);
    input(row,"내용","rg-text",item.text);
    row.append(button("내용 지우기",()=>row.remove()));container.append(row);
  }
  function addSection(container,section={id:uid(),type:"check",items:[{text:"",item_ids:[]}]}) {
    if(container.children.length>=5)return;
    const row=el("div","","rg-section");row.dataset.id=section.id;
    const label=el("label","안내 종류"),select=el("select","","rg-kind");
    for(const [key,value] of Object.entries(labels)){const o=el("option",value);o.value=key;select.append(o);}
    select.value=section.type;label.append(select);row.append(label);
    const items=el("div","","rg-items");section.items.forEach(i=>addItem(items,i));row.append(items);
    row.append(button("+ 내용 추가",()=>addItem(items)),button("안내 종류 지우기",()=>row.remove()));container.append(row);
  }
  function addAudience(a={id:uid(),label:"",title:"",sections:[]}) {
    const list=$("reader-guide-audiences");if(list.children.length>=12)return;
    const row=el("div","","draft-block rg-audience");row.dataset.id=a.id;
    input(row,"대상 이름","rg-label",a.label,60);input(row,"대상별 제목","rg-title",a.title,120);
    const sections=el("div","","rg-sections");a.sections.forEach(s=>addSection(sections,s));row.append(sections);
    row.append(button("+ 안내 종류 추가",()=>addSection(sections)),button("대상 지우기",()=>row.remove()));list.append(row);
  }
  function read() {
    if($("reader-guide-mode").value==="legacy")return null;
    return {enabled:$("reader-guide-mode").value==="on",audiences:[...$("reader-guide-audiences").children].map(a=>({
      id:a.dataset.id,label:a.querySelector(".rg-label").value,title:a.querySelector(".rg-title").value,
      sections:[...a.querySelector(".rg-sections").children].map(s=>({
        id:s.dataset.id,type:s.querySelector(".rg-kind").value,
        items:[...s.querySelector(".rg-items").children].map(i=>({text:i.querySelector(".rg-text").value,item_ids:JSON.parse(i.dataset.refs)}))
      }))
    }))};
  }
  function sync() {
    const mode=$("reader-guide-mode").value;
    $("reader-guide-edit").hidden=mode==="legacy";
    $("legacy-guidance").hidden=mode!=="legacy";
    $("reader-guide-import").hidden=!legacy.length;
  }
  function load(guide,old,metadata={}) {
    legacy=old || [];
    $("reader-guide-mode").value=guide==null?"legacy":guide.enabled?"on":"off";
    $("reader-guide-audiences").replaceChildren();
    (guide?.audiences || []).forEach(addAudience);
    $("reader-guide-note").value=metadata.reader_guide_note || "";
    const p=metadata.reader_guide_latest?.proposal;
    $("reader-guide-recommendation").textContent=p?
      ({recommended:"적용 권장",optional:"선택 적용",not_recommended:"미적용 권장"}[p.recommendation]+" · "+p.reason):
      "AI 추천 전입니다. 사용 여부는 편집자가 결정합니다.";
    $("reader-guide-initial").textContent=metadata.reader_guide_initial?
      JSON.stringify(metadata.reader_guide_initial.proposal,null,2):"보존된 AI 최초 제안이 없습니다.";
    sync();
  }
  $("reader-guide-mode").addEventListener("change",()=>{sync();onChange();});
  $("reader-guide-add").addEventListener("click",()=>{addAudience();onChange();});
  $("reader-guide-import").addEventListener("click",()=>{
    if($("reader-guide-audiences").children.length && !confirm("현재 가이드 대신 기존 독자 안내를 가져올까요?"))return;
    $("reader-guide-mode").value="off";$("reader-guide-audiences").replaceChildren();
    legacy.forEach(g=>addAudience({id:uid(),label:({student:"학생",parent:"학부모",teacher:"교사"})[g.audience],
      title:g.heading,sections:[{id:uid(),type:"action",items:[{text:g.text,item_ids:g.item_ids}]}]}));
    sync();onChange();
  });
  function render(container) {
    const guide=read();if(!guide?.enabled)return;
    const box=el("section","","reader-guide-preview");box.append(el("h3","이 기사를 읽은 뒤 · 독자 가이드"));
    for(const a of guide.audiences){
      const card=el("section","","draft-audience");
      card.append(el("strong",a.label),el("h4",a.title));
      for(const s of a.sections){
        if(!s.items.some(i=>i.text.trim()))continue;
        card.append(el("h4",labels[s.type]));const ul=el("ul");
        s.items.filter(i=>i.text.trim()).forEach(i=>ul.append(el("li",i.text)));card.append(ul);
      }
      box.append(card);
    }
    container.append(box);
  }
  function openLocation(id) {
    const plain=id.replace(/_\d+$/,"");
    for(const a of $("reader-guide-audiences").children){
      const prefix="reader-"+a.dataset.id;
      let input=plain===prefix+"-label"?a.querySelector(".rg-label"):plain===prefix+"-title"?a.querySelector(".rg-title"):null;
      for(const s of a.querySelector(".rg-sections").children){
        [...s.querySelector(".rg-items").children].forEach((row,i)=>{
          if(plain===prefix+"-"+s.dataset.id+"-"+i)input=row.querySelector(".rg-text");
        });
      }
      if(input){input.scrollIntoView({behavior:"smooth",block:"center"});input.focus();return true;}
    }
    return false;
  }
  return {load,read,render,openLocation,note:()=>$("reader-guide-note").value,
    refs:()=>read()?.audiences.flatMap(a=>a.sections.flatMap(s=>s.items.flatMap(i=>i.item_ids))) || []};
};
