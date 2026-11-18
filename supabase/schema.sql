create schema if not exists private;
create table public.products (id text primary key,title text not null,subtitle text not null,description text not null,image text,status text not null check(status in ('available','soon')),position int not null default 0);
create table public.modules (id text primary key,product_id text not null references public.products(id),title text not null,description text not null,position int not null);
create table public.lessons (id text primary key,module_id text not null references public.modules(id),product_id text not null references public.products(id),title text not null,description text not null,format text not null,position int not null,storage_path text not null);
create table public.entitlements (user_id uuid not null references auth.users(id) on delete cascade,product_id text not null references public.products(id),created_at timestamptz not null default now(),primary key(user_id,product_id));
create table public.lesson_progress (user_id uuid not null references auth.users(id) on delete cascade,lesson_id text not null references public.lessons(id),completed boolean not null default true,updated_at timestamptz not null default now(),primary key(user_id,lesson_id));
create table private.enrollment_links (token_hash text primary key,product_id text not null references public.products(id),active boolean not null default true,created_at timestamptz not null default now());
alter table public.products enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.entitlements enable row level security;
alter table public.lesson_progress enable row level security;
alter table private.enrollment_links enable row level security;
create policy catalog_visible on public.products for select to anon,authenticated using(true);
create policy own_entitlements on public.entitlements for select to authenticated using(user_id=(select auth.uid()));
create policy owned_modules on public.modules for select to authenticated using(exists(select 1 from public.entitlements e where e.user_id=(select auth.uid()) and e.product_id=modules.product_id));
create policy owned_lessons on public.lessons for select to authenticated using(exists(select 1 from public.entitlements e where e.user_id=(select auth.uid()) and e.product_id=lessons.product_id));
create policy own_progress_read on public.lesson_progress for select to authenticated using(user_id=(select auth.uid()));
create policy own_progress_insert on public.lesson_progress for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.lessons l where l.id=lesson_id));
create policy own_progress_update on public.lesson_progress for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.lessons l where l.id=lesson_id));
grant select on public.products to anon,authenticated;
grant select on public.modules,public.lessons,public.entitlements to authenticated;
grant select,insert,update on public.lesson_progress to authenticated;
create function private.redeem(p_token text) returns text language plpgsql security definer set search_path='' as $$
declare v_product text;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para liberar o produto.'; end if;
 select product_id into v_product from private.enrollment_links where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and active=true;
 if v_product is null then raise exception 'Link de liberação inválido ou desativado.'; end if;
 insert into public.entitlements(user_id,product_id) values(auth.uid(),v_product) on conflict do nothing;
 return v_product;
end;$$;
revoke all on function private.redeem(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.redeem(text) to authenticated;
create function public.redeem_product(p_token text) returns text language sql security invoker set search_path='' as $$select private.redeem(p_token);$$;
revoke all on function public.redeem_product(text) from public;
grant execute on function public.redeem_product(text) to authenticated;
insert into public.products values
('opala-raiz','O Código do Opala Raiz','CHEVROLET • ACERVO DIGITAL','Manuais, referências e ferramentas para cuidar do seu Opala.','/assets/kit.webp','available',1),
('antiferrugem','Código Antiferrugem','CONSERVAÇÃO • COMPLEMENTO','Os cuidados essenciais para preservar seu clássico.',null,'soon',2),
('fusca-raiz','O Código do Fusca Raiz','VOLKSWAGEN • EM BREVE','Um novo acervo para uma paixão que atravessa gerações.',null,'soon',3),
('chevette-raiz','O Código do Chevette Raiz','CHEVROLET • EM BREVE','Mais um clássico terá seu lugar na nossa garagem.',null,'soon',4);
insert into public.modules values
('guia','opala-raiz','Comece pelo guia','O ponto de partida para conhecer e cuidar do seu Opala.',1),
('catalogo','opala-raiz','Catálogo de peças GM','Consulte referências antes de escolher uma peça.',2),
('oficina','opala-raiz','Oficina e diagramas técnicos','Referências de mecânica, motores e oficina.',3),
('proprietario','opala-raiz','Manuais do proprietário','Encontre o manual correspondente ao ano do seu Opala.',4),
('checklists','opala-raiz','Checklists de revisão','Oito listas para organizar os cuidados com seu clássico.',5),
('planilha','opala-raiz','Controle de manutenção','Organize o histórico de manutenção e os gastos.',6);
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('guia-opala','guia','opala-raiz','O Código do Opala Raiz','Seu guia principal de consulta • 138 páginas','pdf','1','opala-raiz/guia-opala.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('catalogo-gm','catalogo','opala-raiz','Catálogo de Peças GM','Referências e identificação de peças • 449 páginas','pdf','1','opala-raiz/catalogo-gm.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('oficina-1','oficina','opala-raiz','Manual da Mecânica do Opala - 53 páginas','Material de consulta do seu Opala','pdf','1','opala-raiz/oficina-1.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('oficina-2','oficina','opala-raiz','Manual de Oficina e Diagramas Técnicos - (Motor GM151 e GM250)','Material de consulta do seu Opala','pdf','2','opala-raiz/oficina-2.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('proprietario-1','proprietario','opala-raiz','Manual-do-Proprietário-Opala-92','Material de consulta do seu Opala','pdf','1','opala-raiz/proprietario-1.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('proprietario-2','proprietario','opala-raiz','opala-com-manual-1978','Material de consulta do seu Opala','pdf','2','opala-raiz/proprietario-2.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('proprietario-3','proprietario','opala-raiz','opala-com-manual-1988','Material de consulta do seu Opala','pdf','3','opala-raiz/proprietario-3.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-1','checklists','opala-raiz','01. Checklist Elétrica Básica - Opala','Material de consulta do seu Opala','pdf','1','opala-raiz/checklists-1.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-2','checklists','opala-raiz','02. Checklist Mecânica Básica','Material de consulta do seu Opala','pdf','2','opala-raiz/checklists-2.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-3','checklists','opala-raiz','03. Checklist Freios','Material de consulta do seu Opala','pdf','3','opala-raiz/checklists-3.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-4','checklists','opala-raiz','04. Checklist Pre Viagem','Material de consulta do seu Opala','pdf','4','opala-raiz/checklists-4.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-5','checklists','opala-raiz','05. Checklist Carburador Alimentacao','Material de consulta do seu Opala','pdf','5','opala-raiz/checklists-5.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-6','checklists','opala-raiz','06. Checklist Carroceria Estrutura','Material de consulta do seu Opala','pdf','6','opala-raiz/checklists-6.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-7','checklists','opala-raiz','07. Checklist Conservacao Estetica','Material de consulta do seu Opala','pdf','7','opala-raiz/checklists-7.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('checklists-8','checklists','opala-raiz','08. Checklist Suspensao Rodas','Material de consulta do seu Opala','pdf','8','opala-raiz/checklists-8.pdf');
insert into public.lessons(id,module_id,product_id,title,description,format,position,storage_path) values ('planilha-1','planilha','opala-raiz','Planilha Controle Manutencao Gastos Opala','Planilha editável para registrar revisões e gastos','xlsx','1','opala-raiz/planilha-1.xlsx');insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('classicos-acervo','classicos-acervo',false,52428800,array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
