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

