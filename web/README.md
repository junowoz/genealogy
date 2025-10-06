Genearchive MVP — Painel unificado de pesquisa & conexões (read‑only)

O que é

- Um MVP focado em resolver a dor nº 1 de pesquisa genealógica: encontrar “a pessoa certa” em meio a muitos resultados e árvores fragmentadas.
- Painel único que junta: busca de pessoas, normalização de lugares (autocomplete), ranking explicável, links oficiais do FamilySearch (redirect), conexões (ancestrais/descendentes) e resumo de hints (somente contagem + redirect).
- Read‑only por design: análise de hints e ações sensíveis são sempre feitas nas páginas oficiais do FamilySearch.

Qual dor resolve

- Fragmentação e incerteza de identidade. Ao pesquisar “Inácio de Souza Gouvêa” existem múltiplos candidatos parecidos. O MVP te diz quais são os mais prováveis, por quê (chips de explicação) e leva direto para a página correta no FamilySearch.
- Padronização de lugares. Normaliza o input do usuário via Place Authority (mockado aqui), reduzindo ruído no ranking e facilitando filtros geográficos.

Destaques (v1)

- Busca de pessoa (nome + janela de anos + local) com ranking explicável.
- Resultados agrupados por probabilidade (Alta, Média, Baixa) e score numérico.
- Normalizador de lugares com autocomplete e seleção persistindo `placeId`.
- Resumo de hints por pessoa (read‑only) + link “Analisar no FamilySearch”.
- Painel de conexões do candidato (ancestrais/descendentes) para visualizar caminhos prováveis.
- Dark mode e UI aprimorada com componentes reutilizáveis (cards, badges, toolbar).

Arquitetura rápida

- Frontend: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind.
- Adapters/Portas: interfaces para Search, Places, Pedigree, Changes, Hints em `src/adapters/interfaces.ts`.
- Implementações mock (sem API real) lendo `mocks/*.json` em `src/adapters/mock/*`.
- Serviços: normalização de nomes/lugares e ranking explicável em `src/services/*`.
- APIs (Next Route Handlers) em `/app/api/*` que chamam os adapters mock.

Modelo de score (baseline explicável)

- score = w1·place + w2·date + w3·relatives + w4·nameVariant
- Pesos iniciais: place 0.45, date 0.25, relatives 0.20, nameVariant 0.10
- Regras:
  - Lugar: 1.0 (mesmo placeId), 0.6 (mesma jurisdição), 0.3 (fuzzy próximo)
  - Data: janela ±2 anos dentro do intervalo informado
  - Parentes: +0.4 se ID igual; +0.25 se nome variante bater (pai/mãe/cônjuge)
  - Nome: normaliza diacríticos e avalia sobreposição de tokens
- UI exibe “Por que este resultado?” como chips (Lugar, Data, Pais/Cônjuge, Variantes), tornando o ranking auditável.

Fluxo compatível (FamilySearch)

- Read‑only: não espelha conteúdo restrito nem realiza attach/merge.
- Hints: mostra apenas o resumo (contagem) e direciona para análise no FamilySearch via link oficial.
- Links sempre para páginas oficiais (sem iframes/embedding).

Como rodar (mocks)

1. Instalar dependências: `npm install`
2. Dev server: `npm run dev`
3. Acessar: http://localhost:3000

Design system & UX

- Componentes leves em `src/ui/components.tsx`: Card, Section, Button, Input, Label, Badge, Toolbar, Hero, ThemeToggle.
- Theming com Tailwind + CSS vars, dark mode (`.dark` na raiz) persistido em `localStorage`.
- Resultados agrupados por probabilidade com empty/erro states claros.

APIs disponíveis (mocks)

- `GET /api/search?name=...&birthYearFrom=...&birthYearTo=...&placeId=...&placeText=...`
- `GET /api/places?q=...`
- `GET /api/pedigree/:pid/ancestry`
- `GET /api/pedigree/:pid/descendancy`
- `GET /api/person/:pid/changes`
- `GET /api/hints/:pid`
- `GET /api/auth/login` e `GET /api/auth/callback` (placeholders 501; OAuth2/PKCE não implementado nos mocks)

Onde plugar FamilySearch depois

- Trocar adapters de `src/adapters/mock/*` por implementações reais que chamam as APIs:
  - Search & Match (Tree Person Search / Matches by Example)
  - Places (Place Authority / Places Search)
  - Pedigree (Ancestry/Descendancy)
  - Change History
  - Hints (sempre resumo + redirect)
- Manter contratos das interfaces em `src/adapters/interfaces.ts` para zero refactor no resto do app.

Arquivos de mocks

- `mocks/places.json` — autocomplete de lugares
- `mocks/persons.json` — pessoas/candidatos
- `mocks/ancestry.json`, `mocks/descendancy.json` — conexões
- `mocks/changes.json` — histórico
- `mocks/hints.json` — resumo de hints

Roadmap sugerido

- Implementar OAuth2/PKCE + sessão server‑side
- Substituir mocks por chamadas reais e adicionar cache/backoff (throttling)
- Ajustar pesos e avaliar métricas de precisão do ranking (testes A/B)
- Watchlist com diffs legíveis e alertas
- Visualizações de caminhos de parentesco e qualidade de perfil

Limitações conhecidas (MVP)

- Dados são mockados; sem persistência de sessão ou usuários.
- Ranking baseline; não usa sinais de qualidade/coverage de fonte.
- Sem paginação real nas rotas mock.

---

Próximo passo nº 2: Memories AI Ingestor (skeleton incluído)

Objetivo

- “Suba a foto/PDF → eu leio, extraio nomes/datas/lugares, proponho pessoas e crio a citação”, mantendo compatibilidade (read‑only + redirects para ações no FS).

O que já vem pronto neste repo

- Contratos do NER/OCR e ingestão em `src/domain/memories.ts`:1
- SQL schema (PostgreSQL) para uploads, jobs, entidades, sugestões e citação em `db/schema.sql`:1
- API routes (mock + file queue):
  - `POST /api/memories/upload` — multipart/form-data (`file`); salva em `uploads/`
  - `POST /api/memories/jobs` — cria job (grava `queue/pending/<id>.json`)
  - `GET /api/memories/jobs/:id` — status (queued/processing/completed/failed) + resultado
- Worker Python (fila de arquivos):
  - `workers/memories/worker.py`:1 — observa `queue/pending/`, processa e grava `queue/results/`
  - `workers/memories/pipeline.py`:1 — pipeline stub (OCR→NER→sugestões→citação)
  - `workers/memories/requirements.txt`:1 — deps mínimas

Como testar o Ingestor (dev, mock)

1) Subir a app: `npm run dev`
2) Via UI: acesse `http://localhost:3000/memories`, selecione/arraste um arquivo e clique em “Iniciar processamento”.
   - A página cria o upload e o job automaticamente e passa a acompanhar o status até “completed”.
3) Alternativa via cURL:
   - Upload: `curl -F "file=@/caminho/da/sua/imagem.jpg" http://localhost:3000/api/memories/upload`
   - Job: `curl -X POST http://localhost:3000/api/memories/jobs -H 'Content-Type: application/json' -d '{"uploadId":"<id>"}'`
   - Status: `curl http://localhost:3000/api/memories/jobs/<jobId>`
4) Rodar o worker (em outro terminal):
   - `cd workers/memories && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python worker.py`

Como plugar OCR/HTR e NER reais

- Trocar `pipeline.py` por chamadas reais:
  - OCR/HTR: TrOCR (impresso), Transkribus/Kraken (manuscrito) com modelos PT/IBÉRICO
  - NER: spaCy/transformer + regras para datas e toponímia histórica
- Normalização de lugares: resolver `PLACE` → `placeId` via Place Authority (adapter real)
- Sugerir perfis: usar Search & Match com os campos extraídos (nome/data/lugar), reusar `src/services/ranking.ts`:1 para ranquear top‑3 e explicar por quê
- Citação: gerar título/nota/URL e redirecionar para a página oficial de “Create & Attach Source” no FS

Compatibilidade e limites

- Read‑only para análise/anexação: sempre redirect para páginas oficiais
- Não espelhar dados de coleções restritas; sem iframe
- Respeitar throttling e política de linking da FamilySearch
