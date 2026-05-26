import type { NextApiRequest, NextApiResponse } from "next/types";
import {
  getTransport,
  createTransport,
  isInitialize,
} from "../../src/mcp/server";
import { getAllowedMcpOrigins } from "../../src/lib/env";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_MCP_BODY_BYTES = 1024 * 1024;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!setCors(req, res)) {
    res.status(403).json({ error: "origin_not_allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const sessionId =
    (req.headers["mcp-session-id"] as string | undefined) ?? undefined;

  try {
    if (req.method === "POST") {
      const rawBody = await readBody(req);
      const body = rawBody.length
        ? safeJsonParse(rawBody.toString("utf8"))
        : undefined;
      if (rawBody.length && body === undefined) {
        res.status(400).json({ error: "invalid_json" });
        return;
      }

      let transport = getTransport(sessionId);
      if (!transport) {
        if (!isInitialize(body)) {
          res
            .status(400)
            .json({ error: "Missing session. Inicie com initialize." });
          return;
        }
        transport = await createTransport();
      }

      await transport.handleRequest(req as any, res as any, body);
      return;
    }

    if (req.method === "GET") {
      const transport = getTransport(sessionId);
      if (!transport) {
        res.status(200).json({
          status: "ready",
          message:
            "MCP server is ready. POST JSON-RPC initialize to /api/mcp to start a session.",
          version: "0.3.0",
        });
        return;
      }
      await transport.handleRequest(req as any, res as any);
      return;
    }

    if (req.method === "DELETE") {
      const transport = getTransport(sessionId);
      if (!transport) {
        res.status(400).send("Sessão inválida ou ausente");
        return;
      }
      await transport.handleRequest(req as any, res as any);
      return;
    }

    res.setHeader("Allow", "GET,POST,DELETE,OPTIONS");
    res.status(405).send("Método não permitido");
  } catch (err) {
    console.error("[mcp] request failed", (err as Error).message);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  }
}

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedMcpOrigins();
  allowedOrigins.add("https://chatgpt.com");
  allowedOrigins.add("https://chat.openai.com");

  if (origin) {
    const normalizedOrigin = origin.replace(/\/+$/, "");
    if (!allowedOrigins.has(normalizedOrigin)) {
      return false;
    }
    res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Accept, Content-Type, MCP-Session-Id, Mcp-Session-Id, MCP-Protocol-Version"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  return true;
}

function readBody(req: NextApiRequest) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buffer.byteLength;
      if (size > MAX_MCP_BODY_BYTES) {
        reject(new Error("MCP request body too large"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err: Error) => reject(err));
  });
}

function safeJsonParse(payload: string) {
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}
