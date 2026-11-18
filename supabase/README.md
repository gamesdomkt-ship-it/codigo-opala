# Área de membros — Código dos Clássicos BR

## Páginas
- `/area-de-membros`: catálogo geral.
- `/area-de-membros/opala-raiz`: estrutura pública dos 6 módulos e 16 materiais, sem acesso aos arquivos.
- `/area-de-membros/admin`: painel privado de administração.

## Entrada do cliente
Convite específico por produto → e-mail → liberação imediata, sem senha, OTP ou OAuth. O convite funciona como autorização e deve ser entregue somente aos compradores. Não existe validação automática de pagamento.
O token do convite fica no fragmento da URL, é retirado após a leitura e apenas seu SHA-256 fica na base.
Cada sessão possui um token aleatório de 320 bits, cujo hash fica na base, duração máxima de 90 dias e revogação pelo administrador. Dados de clientes não ficam acessíveis pela API pública.
Uma nova sessão criada pelo convite só recebe o produto daquele convite; não é possível obter os outros produtos de outra pessoa apenas sabendo seu e-mail. As liberações manuais do administrador são aplicadas ao e-mail do cliente. O mesmo navegador pode acumular produtos abrindo os respectivos convites com o mesmo e-mail.

## Painel
Acesso exclusivo por e-mail e senha usando Supabase Auth. A conta administrativa autorizada é gamesdomkt@gmail.com, validada no backend pelo e-mail e pelo atributo app_metadata.membership_admin definido pelo servidor. A senha é gerenciada pelo Supabase Auth e nunca fica no código publicado. A sessão fica em sessionStorage, é renovada quando necessário e a saída revoga o refresh token. As chaves administrativas antigas estão desativadas. O administrador pode liberar/bloquear um produto por e-mail, bloquear a conta inteira, gerar convites por produto e desativá-los. Links existentes não são recuperáveis em texto; é possível gerar novos convites.
Desativar convite impede novas inscrições, mas não revoga inscrições existentes. Bloquear conta invalida as sessões. Reativar conta exige novo ingresso pelo convite.

## Hospedagem
Vercel: projeto `codigo-opala`; preserva a página `/opala`.
Supabase: `fmnrriscvjxhxkerhbdv`. Catálogo público; dados de membros protegidos por RLS, sem permissões diretas para anon/authenticated.
`members-api.ts` é a função implantada, com verificação JWT do gateway e autorização própria por convite ou sessão; operações administrativas exigem autenticação Supabase Auth e a permissão de administrador. Apenas o backend usa a chave de serviço do ambiente Supabase.
O bucket `classicos-acervo` é privado. A consulta e o download exigem sessão válida e produto liberado; os links assinados duram 5 minutos. PDFs têm consulta no navegador; XLSX é entregue no formato original editável para consulta no aplicativo de planilhas do dispositivo.

## Estado da implantação
Catálogo, banco de dados, função de acesso e interfaces estão publicados. A conta administrativa por e-mail e senha foi ativada após autorização explícita do titular. O acesso por chave foi desativado.
Os 16 arquivos originais foram transferidos para o bucket privado: 124.575.069 bytes no total, com consulta de PDFs no navegador e download dos arquivos originais. O importador exige uma sessão administrativa autenticada, aceita apenas fontes temporárias do ambiente de arquivos, limita os destinos aos materiais cadastrados e grava somente no bucket privado. Links de origem e chaves privadas não foram publicados no repositório ou no frontend.
Verificações concluídas: cadastro pelo convite com apenas e-mail; liberação exclusiva do produto do convite; progresso persistido; encerramento de sessão; acesso administrativo autenticado; leitura de PDF privado por URL assinada; presença dos 16 arquivos em bucket não público.
O schema inicial `schema.sql` e a extensão `invite-members.sql` já foram aplicados. Não reaplicar os scripts em uma base criada.
O fluxo anterior de Supabase Auth não é utilizado nesta versão; SMTP e OAuth são desnecessários para os clientes.
