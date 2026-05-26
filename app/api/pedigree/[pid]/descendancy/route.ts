import { NextResponse } from 'next/server';
import { FamilySearchPedigreeAdapter } from '../../../../../src/adapters/familysearch/pedigreeAdapter';
import { FamilySearchAuthError } from '../../../../../src/lib/familysearch/client';
import { normalizeFamilySearchId } from '../../../../../src/lib/familysearch/ids';

export async function GET(req: Request, ctx: any) {
  const pid: string = ctx?.params?.pid;
  const url = new URL(req.url);
  const generations = Number.parseInt(url.searchParams.get('generations') ?? '3', 10);

  try {
    const normalizedPid = normalizeFamilySearchId(pid);
    const safeGenerations = Number.isNaN(generations)
      ? 3
      : Math.min(Math.max(generations, 1), 6);
    const adapter = new FamilySearchPedigreeAdapter();
    const data = await adapter.getDescendancy(normalizedPid, safeGenerations);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    if ((err as Error).message === 'invalid_familysearch_id') {
      return NextResponse.json({ error: 'invalid_pid' }, { status: 400 });
    }
    console.error('FamilySearch descendancy error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
