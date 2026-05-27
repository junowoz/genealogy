# Genealogy FamilySearch MCP

Site e servidor MCP para consultar dados do FamilySearch pelo ChatGPT. O projeto entrega:

- Web app em Next.js para login, busca, detalhes de pessoas, parentes, pedigree, hints, mudanças e Memories.
- Endpoint MCP Streamable HTTP em `/api/mcp` para conectar no ChatGPT.
- Widget do Apps SDK para renderizar resultados de busca dentro do ChatGPT.
- OAuth 2.0 + PKCE com FamilySearch.
- PostgreSQL + Prisma para persistir sessões MCP.
- Docker Compose pronto para Dokploy/VPS.

## Arquitetura

```
ChatGPT / Browser
       |
       | HTTPS
       v
Next.js app + /api/mcp
       |
       | Prisma
       v
PostgreSQL
       |
       | OAuth/API
       v
FamilySearch
```

O MCP usa o transporte HTTP moderno do Model Context Protocol: um endpoint único com `GET` e `POST` em `/api/mcp`. O servidor registra 11 tools read-only e um recurso de widget versionado `ui://widget/genealogy-search-v2.html`.

## Requisitos

- Node.js 20+
- npm
- Docker e Docker Compose para deploy completo
- App key do FamilySearch
- Domínio HTTPS público para usar no ChatGPT

## Variáveis De Ambiente

Copie `.env.example` para `.env` e preencha:

```ini
FS_APP_KEY=YOUR_FAMILYSEARCH_BETA_APP_KEY
FS_REDIRECT_URI=https://your-domain.example.com/api/auth/callback
FS_AUTH_BASE_URL=https://identbeta.familysearch.org/cis-web/oauth2/v3
FS_API_BASE_URL=https://apibeta.familysearch.org
FS_OAUTH_SCOPE=https://api.familysearch.org/auth/familytree.read

NEXT_PUBLIC_APP_ORIGIN=https://your-domain.example.com
MCP_ALLOWED_ORIGINS=https://chatgpt.com,https://chat.openai.com,https://your-domain.example.com

SESSION_SECRET=generate-a-random-32-plus-character-secret
TOKEN_ENCRYPTION_KEY=generate-another-random-32-plus-character-secret

POSTGRES_DB=genealogy
POSTGRES_USER=genealogy
POSTGRES_PASSWORD=generate-a-strong-database-password
APP_PORT=3000
RUN_MIGRATIONS=true
```

Notas:

- `SESSION_SECRET` assina cookies de sessão.
- `TOKEN_ENCRYPTION_KEY` criptografa tokens OAuth persistidos no banco.
- `NEXT_PUBLIC_APP_ORIGIN` deve ser a URL pública exata do app.
- `FS_REDIRECT_URI` deve bater com o callback cadastrado no FamilySearch.
- Em Docker Compose, `DATABASE_URL` é montado automaticamente apontando para o serviço `db`.

## Desenvolvimento Local

```bash
npm install
npm run widget:build
npm run prisma:generate
npm run typecheck
npm run dev
```

Com um Postgres local, rode:

```bash
npm run prisma:migrate
```

## Deploy Com Docker Compose

O compose sobe app, banco, volumes persistentes, healthchecks e migrações Prisma automaticamente:

```bash
cp .env.example .env
# edite .env
docker compose up -d --build
```

Serviços:

- `app`: Next.js standalone em `:3000`.
- `db`: PostgreSQL 16.
- `genealogy-data`: uploads e filas do worker.
- `postgres-data`: dados do Postgres.

O entrypoint executa `prisma migrate deploy` antes de iniciar o servidor. Para desligar:

```bash
docker compose down
```

## Deploy No Dokploy

1. Crie um projeto Docker Compose no Dokploy apontando para este repositório.
2. Use `docker-compose.yml` da raiz.
3. Configure as variáveis do `.env`.
4. Na aba Domains do Dokploy, associe seu domínio ao serviço `app` na porta `3000`.
5. Garanta HTTPS no domínio.
6. Cadastre `https://seu-dominio/api/auth/callback` no FamilySearch.
7. Abra `https://seu-dominio/api/mcp`; deve responder `{"status":"ready"}`.

Dokploy recomenda configurar domínios pelo painel para Docker Compose; o compose não precisa incluir labels Traefik manuais.

## Conectar No ChatGPT

1. Acesse as configurações de conectores/apps do ChatGPT.
2. Adicione um servidor MCP remoto.
3. Use a URL:

```text
https://your-domain.example.com/api/mcp
```

4. Salve o conector.
5. Na primeira chamada de tool, o MCP devolverá um link de login FamilySearch.
6. Abra o link, conclua o OAuth e volte para o ChatGPT.

## Tools MCP

| Tool | Descrição |
| --- | --- |
| `search` | Busca padrão compatível com conectores/company knowledge e retorna resultados citáveis. |
| `fetch` | Busca padrão para obter detalhes citáveis por Person ID. |
| `fs.current_user` | Retorna o Person ID do usuário logado. |
| `fs.search_people` | Busca pessoas no FamilySearch com ranking e widget. |
| `fs.places_autocomplete` | Sugere lugares do Place Authority. |
| `fs.person_details` | Retorna detalhes completos de uma pessoa. |
| `fs.person_relatives` | Lista pais, cônjuges e filhos. |
| `fs.get_ancestry` | Retorna pedigree ascendente. |
| `fs.get_descendancy` | Retorna pedigree descendente. |
| `fs.hints_summary` | Resume hints de registros/árvore. |
| `fs.change_log` | Retorna mudanças recentes de uma pessoa. |

Todas as tools são read-only.

## Segurança

Medidas implementadas:

- OAuth 2.0 com PKCE.
- State obrigatório e expira em 10 minutos.
- Cookies `httpOnly`, `sameSite=lax` e `secure` em produção.
- Tokens MCP criptografados no banco com AES-256-GCM.
- Nenhum segredo é necessário no build Docker.
- CORS do MCP restrito por `MCP_ALLOWED_ORIGINS`.
- Validação de `Origin` no endpoint MCP.
- Limite de 1 MB para requests MCP.
- Uma instância `McpServer` por transporte/sessão.
- Uploads exigem login, têm limite de 10 MB e tipos permitidos.
- IDs de pessoa/job/upload são validados antes de acessar APIs ou arquivos.
- Headers de segurança básicos no Next.js.
- `npm audit --omit=dev` deve retornar zero vulnerabilidades.

## Testes E Validação

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```

Smoke test MCP local:

```bash
curl -i http://localhost:3000/api/mcp
```

Initialize JSON-RPC:

```bash
curl -i -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
```

## Estrutura

```
app/                 Next.js App Router e API web
pages/api/mcp.ts     Endpoint MCP Streamable HTTP
src/mcp/             Registro de server, tools e auth MCP
src/lib/             Env, sessão, Prisma, crypto e FamilySearch client
src/adapters/        Integrações FamilySearch
widgets/             Widget Apps SDK
public/mcp/          Bundle gerado do widget
prisma/              Schema e migrações
workers/memories/    Worker Python opcional para Memories
docker/              Entrypoint de produção
```

## Referências Oficiais

- OpenAI Apps SDK: https://developers.openai.com/apps-sdk
- Apps SDK MCP server: https://developers.openai.com/apps-sdk/build/mcp-server
- Apps SDK security/privacy: https://developers.openai.com/apps-sdk/guides/security-privacy
- MCP transports: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- Dokploy Docker Compose domains: https://docs.dokploy.com/docs/core/docker-compose/domains
