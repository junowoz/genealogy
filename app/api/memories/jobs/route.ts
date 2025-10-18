import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { writeFileSafe } from '../../../../src/utils/fs';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const uploadId: string | undefined = body?.uploadId;
  if (!uploadId) return NextResponse.json({ error: 'uploadId é obrigatório' }, { status: 400 });

  const id = randomUUID();
  const job = {
    id,
    uploadId,
    status: 'queued' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const jobFile = path.join(process.cwd(), 'queue', 'pending', `${id}.json`);
  await writeFileSafe(jobFile, JSON.stringify(job, null, 2));
  return NextResponse.json({ job });
}

// Optional: list queued jobs (dev only)
export async function GET() {
  return NextResponse.json({ message: 'Use /api/memories/jobs/[id] para status. Listagem não implementada nos mocks.' });
}
