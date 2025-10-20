import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { env } from "../lib/env";
import {
  FamilySearchAuthError,
  FamilySearchClient,
  ensureFreshAuth,
} from "../lib/familysearch/client";
import { getMcpAuth, saveMcpAuth, clearMcpAuth } from "./store";
import { FamilySearchSearchAdapter } from "../adapters/familysearch/searchAdapter";
import { FamilySearchPlaceAdapter } from "../adapters/familysearch/placeAdapter";
import { FamilySearchPedigreeAdapter } from "../adapters/familysearch/pedigreeAdapter";
import { FamilySearchHintsAdapter } from "../adapters/familysearch/hintsAdapter";
import { FamilySearchChangeAdapter } from "../adapters/familysearch/changeAdapter";
import type { FamilySearchAuthState } from "../lib/session";

const SEARCH_WIDGET_URI = "ui://widget/genealogy-search.html";

export const mcpServer = new McpServer(
  {
    name: "genealogy-mcp",
    version: "0.2.0",
    description: "Genealogy · consultas no FamilySearch",
  },
  {
    capabilities: {
      logging: {},
      tools: {},
      resources: {},
    },
  }
);

function registerToolUnsafe(name: string, config: any, handler: any) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  mcpServer.registerTool(name, config, handler);
}

const transports = new Map<string, StreamableHTTPServerTransport>();

function loadWidgetTemplate() {
  const bundlePath = path.join(process.cwd(), "public/mcp/widget.js");
  let scriptContent = "";
  if (existsSync(bundlePath)) {
    scriptContent = readFileSync(bundlePath, "utf8");
  }
  if (!scriptContent) {
    return `
<!doctype html>
<html lang="pt-BR">
  <body>
    <div style="font-family:system-ui;padding:16px">Compile o widget com <code>npm run widget:build</code>.</div>
  </body>
</html>
`.trim();
  }

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; background: #f9fafb; color: #111827; }
    </style>
  </head>
  <body>
    <div id="genealogy-widget"></div>
    <script type="module">${scriptContent}</script>
  </body>
</html>
  `.trim();
}

mcpServer.registerResource(
  "genealogy-search-widget",
  SEARCH_WIDGET_URI,
  {
    "openai/widgetDescription": "Tabela de candidatos e filtros de pesquisa.",
    "openai/widgetPrefersBorder": true,
  },
  async () => ({
    contents: [
      {
        uri: SEARCH_WIDGET_URI,
        mimeType: "text/html+skybridge",
        text: loadWidgetTemplate(),
      },
    ],
  })
);

const searchInputSchema = {
  name: z.string().min(1).describe("Nome completo ou parcial"),
  birthYearFrom: z
    .number()
    .int()
    .optional()
    .describe("Ano mínimo de nascimento"),
  birthYearTo: z.number().int().optional().describe("Ano máximo de nascimento"),
  placeText: z.string().optional().describe("Texto livre do local"),
  placeId: z.string().optional().describe("ID do place authority"),
};

const searchOutputSchema = {
  query: z.object({
    name: z.string(),
    birthYearFrom: z.number().optional(),
    birthYearTo: z.number().optional(),
    placeText: z.string().optional(),
    placeId: z.string().optional(),
  }),
  total: z.number(),
  candidates: z.array(z.any()),
};

registerToolUnsafe(
  "fs.search_people",
  {
    title: "Busca de pessoas (FamilySearch)",
    description:
      "Retorna candidatos da busca de pessoas com ranking e dados resumidos.",
    inputSchema: searchInputSchema,
    outputSchema: searchOutputSchema,
    annotations: { readOnlyHint: true },
    _meta: {
      "openai/outputTemplate": SEARCH_WIDGET_URI,
      "openai/toolInvocation/invoking": "Buscando candidatos…",
      "openai/toolInvocation/invoked": "Resultados prontos",
    },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchSearchAdapter({ client });
      const candidates = await adapter.searchPersons({
        name: args.name,
        birthYearFrom: args.birthYearFrom,
        birthYearTo: args.birthYearTo,
        placeText: args.placeText,
        placeId: args.placeId,
      });
      return {
        content: [
          {
            type: "text",
            text: `Encontrei ${candidates.length} candidato(s) para “${args.name}”.`,
          },
        ],
        structuredContent: {
          query: {
            name: args.name,
            birthYearFrom: args.birthYearFrom,
            birthYearTo: args.birthYearTo,
            placeText: args.placeText,
            placeId: args.placeId,
          },
          total: candidates.length,
          candidates,
        },
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

const placeAutocompleteInput = {
  q: z.string().min(2).describe("Texto do local para autocomplete"),
};

const placeAutocompleteOutput = {
  items: z.array(z.any()),
};

registerToolUnsafe(
  "fs.places_autocomplete",
  {
    title: "Autocomplete de locais",
    description: "Sugere locais do Place Authority pelo texto informado.",
    inputSchema: placeAutocompleteInput,
    outputSchema: placeAutocompleteOutput,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchPlaceAdapter({ client });
      const places = await adapter.searchPlaces(args.q);
      return {
        content: [
          {
            type: "text",
            text: `${places.length} local(is) encontrados para “${args.q}”.`,
          },
        ],
        structuredContent: { items: places },
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

const ancestryInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
  generations: z
    .number()
    .int()
    .min(1)
    .max(8)
    .optional()
    .describe("Número de gerações (1-8)"),
};

const ancestryOutputSchema = {
  rootId: z.string(),
  generations: z.number(),
  nodes: z.record(z.string(), z.any()),
};

const descendancyInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
  generations: z
    .number()
    .int()
    .min(1)
    .max(6)
    .optional()
    .describe("Número de gerações (1-6)"),
};

const descendancyOutputSchema = {
  rootId: z.string(),
  generations: z.number(),
  nodes: z.record(z.string(), z.any()),
};

const hintsSummaryOutputSchema = {
  total: z.number(),
  recordHints: z.number(),
  treeHints: z.number(),
  fsHintsUrl: z.string(),
};

const hintsSummaryInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
};

const changeLogInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
};

const changeLogOutputSchema = {
  changes: z.array(z.any()),
  nextCursor: z.string().optional(),
};

registerToolUnsafe(
  "fs.get_ancestry",
  {
    title: "Carregar ancestrais",
    description: "Retorna nós ancestrais diretos do PID informado.",
    inputSchema: ancestryInputSchema,
    outputSchema: ancestryOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchPedigreeAdapter({ client });
      const result = await adapter.getAncestry(args.pid, args.generations ?? 4);
      return {
        content: [
          {
            type: "text",
            text: `Carregado pedigree ascendente de ${args.pid} (${
              Object.keys(result.nodes).length
            } pessoas).`,
          },
        ],
        structuredContent: result,
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

registerToolUnsafe(
  "fs.get_descendancy",
  {
    title: "Carregar descendentes",
    description: "Retorna descendentes diretos do PID informado.",
    inputSchema: descendancyInputSchema,
    outputSchema: descendancyOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchPedigreeAdapter({ client });
      const result = await adapter.getDescendancy(
        args.pid,
        args.generations ?? 3
      );
      return {
        content: [
          {
            type: "text",
            text: `Carregado pedigree descendente de ${args.pid} (${
              Object.keys(result.nodes).length
            } pessoas).`,
          },
        ],
        structuredContent: result,
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

registerToolUnsafe(
  "fs.hints_summary",
  {
    title: "Resumo de hints",
    description: "Conta hints de registros/árvore do PID informado.",
    inputSchema: hintsSummaryInputSchema,
    outputSchema: hintsSummaryOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchHintsAdapter({ client });
      const summary = await adapter.getHintSummary(args.pid);
      return {
        content: [
          {
            type: "text",
            text: `Há ${summary.total} hint(s) para ${args.pid}.`,
          },
        ],
        structuredContent: summary,
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

registerToolUnsafe(
  "fs.change_log",
  {
    title: "Histórico de mudanças",
    description: "Retorna mudanças recentes no PID informado.",
    inputSchema: changeLogInputSchema,
    outputSchema: changeLogOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const adapter = new FamilySearchChangeAdapter({ client });
      const result = await adapter.getPersonChanges(args.pid);
      return {
        content: [
          {
            type: "text",
            text: `${result.changes.length} alteração(ões) retornadas.`,
          },
        ],
        structuredContent: result,
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

// ==================== PERSON DETAILS ====================

const personDetailsInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
};

const personDetailsOutputSchema = {
  person: z.any(),
  relationships: z.any().optional(),
};

registerToolUnsafe(
  "fs.person_details",
  {
    title: "Detalhes de pessoa",
    description:
      "Retorna informações completas de uma pessoa (nomes, datas, fatos).",
    inputSchema: personDetailsInputSchema,
    outputSchema: personDetailsOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const data = await client.get<any>(`/platform/tree/persons/${args.pid}`);

      const person = data?.persons?.[0];
      if (!person) {
        throw new Error(`Pessoa ${args.pid} não encontrada.`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Pessoa ${args.pid} carregada com sucesso.`,
          },
        ],
        structuredContent: {
          person,
          relationships: data?.relationships,
        },
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

// ==================== PERSON RELATIVES ====================

const personRelativesInputSchema = {
  pid: z.string().min(1).describe("Person ID (PID)"),
};

const personRelativesOutputSchema = {
  parents: z.array(z.any()),
  spouses: z.array(z.any()),
  children: z.array(z.any()),
};

registerToolUnsafe(
  "fs.person_relatives",
  {
    title: "Parentes de pessoa",
    description: "Lista pais, cônjuges e filhos de uma pessoa.",
    inputSchema: personRelativesInputSchema,
    outputSchema: personRelativesOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { client } = await resolveClientForSession(sessionId);
      const data = await client.get<any>(
        `/platform/tree/persons/${args.pid}?relatives=true`
      );

      const relationships = data?.relationships ?? [];
      const persons = data?.persons ?? [];
      const personsMap = new Map(persons.map((p: any) => [p.id, p]));

      const parents: any[] = [];
      const spouses: any[] = [];
      const children: any[] = [];

      for (const rel of relationships) {
        const type = rel?.type;

        // Child-and-Parents relationship
        if (type?.includes("ChildAndParentsRelationship")) {
          const childId = rel.child?.resourceId;
          const parent1Id = rel.parent1?.resourceId;
          const parent2Id = rel.parent2?.resourceId;

          if (childId === args.pid) {
            // This person is the child, add parents
            if (parent1Id) parents.push(personsMap.get(parent1Id));
            if (parent2Id) parents.push(personsMap.get(parent2Id));
          } else {
            // This person is a parent, add child
            if (childId) children.push(personsMap.get(childId));
          }
        }

        // Couple relationship
        if (type?.includes("Couple")) {
          const person1Id = rel.person1?.resourceId;
          const person2Id = rel.person2?.resourceId;

          if (person1Id === args.pid && person2Id) {
            spouses.push(personsMap.get(person2Id));
          } else if (person2Id === args.pid && person1Id) {
            spouses.push(personsMap.get(person1Id));
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Pessoa ${args.pid}: ${parents.length} pai(s), ${spouses.length} cônjuge(s), ${children.length} filho(s).`,
          },
        ],
        structuredContent: {
          parents: parents.filter(Boolean),
          spouses: spouses.filter(Boolean),
          children: children.filter(Boolean),
        },
      };
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

// ==================== CURRENT USER ====================

const currentUserOutputSchema = {
  userId: z.string(),
  displayName: z.string().optional(),
  personId: z.string().optional(),
  email: z.string().optional(),
};

registerToolUnsafe(
  "fs.current_user",
  {
    title: "Usuário atual",
    description:
      "Retorna informações do usuário logado (Person ID, nome, email).",
    inputSchema: {},
    outputSchema: currentUserOutputSchema,
    annotations: { readOnlyHint: true },
  },
  async (_args: any, extra: any) => {
    const { sessionId } = extra;
    try {
      const { auth, client } = await resolveClientForSession(sessionId);

      // Try to get from auth first
      if (auth.personId && auth.displayName) {
        return {
          content: [
            {
              type: "text",
              text: `Usuário logado: ${auth.displayName} (${auth.personId})`,
            },
          ],
          structuredContent: {
            userId: auth.personId,
            displayName: auth.displayName,
            personId: auth.personId,
          },
        };
      }

      // Fetch from API if not in auth
      const res = await fetch(
        `${env.FS_API_BASE_URL.replace(
          /\/+$/,
          ""
        )}/platform/tree/current-person`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            Accept: "application/x-gedcomx-v1+json",
          },
          redirect: "manual",
        }
      );

      if (res.status === 303) {
        const location = res.headers.get("Location");
        if (location) {
          const personId = location.split("/").filter(Boolean).pop();
          if (personId) {
            return {
              content: [
                {
                  type: "text",
                  text: `Seu Person ID: ${personId}`,
                },
              ],
              structuredContent: {
                userId: personId,
                personId,
                displayName: auth.displayName,
              },
            };
          }
        }
      }

      throw new Error(
        "Não foi possível determinar o Person ID do usuário atual."
      );
    } catch (err) {
      return handleToolError(err, sessionId);
    }
  }
);

export async function createTransport() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      transports.set(sessionId, transport);
    },
    onsessionclosed: (sessionId: string) => {
      transports.delete(sessionId);
      clearMcpAuth(sessionId);
    },
  });
  await mcpServer.connect(transport);
  return transport;
}

export function getTransport(sessionId: string | undefined) {
  if (!sessionId) return undefined;
  return transports.get(sessionId);
}

export function loginUrlForSession(sessionId: string) {
  const url = new URL("/api/auth/login", env.NEXT_PUBLIC_APP_ORIGIN);
  url.searchParams.set("state", `mcp:${sessionId}`);
  return url.toString();
}

async function resolveClientForSession(sessionId?: string) {
  console.log(
    "[MCP Server] resolveClientForSession called with sessionId:",
    sessionId
  );
  if (!sessionId) {
    console.error("[MCP Server] No sessionId provided");
    throw new FamilySearchAuthError(
      "not_linked",
      "Sessão sem identificador de MCP."
    );
  }
  const auth = await getMcpAuth(sessionId);
  if (!auth) {
    console.error("[MCP Server] No auth found for sessionId:", sessionId);
    throw new FamilySearchAuthError(
      "not_linked",
      `Vincule sua conta FamilySearch abrindo ${loginUrlForSession(sessionId)}.`
    );
  }
  console.log("[MCP Server] Auth found, checking if fresh");
  const fresh = await ensureFreshAuth(auth);
  console.log("[MCP Server] Auth is fresh, saving to store");
  await saveMcpAuth(sessionId, fresh);
  console.log("[MCP Server] Returning client with access token");
  return { auth: fresh, client: new FamilySearchClient(fresh.accessToken) };
}

function handleToolError(err: unknown, sessionId?: string) {
  if (err instanceof FamilySearchAuthError) {
    const loginUrl = sessionId
      ? loginUrlForSession(sessionId)
      : `${env.NEXT_PUBLIC_APP_ORIGIN}/api/auth/login?state=mcp`;
    return {
      content: [
        { type: "text", text: `${err.message}` },
        { type: "text", text: `Abra ${loginUrl} para concluir a conexão.` },
      ],
      structuredContent: { error: err.code, loginUrl },
      isError: true,
    };
  }
  return {
    content: [
      { type: "text", text: `Erro inesperado: ${(err as Error).message}` },
    ],
    structuredContent: { error: "unexpected_error" },
    isError: true,
  };
}

export function isInitialize(body: unknown) {
  if (!body) return false;
  if (Array.isArray(body)) {
    return body.some((msg) => msg?.method === "initialize");
  }
  return (
    typeof body === "object" &&
    body !== null &&
    (body as any).method === "initialize"
  );
}
