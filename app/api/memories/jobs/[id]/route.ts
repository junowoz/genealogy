import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

async function loadJsonOrNull(p: string): Promise<any | null> {
  try {
    const txt = await fs.readFile(p, 'utf-8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const base = path.join(process.cwd(), 'queue');
  const files = {
    pending: path.join(base, 'pending', `${id}.json`),
    processing: path.join(base, 'processing', `${id}.json`),
    result: path.join(base, 'results', `${id}.json`),
    failed: path.join(base, 'failed', `${id}.json`),
  } as const;

  const result = await loadJsonOrNull(files.result);
  if (result) return NextResponse.json({ job: { ...result.job, status: 'completed' }, result: result.result });

  if (await loadJsonOrNull(files.failed)) {
    const j = await loadJsonOrNull(files.failed);
    return NextResponse.json({ job: { ...j.job, status: 'failed', error: j.error } });
  }

  if (await loadJsonOrNull(files.processing)) {
    const j = await loadJsonOrNull(files.processing);
    return NextResponse.json({ job: { ...j.job, status: 'processing' } });
  }

  if (await loadJsonOrNull(files.pending)) {
    const j = await loadJsonOrNull(files.pending);
    return NextResponse.json({ job: { ...j, status: 'queued' } });
  }

  return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
}

