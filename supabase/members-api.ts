const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'https://carrosclassicosbr.online','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function db(table:string,{method='GET',body,prefer='return=representation'}:{method?:string;body?:unknown;prefer?:string}={}){
 const response=await fetch(base+'/rest/v1/'+table,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:prefer},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>null);if(!response.ok)throw new Error('Não foi possível atualizar os dados.');return data;
}
const value=(s:string)=>encodeURIComponent(s);
async function current(raw:string){
 if(!raw||raw.length>200)throw new Error('Entre pelo seu link de convite.');
 const rows=await db('member_sessions?token_hash=eq.'+await hash(raw)+'&active=eq.true&expires_at=gt.'+value(new Date().toISOString())+'&select=member_id,scopes');
 if(!rows.length)throw new Error('Seu acesso expirou. Abra novamente seu convite.');
 const members=await db('members?id=eq.'+rows[0].member_id+'&active=eq.true&select=id,email');
 if(!members.length)throw new Error('Seu acesso foi desativado. Fale com o suporte da sua compra.');
 const access=await db('member_access?member_id=eq.'+members[0].id+'&active=eq.true&select=product_id,source');
 const owned=access.filter((x:{product_id:string;source:string})=>x.source==='manual'||rows[0].scopes.includes(x.product_id)).map((x:{product_id:string})=>x.product_id);
 return {...members[0],owned,scopes:rows[0].scopes};
}
async function admin(raw:string){if(!raw||raw.length>200)return false;const rows=await db('membership_admin_keys?token_hash=eq.'+await hash(raw)+'&active=eq.true&select=active');return rows.length===1;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 try{
 const b=await req.json();const action=String(b.action||'');
 if(action.startsWith('admin_')){
  if(!await admin(b.admin_token))return json({error:'Acesso administrativo não autorizado.'},401);
  if(action==='admin_data'){const [members,access,invites,products]=await Promise.all([db('members?order=created_at.desc&select=id,email,active,created_at'),db('member_access?select=member_id,product_id,active,source'),db('membership_invites?order=created_at.desc&select=id,product_id,active,created_at'),db('products?order=position')]);return json({members,access,invites,products});}
  if(action==='admin_member'){if(typeof b.active!=='boolean')return json({error:'Informe o estado do acesso.'},400);await db('members?id=eq.'+value(b.member_id),{method:'PATCH',body:{active:b.active}});if(!b.active)await db('member_sessions?member_id=eq.'+value(b.member_id),{method:'PATCH',body:{active:false}});return json({ok:true});}
  if(action==='admin_access'){
   const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Informe um e-mail válido.'},400);
   const [p]=await db('products?id=eq.'+value(b.product_id)+'&status=eq.available');if(!p)return json({error:'Produto indisponível.'},400);
   const [m]=await db('members?on_conflict=email',{method:'POST',body:{email},prefer:'resolution=ignore-duplicates,return=representation'});const member=m||(await db('members?email=eq.'+value(email)))[0];
   await db('member_access?on_conflict=member_id,product_id',{method:'POST',body:{member_id:member.id,product_id:b.product_id,active:!!b.active,source:'manual'},prefer:'resolution=merge-duplicates,return=minimal'});return json({ok:true});
  }
  if(action==='admin_invite_create'){const [p]=await db('products?id=eq.'+value(b.product_id)+'&status=eq.available');if(!p)return json({error:'Produto indisponível.'},400);const raw=token();await db('membership_invites',{method:'POST',body:{token_hash:await hash(raw),product_id:b.product_id}});return json({url:'https://carrosclassicosbr.online/area-de-membros#liberar='+raw});}
  if(action==='admin_invite_toggle'){await db('membership_invites?id=eq.'+value(b.id),{method:'PATCH',body:{active:!!b.active}});return json({ok:true});}
  if(action==='admin_import'){
   const [l]=await db('lessons?id=eq.'+value(b.lesson_id));if(!l)return json({error:'Material não encontrado.'},404);
   const origin=new URL(b.url);if(!origin.hostname.endsWith('.oaiusercontent.com'))return json({error:'Origem não permitida.'},400);
   const source=await fetch(origin);if(!source.ok)return json({error:'Arquivo de origem indisponível.'},400);
   if(Number(source.headers.get('content-length'))>52428800)return json({error:'Arquivo maior que o limite.'},400);
   const type=l.format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
   const result=await fetch(base+'/storage/v1/object/classicos-acervo/'+l.storage_path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':type,'x-upsert':'true'},body:source.body});
   if(!result.ok)return json({error:'Não foi possível hospedar este arquivo.'},502);return json({ok:true,id:l.id});
  }
  return json({error:'Ação administrativa desconhecida.'},400);
 }
 if(action==='invite_info'){
  if(!b.invite||b.invite.length>200)return json({error:'Convite inválido.'},400);
  const [invite]=await db('membership_invites?token_hash=eq.'+await hash(b.invite)+'&active=eq.true&select=product_id');
  if(!invite)return json({error:'Este convite foi desativado ou não é válido.'},403);
  const [product]=await db('products?id=eq.'+value(invite.product_id));return json({product});
 }
 if(action==='enroll'){
  const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json({error:'Informe um e-mail válido.'},400);
  if(!b.invite||b.invite.length>200)return json({error:'Use o link de convite recebido na sua compra.'},403);
  const [invite]=await db('membership_invites?token_hash=eq.'+await hash(b.invite)+'&active=eq.true&select=product_id');if(!invite)return json({error:'Este convite foi desativado ou não é válido.'},403);
  await db('members?on_conflict=email',{method:'POST',body:{email},prefer:'resolution=ignore-duplicates,return=minimal'});
  const [member]=await db('members?email=eq.'+value(email));if(!member.active)return json({error:'Seu acesso está bloqueado. Procure o suporte da sua compra.'},403);
  await db('member_access?on_conflict=member_id,product_id',{method:'POST',body:{member_id:member.id,product_id:invite.product_id,source:'invite'},prefer:'resolution=ignore-duplicates,return=minimal'});
  const [access]=await db('member_access?member_id=eq.'+member.id+'&product_id=eq.'+value(invite.product_id));if(!access.active)return json({error:'A liberação deste produto está desativada. Procure o suporte.'},403);
  let scopes=[invite.product_id];if(b.session_token){try{const prior=await current(b.session_token);if(prior.email===email)scopes=[...new Set([...scopes,...prior.scopes])]}catch{}}
  const raw=token();await db('member_sessions',{method:'POST',body:{token_hash:await hash(raw),member_id:member.id,scopes,expires_at:new Date(Date.now()+90*86400000).toISOString()}});
  return json({session_token:raw,member:{email,id:member.id},product_id:invite.product_id});
 }
 const member=await current(String(b.session_token||''));
 if(action==='state')return json({member:{id:member.id,email:member.email},owned:member.owned});
 if(action==='logout'){await db('member_sessions?token_hash=eq.'+await hash(b.session_token),{method:'PATCH',body:{active:false}});return json({ok:true});}
 if(action==='contents'){
  if(!member.owned.includes(b.product_id))return json({error:'Produto não liberado para seu e-mail.'},403);
  const [modules,lessons,progress]=await Promise.all([db('modules?product_id=eq.'+value(b.product_id)+'&order=position'),db('lessons?product_id=eq.'+value(b.product_id)+'&order=position&select=id,module_id,product_id,title,description,format,position'),db('member_progress?member_id=eq.'+member.id+'&select=lesson_id,completed')]);return json({modules,lessons,progress});
 }
 if(action==='file'||action==='progress'){
  const [l]=await db('lessons?id=eq.'+value(b.lesson_id));if(!l||!member.owned.includes(l.product_id))return json({error:'Material não liberado para seu e-mail.'},403);
  if(action==='progress'){await db('member_progress?on_conflict=member_id,lesson_id',{method:'POST',body:{member_id:member.id,lesson_id:l.id,completed:!!b.completed,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});return json({ok:true});}
  const result=await fetch(base+'/storage/v1/object/sign/classicos-acervo/'+l.storage_path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
  if(!result.ok)return json({error:'Este material está sendo preparado. Tente novamente em breve.'},404);
  const signed=await result.json();let url=base+'/storage/v1'+signed.signedURL;if(b.download)url+='&download='+encodeURIComponent(l.title+'.'+l.format);return json({url,title:l.title,format:l.format});
 }
 return json({error:'Ação desconhecida.'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Não foi possível concluir.'},400);}
});
