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
Acesso por chave administrativa privada. A chave nunca fica no código publicado, apenas seu hash na base; no navegador ela permanece em sessionStorage e sai ao clicar em Sair. O administrador pode liberar/bloquear um produto por e-mail, bloquear a conta inteira, gerar convites por produto e desativá-los. Links existentes não são recuperáveis em texto; é possível gerar novos convites.
Desativar convite impede novas inscrições, mas não revoga inscrições existentes. Bloquear conta invalida as sessões. Reativar conta exige novo ingresso pelo convite.

## Hospedagem
Vercel: projeto `codigo-opala`; preserva a página `/opala`.
Supabase: `fmnrriscvjxhxkerhbdv`. Catálogo público; dados de membros protegidos por RLS, sem permissões diretas para anon/authenticated.
`members-api.ts` é a função implantada, com verificação JWT do gateway e autorização própria por convite, sessão ou chave administrativa. Apenas o backend usa a chave de serviço do ambiente Supabase.
O bucket `classicos-acervo` é privado. A consulta e o download exigem sessão válida e produto liberado; os links assinados duram 5 minutos. PDFs têm consulta no navegador; XLSX é entregue no formato original editável para consulta no aplicativo de planilhas do dispositivo.

## Estado e pendências
Catálogo, banco de dados, função de acesso e interfaces estão implementados. A criação da primeira chave administrativa foi bloqueada pela revisão automática e depende de autorização explícita do titular. Nenhuma chave administrativa está ativa.
A transferência dos 16 arquivos do Drive depende desse acesso administrativo. O importador exige a chave válida, aceita apenas fontes temporárias do ambiente de arquivos, limita os destinos aos materiais cadastrados e grava somente no bucket privado. Os arquivos de origem não foram publicados no repositório ou no frontend.
O schema inicial `schema.sql` e a extensão `invite-members.sql` já foram aplicados. Não reaplicar os scripts em uma base criada.
O fluxo anterior de Supabase Auth não é utilizado nesta versão; SMTP e OAuth são desnecessários para os clientes.
