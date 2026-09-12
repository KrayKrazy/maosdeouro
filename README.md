# Mãos de Ouro — E-commerce (infra inicial)

## Rodar
1. `cp .env.example .env` e preencher CAKTO_CLIENT_ID/SECRET, FRENET_TOKEN
2. `npx prisma migrate dev` (DATABASE_URL Postgres)
3. MCP Cakto: `cd mcp/cakto-server && npm i && npm run build`
4. API: `cd apps/api && npm i && npm run start:dev` (porta 3001)
5. Web: `cd apps/web && npm i && npm run dev` (porta 3000)

## Cakto — fluxo real
Auth `POST /public_api/token/` -> `POST /public_api/products/` (gera checkout `pay.cakto.com.br/{offer}`) -> `POST /public_api/payments/` PIX/cartão com `X-Idempotency-Key` -> webhook `purchase_approved` em `/api/webhooks/cakto`.

## Frete — peças grandes
`FrenetService.resolveMode()`: CUSTOM_PROJECT ou >300cm ou >80kg = COTACAO_MANUAL (AWAITING_QUOTE + WhatsApp). CEP 74/75/76 = ENTREGA_LOCAL frota própria. Demais = Frenet filtrando Braspress/Rodonaves/Jadlog.

## SEO corrigido
robots.txt, llms.txt, canonical, OG, JSON-LD LocalBusiness, `<main>/<header>`, encoding UTF-8.
