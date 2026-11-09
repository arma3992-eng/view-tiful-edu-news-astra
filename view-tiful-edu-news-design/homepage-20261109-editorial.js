'use strict';
// 2026-11-09 approved editorial homepage: reuse existing images and markup.
(() => {
 const order=[
  ['vocational-employment-20261106','중·고교','공식 취업률 55.8%와 졸업생 중 취업자 25.7%의 차이'],
  ['ai-semiconductor-global-practice-20261107','AI·디지털교육','퍼듀대 4주·토론토대 2주, 해외 실습의 실제 내용'],
  ['topik-2027-schedule-20261107','입시·수능','2027 TOPIK 국내 접수·시험·성적 발표 일정']
 ];
 const all=window.VIEWTIFUL_20261109_STORIES||[];
 const leads=order.map(([id,tabCategory,teaser])=>{
  const s=all.find(item=>item.id===id);
  return s ? {...s,tabCategory,teaser,video:'',fullVideo:''}:null;
 });
 if(leads.every(Boolean)) window.LEAD_NEWS=leads;
 document.addEventListener('DOMContentLoaded',()=>{
  const groups=['admissions','gifted','general-autonomous','digital','school-policy'];
  const cards=[...document.querySelectorAll('#interests .category-grid .topic')];
  groups.forEach((key,i)=>{
   const card=cards[i],group=window.CATEGORY_NEWS?.[key];if(!card||!group)return;
   card.id='category-'+key;
   const link=card.querySelector('.topic-arrow');
   if(link){link.href='category.html?type='+encodeURIComponent(key);link.setAttribute('aria-label',group.title);}
   const heading=card.querySelector('h3');if(heading)heading.textContent=group.title;
   const desc=card.querySelector('p');if(desc)desc.textContent=group.description;
   const feature=card.querySelector('.topic-feature');
   const article=group.articles[0];
   if(feature&&article){
    feature.removeAttribute('data-article');
    const image=feature.querySelector('img'),label=feature.querySelector('strong');
    if(image){image.src='assets/'+article[2]+'.jpg';image.alt=article[0]+' 연출 이미지';}
    if(label)label.textContent=article[0];
    feature.onclick=()=>{location.href='article.html?id='+encodeURIComponent(article[3]);};
   }
   const ul=card.querySelector('ul');
   if(ul){
    ul.replaceChildren();
    group.articles.slice(1,4).forEach(item=>{
     const li=document.createElement('li'),button=document.createElement('button');
     button.textContent=item[0];button.onclick=()=>{location.href='article.html?id='+encodeURIComponent(item[3]);};
     li.append(button);ul.append(li);
    });
   }
  });
  cards.slice(groups.length).forEach(card=>{card.hidden=true;});
 });
})();