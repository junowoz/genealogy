# Genealogy — FamilySearch hub (read-only)

Genealogy é um monolito Next.js 15 que concentra os fluxos read-only com o FamilySearch:

- **Busca de pessoas** usando a API `platform/tree/search`, com ranking explicável e chips de justificativa.
- **Autocomplete de lugares** por Place Authority.
- **Pedigree ascendente/descendente**, mudanças recentes e resumo de hints por PID.
- **OAuth2/PKCE real** com armazenamento seguro (cookie httpOnly + refresh) e suporte simultâneo para Web e MCP.
- **Conector MCP + Apps SDK** já integrado ao mesmo domínio (`/api/mcp`) com widget React compilado via esbuild.
- **Memories Ingestor** (worker + fila) continua disponível como skeleton para OCR/NER, mas ainda mockado.

Tudo continua read-only por design: análises ou anexos são feitos nas páginas oficiais do FamilySearch via redirect.

---

## Arquitetura

| Camada          | Detalhes                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| UI              | Next.js 15 (App Router) + React 18 + Tailwind. Componentes em `src/ui`.                                                                       |
| Sessão          | `iron-session` com cookie httpOnly (`genealogy_session`). Tokens renovados automaticamente.                                                   |
| Integrations    | Adapters reais em `src/adapters/familysearch/*` usando `fetch` + GEDCOM X parsing.                                                            |
| MCP             | `@modelcontextprotocol/sdk` + `StreamableHTTPServerTransport` servidos por `pages/api/mcp.ts` (exceção ao App Router para SSE com Node HTTP). |
| Widget Apps SDK | React + esbuild (`widgets/index.tsx` → `public/mcp/widget.js`). Registrado em `src/mcp/server.ts`.                                            |
| Memories        | APIs em `app/api/memories/*` + worker Python em `workers/memories`. Ainda mockado.                                                            |

O app inteiro roda em modo Node (nenhum Edge runtime) para permitir streaming/SSE do MCP.

---

## Variáveis de ambiente

`env` obrigatório na raiz (veja também `.env.example`):

```ini
FS_ENV=beta
FS_APP_KEY=exemplo-de-api-key
FS_REDIRECT_URI=https://genealogy.junowoz.com/api/auth/callback
FS_OAUTH_SCOPE=openid profile https://api.familysearch.org/auth/familytree.read
NEXT_PUBLIC_APP_ORIGIN=https://genealogy.junowoz.com
SESSION_SECRET=troque-por-uma-chave-com-32+chars
DATABASE_URL=postgresql://user:password@host:5432/genealogy?schema=public
```

Para desenvolvimento local ajuste `FS_REDIRECT_URI`/`NEXT_PUBLIC_APP_ORIGIN` para `http://localhost:3000` e registre o redirect correspondente com o FamilySearch.

---

## Comandos principais

```bash
npm install                 # dependências
npm run widget:build        # gera public/mcp/widget.js (Apps SDK)
npm run prisma:generate     # gera client do Prisma
npx prisma migrate dev      # (ou prisma migrate deploy em produção)
npm run dev                 # Next.js + APIs
npm run typecheck           # tsconfig estrito
```

- O build do widget é separado para permitir deploys serverless (o bundle fica em `public/mcp/widget.js`).
- Rodando o dev server, a aplicação já consome as APIs reais do FamilySearch (é preciso autenticar).

---

## Fluxo de autenticação

1. `GET /api/auth/login?state=<STATE>&redirectTo=/opcional` gera PKCE, salva no cookie e redireciona para `identbeta`.
2. `GET /api/auth/callback` troca o `code` por tokens, persiste em sessão (cookie) e opcionalmente em store MCP.
3. `state` controla o tipo de vínculo:
   - `web` (default) → tokens ficam apenas na sessão HTTP do usuário.
   - `mcp:<sessionId>` → além do cookie, salva em `src/mcp/store.ts` para o conector MCP daquele `sessionId`.
4. Logout: `POST /api/auth/logout` limpa cookie (e aceita `redirectTo`).

Tokens são renovados automaticamente via `refresh_token`; se falhar, o app zera sessão e solicita novo login.

---

## APIs expostas

| Método       | Rota                             | Descrição                                                           |
| ------------ | -------------------------------- | ------------------------------------------------------------------- |
| `GET`        | `/api/search`                    | Busca pessoas (`name`, `birthYearFrom/To`, `placeId`, `placeText`). |
| `GET`        | `/api/places`                    | Autocomplete de lugares (Place Authority).                          |
| `GET`        | `/api/pedigree/:pid/ancestry`    | Gera pedigree ascendente (até 8 gerações).                          |
| `GET`        | `/api/pedigree/:pid/descendancy` | Pedigree descendente (até 6 gerações).                              |
| `GET`        | `/api/person/:pid/changes`       | Mudanças recentes do PID.                                           |
| `GET`        | `/api/hints/:pid`                | Resumo de hints (registro/árvore) + URL oficial.                    |
| `POST`/`GET` | `/api/auth/*`                    | Login/Callback/Logout conforme descrito acima.                      |
| `POST`       | `/api/memories/upload`           | Upload de arquivo (grava em `uploads/`). Mock.                      |
| `POST`       | `/api/memories/jobs`             | Enfileira job no `queue/pending`. Mock.                             |
| `GET`        | `/api/memories/jobs/:id`         | Consulta status/resultados. Mock.                                   |

Todos os endpoints retornam `401` caso a sessão FamilySearch esteja ausente ou expirada.

---

## Conector MCP / Apps SDK

- Endpoint: `https://<host>/api/mcp` (mesmo domínio do site). Usa Streamable HTTP + SSE.
- Sesões usam o header `MCP-Session-Id`. Se o modelo iniciar sem ter tokens, o servidor retorna mensagem com o link de vinculação `https://.../api/auth/login?state=mcp:<sessionId>`.
- Ferramentas disponíveis:
  - `fs.search_people`
  - `fs.places_autocomplete`
  - `fs.get_ancestry`
  - `fs.get_descendancy`
  - `fs.hints_summary`
  - `fs.change_log`
- Widget Apps SDK (React) entregue via resource `ui://widget/genealogy-search.html`. O bundle é gerado por `npm run widget:build` e embutido na resposta.

Para testar o MCP localmente:

```bash
npm run widget:build
npm run dev
# Em outro terminal
npx @modelcontextprotocol/inspector --server http://localhost:3000/api/mcp
```

Autentique pelo link sugerido (`/api/auth/login?state=mcp:<sessionId>`) e os tools passam a funcionar. Se `DATABASE_URL` estiver setado, o vínculo MCP é persistido no Postgres (`McpAuthSession`).

---

## Memories Ingestor (skeleton)

O módulo de ingestão de memories continua mockado, mas já provê:

- Upload local + fila (`queue/pending`, `queue/results`).
- Worker Python (`workers/memories/worker.py`) pronto para plugar OCR/HTR + NER reais.
- Contratos em `src/domain/memories.ts` para normalizar entidades, sugestões e citações.

Rodando worker de teste:

```bash
cd workers/memories
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python worker.py
```

---

## Próximos passos sugeridos

1. Adicionar paginação e cache nas chamadas `search`/`pedigree`.
2. Instrumentar métricas (latência, contagem por tool, erros OAuth).
3. Evoluir Memories Ingestor com OCR/HTR + NER reais, sugestão automática de citação e attach (read-only).

---

## Deploy com Docker

1. Crie o arquivo `.env` (veja `.env.example`) com `DATABASE_URL`, chaves FS e `SESSION_SECRET`.

2. Build e run:

```bash
docker build -t genealogy:latest .
docker run --rm -p 3000:3000 --env-file .env genealogy:latest
```

3. (Opcional) Aplicar migrações dentro do container:

```bash
docker exec -it <container> npx prisma migrate deploy
```

Nota: mantivemos `pages/api/mcp.ts` por exigir SSE com acesso direto ao `req`/`res` de Node. Todo o restante usa App Router.

---

## Licença

Uso interno do projeto Genealogy. Direitos reservados a Junowoz / Sudotech.
