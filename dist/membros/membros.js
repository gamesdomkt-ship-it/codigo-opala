'use strict';
const GATEWAY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbnJyaXNjdmp4aHhrZXJoYmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDk3MzAsImV4cCI6MjExMDA4NTczMH0.MC_gLiNXCocBwAqWWfplKlgPL1S6pZIzvNtD40rLIK8";
const API='https://fmnrriscvjxhxkerhbdv.supabase.co';
const KEY='sb_publishable_-VR-mc_zw5j9-71tK3G_fg_pyjFx6lF';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let expandedModules=new Set();
const moduleCovers={guia:{asset:'ebook',alt:'Guia O Código do Opala Raiz'},catalogo:{asset:'catalog',alt:'Catálogo de peças GM Opala'},oficina:{asset:'workshop',alt:'Manuais de oficina e diagramas técnicos do Opala'},proprietario:{asset:'manuals',alt:'Manuais do proprietário do Opala'},checklists:{asset:'checklists',alt:'Checklists de revisão do Opala'},planilha:{asset:'spreadsheet',alt:'Planilha de controle de manutenção do Opala'}};
let session=null,products=[],owned=[],modules=[],lessons=[],progress=[],selectedProduct=null,filter='all',toastTimer,email='';
try{session=JSON.parse(localStorage.getItem('classicos-session')||'null')}catch{}
let pending=sessionStorage.getItem('classicos-release')||'';
const fragment=new URLSearchParams(location.hash.slice(1));
if(fragment.has('liberar')){pending=fragment.get('liberar');sessionStorage.setItem('classicos-release',pending);history.replaceState(null,'',location.pathname);}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6500)}
function saveSession(value){session=value;if(value)localStorage.setItem('classicos-session',JSON.stringify(value));else localStorage.removeItem('classicos-session');updateAccount()}
function updateAccount(){$('#account-label').textContent=session?.user?.email||'Bem-vindo à garagem';$('#account-button').innerHTML=session?'Sair ↗':'Entrar ↗';$('#owned-count').textContent=owned.length}
async function memberApi(action,data={}){
 const controller=action==='file'?new AbortController():null;
 const timeout=controller?setTimeout(()=>controller.abort(),25000):null;
 try{
  const response=await fetch(API+'/functions/v1/members-api',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+GATEWAY,'Content-Type':'application/json'},body:JSON.stringify({action,session_token:session?.session_token,...data}),...(controller?{signal:controller.signal}:{})});
  const result=await response.json().catch(()=>({error:'Serviço temporariamente indisponível.'}));
  if(!response.ok)throw new Error(result.error||'Não foi possível concluir. Tente novamente.');return result;
 }catch(error){if(error.name==='AbortError')throw new Error('A conexão demorou para responder. Verifique sua internet e tente novamente.');throw error}
 finally{if(timeout)clearTimeout(timeout)}
}
function driveConsultUrl(lesson){
 try{const url=new URL(lesson.drive_url);return url.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(url.hostname)?url.href:null}catch{return null}
}
async function request(path){const response=await fetch(API+path,{headers:{apikey:KEY}});if(!response.ok)throw new Error('Não foi possível carregar a garagem.');return response.json()}
function setView(view){$('#catalog-view').hidden=!['catalog','owned'].includes(view);$('#product-view').hidden=view!=='product';$('#help-view').hidden=view!=='help';$('#support-view').hidden=view!=='support';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='owned'||view==='catalog'){filter=view==='owned'?'owned':'all';renderProducts()}window.scrollTo({top:0,behavior:'instant'})}
function renderProducts(){const query=$('#product-search').value.trim().toLocaleLowerCase('pt-BR');const list=products.filter(p=>(filter==='all'||owned.includes(p.id))&&(p.title+' '+p.description).toLocaleLowerCase('pt-BR').includes(query));$('#all-filter').classList.toggle('selected',filter==='all');$('#owned-filter').classList.toggle('selected',filter==='owned');$('#catalog-count').textContent=list.length+' produtos';$('#owned-count').textContent=owned.length;$('#empty-state').hidden=list.length>0;$('#empty-state').textContent=filter==='owned'&&!session?'Entre com seu e-mail para ver seus produtos liberados.':filter==='owned'?'Você ainda não liberou um produto. Use o link recebido após a compra.':'Nenhum produto encontrado para essa busca.';
 $('#products').innerHTML=list.map(p=>{const access=owned.includes(p.id),soon=p.status==='soon';return `<article class="product-card"><div class="cover"><span class="badge ${soon?'soon':access?'':'locked'}">${soon?'EM BREVE':access?'✓ ACESSO LIBERADO':'♧ ACESSO BLOQUEADO'}</span>${p.image?`<img src="${esc(p.image)}" alt="Acervo digital O Código do Opala Raiz" loading="lazy">`:`<div class="cover-art ${p.id==='antiferrugem'?'gold':''}"><span class="edition">CÓDIGO DOS CLÁSSICOS BR</span><strong class="model">${p.id==='antiferrugem'?'ANTIFERRUGEM':p.id==='fusca-raiz'?'FUSCA':'CHEVETTE'}</strong><span class="line"></span><span class="year">${p.id==='antiferrugem'?'PRESERVE SEU CLÁSSICO':'UM CLÁSSICO. UMA HISTÓRIA.'}</span></div>`}</div><div class="card-body"><div class="card-meta">${esc(p.subtitle)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="card-bottom"><small>${p.id==='opala-raiz'?'6 módulos • 16 materiais':p.id==='antiferrugem'?'Acervo complementar':'Nova coleção'}</small><button class="card-action" data-product="${esc(p.id)}">${soon?'Conhecer':access?'Acessar produto':'Liberar acesso'} <span>↗</span></button></div></div></article>`}).join('');
 document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>openProduct(b.dataset.product)));
}
async function showAuth(){
 const invite=pending;
 const button=$('#email-form button[type="submit"]');
 $('#auth-title').textContent=invite?'Identificando seu produto…':'Entre com seu convite.';
 $('#auth-description').textContent=invite?'Aguarde um instante.':'Para entrar, abra o link de convite recebido após a compra. Seu acesso fica salvo neste dispositivo.';
 $('#email-form').hidden=true;$('#auth-message').textContent='';button.disabled=!!invite;
 if(!$('#auth-dialog').open)$('#auth-dialog').showModal();
 if(!invite)return;
 try{
  const data=await memberApi('invite_info',{invite});
  if(pending!==invite)return;
  $('#auth-title').textContent=data.product.title;
  $('#auth-description').textContent='Digite seu e-mail abaixo para acessar este produto. Você não precisa de senha.';
  $('#email-form').hidden=false;
  button.innerHTML='Acessar produto <span>→</span>';
 }catch(error){
  if(pending!==invite)return;
  $('#auth-title').textContent='Convite indisponível.';
  $('#auth-description').textContent=error.message;
 }finally{if(pending===invite)button.disabled=false;}
}
async function loadOwned(){if(!session?.session_token){saveSession(null);owned=[];return}try{const data=await memberApi('state');owned=data.owned;session.user=data.member;saveSession(session)}catch(e){saveSession(null);owned=[];toast(e.message)}}
async function redeem(){if(!pending||!session)return;try{const data=await memberApi('enroll',{invite:pending,email:session.user.email});saveSession({session_token:data.session_token,user:data.member});pending='';sessionStorage.removeItem('classicos-release');await loadOwned();toast('Seu produto foi liberado!');await openProduct(data.product_id)}catch(e){toast(e.message)}}
async function openProduct(id,preview=false){const p=products.find(x=>x.id===id);if(!p)return;if(!owned.includes(id)&&!preview){$('#locked-title').textContent=p.title;$('#locked-description').textContent=p.status==='soon'?'Este produto está em preparação. Ele fará parte do catálogo da sua garagem assim que estiver disponível.':session?'Este produto ainda não está liberado para a sua conta. Abra o link de liberação recebido após a compra para adicionar o acesso ao seu e-mail.':'Já tem acesso? Entre com seu e-mail ou utilize o link de liberação recebido após a compra.';$('#locked-actions').innerHTML=(p.status==='available'?`<button class="primary" id="locked-login">${session?'Entendi':'Entrar com meu e-mail'} →</button><button class="small-btn" id="preview-product">Ver módulos do produto ↗</button>`:'<button class="small-btn" id="locked-login">Voltar à garagem</button>');$('#locked-login')?.addEventListener('click',()=>{$('#locked-dialog').close();if(!session&&p.status==='available')showAuth()});$('#preview-product')?.addEventListener('click',()=>{$('#locked-dialog').close();openProduct(id,true)});$('#locked-dialog').showModal();return}
 expandedModules=new Set(['guia']);selectedProduct=p;setView('product');$('#product-heading').innerHTML=`<div class="product-head"><div><div class="eyebrow orange">${preview?'CONHEÇA O ACERVO • ACESSO BLOQUEADO':'SUA GARAGEM • ACESSO LIBERADO'}</div><h1>${esc(p.title)}</h1><p>${esc(p.description)}</p></div>${p.image?`<img src="${esc(p.image)}" alt="Kit de materiais do Opala">`:''}</div>`;$('#lessons').innerHTML='<p>Preparando seus materiais…</p>';$('#lesson-search').value='';
 if(preview){const outline=await fetch('/membros/opala-outline.json').then(r=>r.json());modules=outline.modules;lessons=outline.lessons;progress=[];renderLessons();$('.progress-box').hidden=true;return}$('.progress-box').hidden=false;
 try{const content=await memberApi('contents',{product_id:id});modules=content.modules;lessons=content.lessons;progress=content.progress;renderLessons()}catch(error){$('#lessons').innerHTML=`<div class="error-panel">${esc(error.message)} <button class="text-btn" id="retry-product">Tentar novamente</button></div>`;$('#retry-product')?.addEventListener('click',()=>openProduct(id))}
}
function renderLessons(){const query=$('#lesson-search').value.trim().toLocaleLowerCase('pt-BR');const done=new Set(progress.filter(x=>x.completed).map(x=>x.lesson_id));const count=lessons.filter(x=>done.has(x.id)).length;const percentage=lessons.length?Math.round(count/lessons.length*100):0;$('#progress-value').textContent=percentage+'%';$('#course-progress').value=percentage;$('#progress-caption').textContent=count+' de '+lessons.length+' materiais concluídos';$('#module-nav').innerHTML=modules.map((m,i)=>`<button class="module-link" data-module="${esc(m.id)}"><span>${String(i+1).padStart(2,'0')}</span> ${esc(m.title)} <small>${lessons.filter(l=>l.module_id===m.id).length}</small></button>`).join('');$('#lessons').innerHTML=modules.map((m,i)=>{const rows=lessons.filter(l=>l.module_id===m.id&&(l.title+' '+l.description).toLocaleLowerCase('pt-BR').includes(query));if(!rows.length)return '';const cover=moduleCovers[m.id]||{asset:'kit',alt:m.title};return `<details class="module-section module-with-cover" id="module-${esc(m.id)}" ${query||expandedModules.has(m.id)?'open':''}><summary class="module-cover" aria-controls="module-materials-${esc(m.id)}"><span class="module-cover-image"><img src="/assets/${cover.asset}.webp" srcset="/assets/${cover.asset}-small.webp 480w, /assets/${cover.asset}.webp 1000w" sizes="(max-width:760px) 90vw, 240px" width="800" height="600" alt="${esc(cover.alt)}" loading="lazy" decoding="async"></span><span class="module-cover-copy"><span class="eyebrow orange">MÓDULO ${String(i+1).padStart(2,'0')} · ${rows.length} ${rows.length===1?'MATERIAL':'MATERIAIS'}</span><span class="module-cover-title" role="heading" aria-level="2">${esc(m.title)}</span><span class="module-cover-description">${esc(m.description)}</span><span class="module-cover-action"><span class="cover-closed">Ver materiais</span><span class="cover-open">Ocultar materiais</span><span class="cover-chevron" aria-hidden="true">⌄</span></span></span></summary><div class="module-materials" id="module-materials-${esc(m.id)}">${rows.map(l=>`<article class="lesson"><div class="file-icon">${esc(l.format.toUpperCase())}</div><div class="lesson-info"><h3>${esc(l.title)}</h3><p>${esc(l.description)}</p></div><div class="lesson-actions">${driveConsultUrl(l)?`<a class="consult" href="${esc(driveConsultUrl(l))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" aria-label="Consultar ${esc(l.title)} no Google Drive (abre em nova aba)">Consultar ↗</a>`:`<button class="consult" data-consult="${esc(l.id)}">Consultar ↗</button>`}<button data-download="${esc(l.id)}">Baixar ↓</button><button class="complete ${done.has(l.id)?'done':''}" data-complete="${esc(l.id)}" aria-pressed="${done.has(l.id)}">${done.has(l.id)?'✓ Concluído':'○ Concluir'}</button></div></article>`).join('')}</div></details>`}).join('')||'<div class="empty">Nenhum material encontrado para essa busca.</div>';
 if(!owned.includes(selectedProduct.id)){document.querySelectorAll('.lesson-actions').forEach(el=>el.innerHTML='<span class="locked-material">♧ Material exclusivo para membros</span>')}
 document.querySelectorAll('.module-with-cover').forEach(section=>section.addEventListener('toggle',()=>{if(query)return;const id=section.id.replace('module-','');if(section.open)expandedModules.add(id);else expandedModules.delete(id)}));
 document.querySelectorAll('[data-module]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-module]').forEach(x=>x.classList.toggle('active',x===b));const target=document.getElementById('module-'+b.dataset.module);if(target){target.open=true;expandedModules.add(b.dataset.module);target.scrollIntoView({behavior:'smooth',block:'start'})}}));document.querySelectorAll('[data-consult]').forEach(b=>b.addEventListener('click',()=>openFile(b.dataset.consult,false,b)));document.querySelectorAll('[data-download]').forEach(b=>b.addEventListener('click',()=>openFile(b.dataset.download,true,b)));document.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('click',()=>toggleCompleted(b.dataset.complete,b)));
}
async function toggleCompleted(id,button){button.disabled=true;const old=progress.find(p=>p.lesson_id===id);const completed=!old?.completed;try{await memberApi('progress',{lesson_id:id,completed});progress=progress.filter(p=>p.lesson_id!==id);progress.push({lesson_id:id,completed});renderLessons();toast(completed?'Material marcado como concluído.':'Material reaberto para consulta.')}catch(e){toast(e.message);button.disabled=false}}
async function openFile(id,download,button){
 const original=button.textContent;button.disabled=true;button.textContent=download?'Preparando…':'Carregando…';
 try{
  const data=await memberApi('file',{lesson_id:id,download});
  if(download){
   const link=document.createElement('a');link.href=data.url;link.download='';link.rel='noopener noreferrer';document.body.appendChild(link);link.click();link.remove();
  }else{
   $('#viewer-title').textContent=data.title;
   $('#viewer-open').href=data.url;
   $('#viewer-open').textContent=data.viewer==='google_drive'?'Abrir no Google Drive ↗':'Abrir arquivo em nova aba ↗';
   $('#viewer-note').textContent='Consulte o material em uma nova aba para manter a área de membros leve no seu dispositivo. Para salvar uma cópia, use o botão Baixar na lista de materiais.';
   $('#viewer-dialog').showModal();
  }
 }catch(error){toast(error.message)}finally{button.disabled=false;button.textContent=original}
}
$('#email-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;const email=$('#email').value.trim().toLowerCase();$('#auth-message').textContent='Preparando sua garagem…';try{const data=await memberApi('enroll',{email,invite:pending});saveSession({session_token:data.session_token,user:data.member});pending='';sessionStorage.removeItem('classicos-release');$('#auth-dialog').close();await loadOwned();renderProducts();await openProduct(data.product_id);toast('Bem-vindo! Seu produto está liberado.')}catch(e){$('#auth-message').textContent=e.message}finally{button.disabled=false}});
$('#account-button').addEventListener('click',async()=>{if(session){try{await memberApi('logout')}catch{}saveSession(null);owned=[];modules=[];lessons=[];progress=[];$('#viewer-dialog').close();setView('catalog');toast('Você saiu da sua conta. Use seu convite para entrar novamente.')}else showAuth()});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));$('#all-filter').addEventListener('click',()=>{filter='all';renderProducts()});$('#owned-filter').addEventListener('click',()=>{filter='owned';renderProducts()});$('#product-search').addEventListener('input',renderProducts);$('#lesson-search').addEventListener('input',renderLessons);$('#back-catalog').addEventListener('click',()=>setView('catalog'));$('#explore-button').addEventListener('click',()=>{if(!session)showAuth();else{filter='owned';renderProducts();$('#catalog-heading').scrollIntoView({behavior:'smooth'})}});
async function init(){updateAccount();try{products=await request('/rest/v1/products?select=*&order=position',{auth:false});await loadOwned();renderProducts();if(pending){if(session)await redeem();else showAuth()}else if(location.pathname.endsWith('/opala-raiz'))await openProduct('opala-raiz',!owned.includes('opala-raiz'))}catch(error){$('#products').innerHTML=`<div class="error-panel">${esc(error.message)} <button class="text-btn" id="retry-load">Tentar novamente</button></div>`;$('#retry-load').addEventListener('click',init)}}init();
