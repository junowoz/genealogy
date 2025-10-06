Genearchive Connector (ChatGPT Apps SDK + MCP)

What this provides

- MCP server (TypeScript + Fastify) exposing /mcp with Streamable HTTP.
- Four read-only tools: `search_person`, `get_pedigree`, `places_autocomplete`, `hints_summary`.
- Inline UI widget resource (`ui://widget/results.html`) wired via `_meta["openai/outputTemplate"]`.
- React + Vite widget that reads `window.openai` bridge and renders a results table with filters and a refresh action using `callTool` and `setWidgetState`.

Quick start (local)

- Node 20+
- In one step: `npm install -w connector/ui && npm install -w connector/server` then `npm run build` from `connector/`.
- Or run per package:
  - `cd connector/ui && npm i && npm run build`
  - `cd connector/server && npm i`

Run the MCP server

- From `connector/`: `npm run dev` (builds UI then starts server at `http://localhost:2091/mcp`).
- Health check: `http://localhost:2091/health`.

Test with MCP Inspector

- Point MCP Inspector at `http://localhost:2091/mcp`.
- Call `search_person` with `{ "q": "Maria Silva", "birthYear": 1902, "placeText": "São Paulo" }`.
- The inline widget renders a sortable/filtered table and supports "Atualizar" via `callTool`.

Expose to ChatGPT (dev)

- Use ngrok: `ngrok http 2091` then use `https://<sub>.ngrok.app/mcp` when creating the connector in ChatGPT Developer Mode.

Next steps

- Swap static results with FamilySearch read-only APIs.
- Add OAuth 2.1 if needed and enforce per-tool `securitySchemes`.
- Expand the widget with paging, score chips, and place authority auto‑complete.

