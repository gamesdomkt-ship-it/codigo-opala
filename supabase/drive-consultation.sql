-- Aplicada ao projeto: consulta por links Drive somente para membros liberados.
alter table public.lessons add column drive_url text;
-- Os 16 links correspondentes foram cadastrados no banco, sem exposição no catálogo público.
