import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeFileSafe } from '../../../../src/utils/fs';
import {
  FamilySearchAuthError,
  getFamilySearchContext,
} from '../../../../src/lib/familysearch/client';
import { getAppDataPath, isUuid } from '../../../../src/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await getFamilySearchContext();

    const body = await req.json().catch(() => null);
    const uploadId: string | undefined = body?.uploadId;
    if (!isUuid(uploadId)) return NextResponse.json({ error: 'uploadId inválido' }, { status: 400 });

    const id = randomUUID();
    const job = {
      id,
      uploadId,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const jobFile = getAppDataPath('queue', 'pending', `${id}.json`);
    await writeFileSafe(jobFile, JSON.stringify(job, null, 2));
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    throw err;
  }
}

// Optional: list queued jobs (dev only)
export async function GET() {
  try {
    await getFamilySearchContext();
    return NextResponse.json({ message: 'Use /api/memories/jobs/[id] para status. Listagem não implementada nos mocks.' });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    throw err;
  }
}
