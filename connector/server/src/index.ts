import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Infer __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create MCP server instance
const mcp = new McpServer(
  {
    name: 'genearchive-mcp',
    version: '0.1.0',
    icons: [{ src: './genearchive.svg', sizes: ['512x512'], mimeType: 'image/svg+xml' }]
  },
  {
    capabilities: {
      logging: {},
      // Tools + Resources are enabled when we register handlers
    }
  }
);

// --- UI Resource (React widget) ---
function loadWidgetAssets() {
  // Built assets from connector/ui
  try {
    const root = join(__dirname, '../../..');
    const js = readFileSync(join(root, 'ui/dist/widget.js'), 'utf8');
    let css = '';
    try {
      css = readFileSync(join(root, 'ui/dist/widget.css'), 'utf8');
    } catch {
      // optional CSS
    }
    return { js, css };
  } catch (err) {
    // Fallback minimal inline widget if bundle not present yet (no template nesting)
    const js = `
      const root = document.getElementById('genearchive-root');
      root.innerHTML = '<div style="font-family:Inter,system-ui,Arial,sans-serif;padding:12px">Genearchive widget: build UI first (cd connector/ui && npm run build)</div>';
    `;
    return { js, css: '' };
  }
}

const { js: WIDGET_JS, css: WIDGET_CSS } = loadWidgetAssets();

mcp.registerResource(
  'genearchive-widget',
  'ui://widget/results.html',
  {},
  async () => ({
    contents: [
      {
        uri: 'ui://widget/results.html',
        mimeType: 'text/html+skybridge',
        text: `
<div id="genearchive-root"></div>
${WIDGET_CSS ? `<style>${WIDGET_CSS}</style>` : ''}
<script type="module">${WIDGET_JS}</script>
        `.trim(),
        _meta: {
          "openai/widgetDescription": "Tabela interativa de candidatos de pesquisa FamilySearch (read-only).",
          "openai/widgetPrefersBorder": true,
          "openai/widgetCSP": {
            connect_domains: [],
            resource_domains: []
          }
        }
      }
    ]
  })
);

// --- Tools ---
// Common types
const PersonCandidate = z.object({
  pid: z.string(),
  fullName: z.string(),
  birth: z.object({ date: z.string().optional(), place: z.string().optional() }).partial().optional(),
  death: z.object({ date: z.string().optional(), place: z.string().optional() }).partial().optional(),
  place: z.string().optional(),
  score: z.number().min(0).max(1).optional()
});

// search_person (fake data initially)
mcp.registerTool(
  'search_person',
  {
    title: 'Search person (FamilySearch)',
    description: 'Busca pessoas por nome/ano/local e retorna candidatos ranqueados (read-only).',
    inputSchema: {
      q: z.string().describe('Nome completo ou parcial'),
      birthYear: z.number().optional().describe('Ano de nascimento (aprox.)'),
      placeText: z.string().optional().describe('Local relacionado (cidade/estado/país)'),
    },
    outputSchema: {
      q: z.string(),
      total: z.number(),
      candidates: z.array(PersonCandidate)
    },
    annotations: { readOnlyHint: true },
    _meta: {
      'openai/outputTemplate': 'ui://widget/results.html',
      'openai/widgetAccessible': true,
      'openai/toolInvocation/invoking': 'Pesquisando…',
      'openai/toolInvocation/invoked': 'Resultados prontos'
    }
  },
  async ({ q, birthYear, placeText }) => {
    // Static placeholder results, replace with FamilySearch API later
    const all = [
      {
        pid: 'KWZ1-ABC',
        fullName: 'Maria da Silva',
        birth: { date: '1902', place: 'São Paulo, Brasil' },
        death: { date: '1978', place: 'Campinas, Brasil' },
        place: 'São Paulo, BR',
        score: 0.92
      },
      {
        pid: 'KWZ1-DEF',
        fullName: 'Maria Aparecida Silva',
        birth: { date: '1901', place: 'São Paulo, Brasil' },
        death: { date: '1980', place: 'São Paulo, Brasil' },
        place: 'São Paulo, BR',
        score: 0.88
      },
      {
        pid: 'KWZ1-GHI',
        fullName: 'Maria Silva',
        birth: { date: '1904', place: 'Lisboa, Portugal' },
        place: 'Lisboa, PT',
        score: 0.71
      }
    ];

    const filtered = all.filter(c => {
      const n = c.fullName.toLowerCase();
      const okName = q ? n.includes(q.toLowerCase()) : true;
      const okYear = birthYear ? String(c.birth?.date || '').includes(String(birthYear)) : true;
      const okPlace = placeText ? ((c.place||'') + ' ' + (c.birth?.place||'')).toLowerCase().includes(placeText.toLowerCase()) : true;
      return okName && okYear && okPlace;
    });

    return {
      content: [{ type: 'text', text: `Encontrei ${filtered.length} candidatos para "${q}".` }],
      structuredContent: { q, total: filtered.length, candidates: filtered },
      _meta: { byId: Object.fromEntries(filtered.map(c => [c.pid, c])) }
    };
  }
);

// get_pedigree (placeholder)
mcp.registerTool(
  'get_pedigree',
  {
    title: 'Get pedigree (ancestry/descendancy)',
    description: 'Retorna conexões básicas de parentesco (read-only).',
    inputSchema: { pid: z.string().describe('Person ID') },
    annotations: { readOnlyHint: true },
    _meta: { 'openai/outputTemplate': 'ui://widget/results.html' }
  },
  async ({ pid }) => {
    return {
      content: [{ type: 'text', text: `Pedigree básico de ${pid}.` }],
      structuredContent: { pedigree: { pid, parents: [], spouses: [], children: [] } }
    };
  }
);

// places_autocomplete (placeholder)
mcp.registerTool(
  'places_autocomplete',
  {
    title: 'Places autocomplete',
    description: 'Resolve Place Authority e retorna { placeId, text, jurisdiction }',
    inputSchema: { q: z.string().describe('Texto do lugar') },
    annotations: { readOnlyHint: true }
  },
  async ({ q }) => {
    const items = [
      { placeId: 'PL1', text: 'São Paulo, Brasil', jurisdiction: ['Brasil', 'São Paulo'] },
      { placeId: 'PL2', text: 'Lisboa, Portugal', jurisdiction: ['Portugal', 'Lisboa'] }
    ].filter(p => p.text.toLowerCase().includes(q.toLowerCase()));
    return {
      content: [{ type: 'text', text: `${items.length} lugares para "${q}".` }],
      structuredContent: { items }
    };
  }
);

// hints_summary (placeholder)
mcp.registerTool(
  'hints_summary',
  {
    title: 'Hints summary',
    description: 'Somente contagem + redirect (sem mostrar registro).',
    inputSchema: { pid: z.string().describe('Person ID') },
    annotations: { readOnlyHint: true }
  },
  async ({ pid }) => {
    // fake count and a URL
    const count = Math.floor(Math.random() * 5);
    const redirectUrl = `https://www.familysearch.org/tree/person/sources/${encodeURIComponent(pid)}`;
    return {
      content: [{ type: 'text', text: `Há ${count} hints para ${pid}. Abrir em: ${redirectUrl}` }],
      structuredContent: { count, redirectUrl }
    };
  }
);

// --- HTTP server wiring (Streamable HTTP transport) ---
const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });
await app.register(cors, { origin: true });

// Keep transports by session for Streamable HTTP
const transports: Record<string, StreamableHTTPServerTransport> = {};

// POST /mcp — JSON-RPC messages
app.post('/mcp', async (req, reply) => {
  const body: any = (req as any).body;
  const sessionId = (req.headers['mcp-session-id'] as string | undefined) || undefined;

  try {
    let transport: StreamableHTTPServerTransport | undefined = sessionId ? transports[sessionId] : undefined;
    if (!transport) {
      // Only allow creating a new transport on initialize
      // @ts-ignore
      const maybeInit = Array.isArray(body) ? body.find(m => m?.method === 'initialize') : body?.method === 'initialize';
      if (maybeInit) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            transports[sid] = transport!;
          }
        });
        await mcp.connect(transport);
      } else {
        // Not init and no transport: bad request
        reply.status(400);
        // @ts-ignore
        return reply.send({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: null });
      }
    }
    // Hand off to transport
    // Fastify reply/raw
    // @ts-ignore
    return transport.handleRequest(req.raw, reply.raw, body as any);
  } catch (err) {
    req.log.error({ err }, 'Error handling MCP request');
    if (!reply.sent) {
      reply.status(500);
      // @ts-ignore
      return reply.send({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
});

// GET /mcp — SSE stream
app.get('/mcp', async (req, reply) => {
  const sessionId = (req.headers['mcp-session-id'] as string | undefined) || undefined;
  if (!sessionId || !transports[sessionId]) {
    reply.code(400);
    return reply.send('Invalid or missing session ID');
  }
  const transport = transports[sessionId];
  // @ts-ignore
  return transport.handleRequest(req.raw, reply.raw);
});

// DELETE /mcp — session termination
app.delete('/mcp', async (req, reply) => {
  const sessionId = (req.headers['mcp-session-id'] as string | undefined) || undefined;
  if (!sessionId || !transports[sessionId]) {
    reply.code(400);
    return reply.send('Invalid or missing session ID');
  }
  const transport = transports[sessionId];
  // @ts-ignore
  return transport.handleRequest(req.raw, reply.raw);
});

app.get('/health', async () => ({ ok: true }));

const PORT = Number(process.env.PORT || 2091);
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[genearchive] MCP listening on http://localhost:${PORT}/mcp`);
