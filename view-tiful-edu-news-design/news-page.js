'use strict';

(function () {
  const grid=document.getElementById('archive-grid');
  const count=document.getElementById('archive-count');
  const empty=document.getElementById('archive-empty');
  const clear=document.getElementById('archive-clear');
  const input=document.getElementById('archive-query');
  const filterButtons=[...document.querySelectorAll('[data-filter]')];
  let active='all';
  let query='';

  const articles=Object.entries(window.CATEGORY_NEWS||{}).flatMap(([key,group])=>
    group.articles.map(([title,description,image,id],order)=>({key,category:group.title,title,description,image,id,order}))
  );

  function matches(article){
    if(active!=='all' && article.key!==active)return false;
    if(!query)return true;
    return `${article.title} ${article.description||''} ${article.category}`.toLocaleLowerCase().includes(query);
  }

  function render(){
    const rows=articles.filter(matches);
    grid.replaceChildren();count.textContent=String(rows.length);empty.hidden=rows.length>0;clear.hidden=!query && active==='all';
    for(const article of rows){
      const card=document.createElement('article');card.className='archive-card';
      const href=`article.html?id=${encodeURIComponent(article.id)}`;
      if(article.image){
        const imageLink=document.createElement('a');imageLink.className='archive-card-image';imageLink.href=href;
        const image=document.createElement('img');image.src=`assets/${article.image}.jpg`;image.alt='';imageLink.append(image);
        card.append(imageLink);
      }
      const category=document.createElement('p');category.className='category';category.textContent=article.category;
      const title=document.createElement('h2'),titleLink=document.createElement('a');titleLink.href=href;titleLink.textContent=article.title;title.append(titleLink);
      const description=document.createElement('p');description.textContent=article.description||'기사 내용을 확인해보세요.';
      const read=document.createElement('a');read.className='archive-read';read.href=href;read.textContent='기사 읽기 →';
      card.append(category,title,description,read);grid.append(card);
    }
  }

  filterButtons.forEach(button=>button.addEventListener('click',()=>{
    active=button.dataset.filter;
    filterButtons.forEach(b=>b.setAttribute('aria-selected',String(b===button)));
    render();
  }));
  document.getElementById('archive-search').addEventListener('submit',event=>{event.preventDefault();query=input.value.trim().toLocaleLowerCase();render();});
  input.addEventListener('input',()=>{query=input.value.trim().toLocaleLowerCase();render();});
  clear.addEventListener('click',()=>{active='all';query='';input.value='';filterButtons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.filter==='all')));render();});
  document.getElementById('header-search').addEventListener('submit',event=>{event.preventDefault();input.value=event.currentTarget.querySelector('input').value.trim();query=input.value.toLocaleLowerCase();input.focus();render();});
  render();
})();
