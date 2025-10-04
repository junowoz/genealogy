Genearchive MVP — Painel unificado de pesquisa & conexões (read-only)

O que foi entregue

- Next.js 14 + React 18 + TypeScript (App Router)
- Tailwind CSS
- Adapters com interfaces: Search, Places, Pedigree, Changes, Hints
- Implementação mock de cada adapter lendo arquivos JSON em `mocks/`
- Serviços de normalização + ranking explicável
- APIs (Next Route Handlers) em `/app/api/*` usando os mocks
- UI mínima:
  - Página inicial com busca (nome, janela de anos, local com autocomplete)
  - Lista de candidatos com score e “Por que este resultado?”
  - Botão “Abrir no FamilySearch” e link para “Ver conexões e hints”
  - Página de pessoa com: resumo de hints (read-only + redirect), ancestry, descendancy e mudanças recentes

Como rodar

1. Instale as dependências
   - `npm install`
2. Rode em desenvolvimento
   - `npm run dev`
3. Acesse
   - http://localhost:3000

APIs disponíveis (mocks)

- `GET /api/search?name=...&birthYearFrom=...&birthYearTo=...&placeId=...&placeText=...`
- `GET /api/places?q=...` (autocomplete via Place Authority mock)
- `GET /api/pedigree/:pid/ancestry`
- `GET /api/pedigree/:pid/descendancy`
- `GET /api/person/:pid/changes`
- `GET /api/hints/:pid`
- `GET /api/auth/login` e `GET /api/auth/callback` (placeholders 501)

Onde plugar FamilySearch depois

- Substituir as classes em `src/adapters/mock/` por adapters reais que chamam a FS API
- Manter as interfaces em `src/adapters/interfaces.ts`
- Reaproveitar o serviço de ranking em `src/services/ranking.ts`

Arquivos de mocks

- `mocks/places.json` (Place Authority básico)
- `mocks/persons.json` (candidatos de busca)
- `mocks/ancestry.json` e `mocks/descendancy.json`
- `mocks/changes.json`
- `mocks/hints.json`

Notas sobre ranking

- score = w1*place + w2*date + w3*relatives + w4*nameVariant
- Pesos iniciais em `src/services/ranking.ts`
- Chips de explicação: Nome/Variantes, Lugar (placeId/mesma jurisdição/fuzzy), Data (±2), Pais/Cônjuge quando aplicável

Próximos passos sugeridos

- Implementar OAuth2/PKCE e sessões (server-side) e trocar mocks por chamadas reais
- Cache leve (Edge ou Redis) para places e busca
- Paginação + backoff (throttling) nos endpoints reais
- Melhorar UI (shadcn/ui) e acessibilidade

