/* 두 검증 화면에 검색 출처·읽기 실패·교차 대조 한계를 표시한다. */
window.renderWebResearch = function(container,report) {
  const research=report.web_research;
  if(!research || !research.enabled)return;
  const node=(tag,text,className="")=>{const item=document.createElement(tag);item.textContent=text;if(className)item.className=className;return item;};
  const box=node("details","","research-results"), title=node("summary","자동 웹 검색 · 본문 읽기 "+(research.read_pages || 0)+"개 · 사이트 "+(research.sites || []).length+"곳");
  box.append(title);box.open=research.status!=="read" || (research.warnings || []).length>0;
  if(research.queries && research.queries.length)box.append(node("p","검색어: "+research.queries.join(" / "),"secondary"));
  for(const warning of research.warnings || [])box.append(node("p",warning,"notice"));
  for(const source of research.sources || []) {
    const row=node("p",""), link=node("a",source.name || source.url);
    link.href=source.resolved_url || source.url;link.target="_blank";link.rel="noopener noreferrer";
    row.append(link,document.createTextNode(source.status==="read"?" · 본문 읽음":" · 본문 읽기 실패"));box.append(row);
    if(source.error)box.append(node("p",source.error,"secondary"));
  }
  box.append(node("p","검색 결과 수는 독립 검증 수가 아닙니다. 기사별 실제 인용과 같은 원자료 전재·단일 근거 여부를 확인한 뒤 사람이 승인합니다.","secondary"));
  container.append(box);
};
