import { NextResponse } from 'next/server';
import { FamilySearchHintsAdapter } from '../../../../src/adapters/familysearch/hintsAdapter';
import { FamilySearchAuthError } from '../../../../src/lib/familysearch/client';
import { normalizeFamilySearchId } from '../../../../src/lib/familysearch/ids';

export async function GET(_req: Request, ctx: any) {
  const pid: string = ctx?.params?.pid;
  try {
    const normalizedPid = normalizeFamilySearchId(pid);
    const adapter = new FamilySearchHintsAdapter();
    const data = await adapter.getHintSummary(normalizedPid);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    if ((err as Error).message === 'invalid_familysearch_id') {
      return NextResponse.json({ error: 'invalid_pid' }, { status: 400 });
    }
    console.error('FamilySearch hints error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
