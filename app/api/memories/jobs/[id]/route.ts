import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import {
  FamilySearchAuthError,
  getFamilySearchContext,
} from '../../../../../src/lib/familysearch/client';
import { getAppDataPath, isUuid } from '../../../../../src/lib/storage';

export const runtime = 'nodejs';

async function loadJsonOrNull(p: string): Promise<any | null> {
  try {
    const txt = await fs.readFile(p, 'utf-8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: any) {
  try {
    const id: string = ctx?.params?.id;
    await getFamilySearchContext();
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Job inválido' }, { status: 400 });
    }

    const files = {
      pending: getAppDataPath('queue', 'pending', `${id}.json`),
      processing: getAppDataPath('queue', 'processing', `${id}.json`),
      result: getAppDataPath('queue', 'results', `${id}.json`),
      failed: getAppDataPath('queue', 'failed', `${id}.json`),
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
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    throw err;
  }
}
