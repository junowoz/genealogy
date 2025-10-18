# Estrutura de Componentes

Este documento explica a organização dos componentes React no projeto.

## Convenções

### `app/_components/`

Componentes **compartilhados** entre múltiplas páginas do app, que dependem de contexto específico do app (auth, layout, etc).

**Quando usar:**

- Componentes usados em múltiplas páginas
- Componentes específicos do domínio do app (autenticação, navegação)
- Componentes que dependem de rotas/APIs específicas

**Exemplos:**

- `AuthStatus.tsx` - Mostra status de login e botão de logout
- `LinkedSuccessPage.tsx` - Página de confirmação após OAuth

### `app/[rota]/_components/`

Componentes **específicos** de uma rota, que só são usados naquela página.

**Quando usar:**

- Componentes grandes que precisam ser extraídos para clareza
- Lógica de negócio específica de uma página
- Componentes client ("use client") separados de páginas server

**Exemplos:**

- `app/person/[pid]/_components/PersonDetails.tsx` - Detalhes de uma pessoa
- `app/memories/_components/UploadForm.tsx` - Formulário de upload

### `src/ui/`

Componentes **reutilizáveis** e **agnósticos** de domínio (design system).

**Quando usar:**

- Componentes de UI puros (Button, Card, Badge, Input)
- Componentes que podem ser usados em qualquer projeto
- Sem lógica de negócio ou dependência de APIs

**Exemplos:**

- `components.tsx` - Button, Input, Badge, Section, Hero
- `ReactQueryClientProvider.tsx` - Provider do TanStack Query

## Estrutura Atual

```
app/
  _components/           ← Compartilhados no app
    AuthStatus.tsx
    LinkedSuccessPage.tsx

  auth/
    linked/
      page.tsx           ← Server Component (usa _components)

  person/[pid]/
    _components/         ← Específicos desta rota
      PersonDetails.tsx
    page.tsx             ← Server Component

  memories/
    page.tsx             ← Client Component direto

  layout.tsx             ← Layout raiz
  page.tsx               ← Home page

src/
  ui/                    ← Design System
    components.tsx       ← Componentes reutilizáveis
    ReactQueryClientProvider.tsx
```

## Fluxo de Dados

1. **Server Components** (`page.tsx`) fazem fetch de dados e passam como props
2. **Client Components** (`_components/*.tsx`) recebem props e gerenciam interação
3. **UI Components** (`src/ui/components.tsx`) são compostos para montar a interface

## Regras

✅ **Fazer:**

- Criar `_components/` na raiz da rota quando houver múltiplos componentes client
- Mover componentes compartilhados para `app/_components/`
- Manter componentes UI puros em `src/ui/`

❌ **Evitar:**

- Componentes soltos na raiz de `app/`
- Lógica de negócio em `src/ui/`
- Componentes client em `page.tsx` sem necessidade
