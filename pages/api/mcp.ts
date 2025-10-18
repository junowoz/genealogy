import type { NextApiRequest, NextApiResponse } from 'next/types';
import { getTransport, createTransport, isInitialize } from '../../src/mcp/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const sessionId = (req.headers['mcp-session-id'] as string | undefined) ?? undefined;

  try {
    if (req.method === 'POST') {
      const rawBody = await readBody(req);
      const body = rawBody.length ? safeJsonParse(rawBody.toString('utf8')) : undefined;

      let transport = getTransport(sessionId);
      if (!transport) {
        if (!isInitialize(body)) {
          res.status(400).json({ error: 'Missing session. Inicie com initialize.' });
          return;
        }
        transport = await createTransport();
      }

      await transport.handleRequest(req as any, res as any, body);
      return;
    }

    if (req.method === 'GET') {
      const transport = getTransport(sessionId);
      if (!transport) {
        res.status(400).send('Sessão inválida ou ausente');
        return;
      }
      await transport.handleRequest(req as any, res as any);
      return;
    }

    if (req.method === 'DELETE') {
      const transport = getTransport(sessionId);
      if (!transport) {
        res.status(400).send('Sessão inválida ou ausente');
        return;
      }
      await transport.handleRequest(req as any, res as any);
      return;
    }

    res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
    res.status(405).send('Método não permitido');
  } catch (err) {
    console.error('[mcp] erro', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno', message: (err as Error).message });
    }
  }
}

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

function readBody(req: NextApiRequest) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err: Error) => reject(err));
  });
}

function safeJsonParse(payload: string) {
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}
