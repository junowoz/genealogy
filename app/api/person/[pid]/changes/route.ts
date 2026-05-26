import { NextResponse } from 'next/server';
import { FamilySearchChangeAdapter } from '../../../../../src/adapters/familysearch/changeAdapter';
import { FamilySearchAuthError } from '../../../../../src/lib/familysearch/client';
import { normalizeFamilySearchId } from '../../../../../src/lib/familysearch/ids';

export async function GET(req: Request, ctx: any) {
  const pid: string = ctx?.params?.pid;
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  try {
    const normalizedPid = normalizeFamilySearchId(pid);
    const adapter = new FamilySearchChangeAdapter();
    const { changes, nextCursor } = await adapter.getPersonChanges(normalizedPid, cursor ?? undefined);
    return NextResponse.json({ changes, nextCursor });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    if ((err as Error).message === 'invalid_familysearch_id') {
      return NextResponse.json({ error: 'invalid_pid' }, { status: 400 });
    }
    console.error('FamilySearch changes error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
