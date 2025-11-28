# Genealogy | FamilySearch Hub

**URL:** https://genealogy.junowoz.com

Sistema que integra a API FamilySearch ao ChatGPT via MCP (Model Context Protocol) e oferece interface web com funcionalidades de busca genealógica e ranking inteligente.

O projeto entrega um conector MCP para o FamilySearch integrado ao ChatGPT e um site web com ranking inteligente, score de probabilidade e agrupamento visual. Inclui 9 ferramentas MCP e autenticação OAuth 2.0 com PKCE.

---

## Instalação

### Pré-requisitos

- Node.js 18+ e npm
- PostgreSQL
- Chave de aplicativo FamilySearch Beta

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```ini
# FamilySearch Beta
FS_APP_KEY=sua-app-key-beta-aqui
FS_REDIRECT_URI=https://genealogy.junowoz.com/api/auth/callback
FS_AUTH_BASE_URL=https://identbeta.familysearch.org/cis-web/oauth2/v3
FS_API_BASE_URL=https://apibeta.familysearch.org
FS_OAUTH_SCOPE=https://api.familysearch.org/auth/familytree.read

# App
NEXT_PUBLIC_APP_ORIGIN=https://genealogy.junowoz.com
SESSION_SECRET=troque-por-uma-chave-aleatoria-com-32-ou-mais-caracteres

# Database
DATABASE_URL=postgresql://user:password@host:5432/genealogy-db
```

### Setup

```bash
# Instalar dependências
npm install

# Gerar widget do Apps SDK
npm run widget:build

# Gerar Prisma client
npm run prisma:generate

# Executar migrações
npx prisma migrate dev

# Iniciar servidor de desenvolvimento
npm run dev
```

### Deploy com Docker

```bash
# Build
docker build -t genealogy:latest .

# Run
docker run --rm -p 3000:3000 --env-file .env genealogy:latest

# Migrações
docker exec -it <container> npx prisma migrate deploy
```

---

## Como Usar

### Via ChatGPT (MCP)

1. Acesse **Configurações → Conectores** no ChatGPT
2. Adicione o endpoint: `https://genealogy.junowoz.com/api/mcp`
3. Configure **Authentication** como "No authentication"
4. Quando solicitado, faça login no FamilySearch
5. Use comandos como:
   - "Qual é meu Person ID?"
   - "Busque por José Silva nascido em 1850"
   - "Mostre os detalhes de ABCD-1234"
   - "Quem são os pais de ABCD-1234?"

### Via Site Web

1. Acesse https://genealogy.junowoz.com
2. Faça login via FamilySearch
3. Use a busca na página inicial para encontrar pessoas
4. Navegue pela árvore genealógica clicando nos parentes
5. Visualize detalhes completos de cada pessoa

---

## Ferramentas MCP

O sistema oferece 9 ferramentas MCP para integração com ChatGPT:

| Tool                     | Função                          | API Equivalente                              |
| ------------------------ | ------------------------------- | -------------------------------------------- |
| `fs.search_people`       | Busca pessoas com ranking       | `GET /platform/tree/search`                  |
| `fs.places_autocomplete` | Autocomplete de lugares         | `GET /platform/places`                       |
| `fs.get_ancestry`        | Árvore ancestral (8 gerações)   | `GET /platform/tree/ancestry`                |
| `fs.get_descendancy`     | Árvore descendente (6 gerações) | `GET /platform/tree/descendancy`             |
| `fs.hints_summary`       | Resumo de hints                 | `GET /platform/tree/persons/{pid}/matches`   |
| `fs.change_log`          | Histórico de mudanças           | `GET /platform/tree/persons/{pid}/changes`   |
| `fs.person_details`      | Detalhes completos da pessoa    | `GET /platform/tree/persons/{pid}`           |
| `fs.person_relatives`    | Parentes diretos                | `GET /platform/tree/persons/{pid}?relatives` |
| `fs.current_user`        | Person ID do usuário            | `GET /platform/tree/current-person`          |

---

## API Web

### Rotas Principais

| Método     | Rota                              | Função                    |
| ---------- | --------------------------------- | ------------------------- |
| `GET`      | `/api/search`                     | Busca pessoas com ranking |
| `GET`      | `/api/places`                     | Autocomplete lugares      |
| `GET`      | `/api/person/[pid]`               | Detalhes da pessoa        |
| `GET`      | `/api/person/[pid]/relatives`     | Parentes diretos          |
| `GET`      | `/api/pedigree/[pid]/ancestry`    | Árvore ancestral          |
| `GET`      | `/api/pedigree/[pid]/descendancy` | Árvore descendente        |
| `GET`      | `/api/hints/[pid]`                | Resumo de hints           |
| `GET`      | `/api/person/[pid]/changes`       | Histórico de mudanças     |
| `GET`      | `/api/auth/me`                    | Person ID do usuário      |
| `GET`      | `/api/auth/login`                 | Inicia OAuth              |
| `GET`      | `/api/auth/callback`              | Callback OAuth            |
| `POST/GET` | `/api/auth/logout`                | Logout                    |

### Exemplo de Uso da API

```javascript
// Busca pessoas
const response = await fetch("/api/search?name=João&birthYear=1850");
const { results, grouped } = await response.json();

// Detalhes pessoa
const person = await fetch("/api/person/ABCD-123");
const { person, relationships } = await person.json();

// Parentes
const relatives = await fetch("/api/person/ABCD-123/relatives");
const { parents, spouses, children } = await relatives.json();
```

---

## Autenticação

O sistema usa OAuth 2.0 com PKCE para autenticação segura com o FamilySearch.

### Fluxo de Autenticação

1. **Login** (`GET /api/auth/login`)

   - Gera code_verifier e code_challenge (PKCE)
   - Salva state em cookie temporário
   - Redireciona para FamilySearch

2. **Callback** (`GET /api/auth/callback`)

   - Valida state e code
   - Troca code por tokens (access + refresh)
   - Persiste tokens em sessão segura (cookie httpOnly)

3. **Sessões**

   - `state=web` → sessão HTTP do usuário
   - `state=mcp:<sessionId>` → também salva para MCP store

4. **Logout** (`POST /api/auth/logout`)
   - Limpa cookie de sessão
   - Remove tokens do MCP store

### Segurança

- Cookies httpOnly com SESSION_SECRET
- Refresh automático de tokens
- Isolamento de sessões por usuário
- PKCE para prevenção de ataques
- Validação rigorosa de states/codes

---

## Estrutura do Projeto

```
/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # OAuth 2.0 + PKCE
│   │   ├── search/               # Busca de pessoas
│   │   ├── places/               # Autocomplete lugares
│   │   ├── person/[pid]/         # Detalhes pessoa
│   │   ├── pedigree/[pid]/       # Árvores genealógicas
│   │   ├── hints/[pid]/          # Hints FamilySearch
│   │   └── memories/             # Upload + OCR
│   ├── person/[pid]/             # Páginas de pessoa
│   ├── memories/                 # Página upload
│   └── auth/linked/              # Success OAuth
├── src/
│   ├── adapters/familysearch/    # Integração FamilySearch
│   ├── mcp/                      # MCP Server + Tools
│   ├── lib/                      # Utils + clients
│   ├── ui/                       # Componentes React
│   └── domain/                   # Types + contratos
├── pages/api/mcp.ts              # MCP endpoint (SSE)
├── widgets/                      # Apps SDK widget
├── workers/memories/             # Python OCR worker
└── prisma/                       # Schema + migrations
```

---

## Desenvolvimento

### Comandos Disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build para produção
npm run typecheck        # Verificação TypeScript
npm run widget:build     # Build do widget Apps SDK
npx prisma studio        # Interface visual do banco
npx prisma migrate dev   # Migrações desenvolvimento
npx prisma migrate deploy # Migrações produção
```

### Testar MCP Localmente

```bash
npx @modelcontextprotocol/inspector --server http://localhost:3000/api/mcp
```

---

## Stack Tecnológico

- **Frontend:** Next.js 15 (App Router) + React 18 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Node.js
- **Banco:** PostgreSQL + Prisma ORM
- **Autenticação:** OAuth 2.0 + PKCE + iron-session
- **Integração:** FamilySearch API + GEDCOM X parsing
- **MCP:** @modelcontextprotocol/sdk + StreamableHTTPServerTransport

---

## Certificações FamilySearch

- Authentication Compatible
- Read Compatible
- Record Hinting Compatible (resumo/redirecionamento)

Operações de escrita (criar/editar pessoas) não estão implementadas por exigirem certificações adicionais.
