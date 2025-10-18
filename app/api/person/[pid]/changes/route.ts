import { NextRequest, NextResponse } from 'next/server';
import { FamilySearchChangeAdapter } from '../../../../../src/adapters/familysearch/changeAdapter';
import { FamilySearchAuthError } from '../../../../../src/lib/familysearch/client';

export async function GET(req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  try {
    const adapter = new FamilySearchChangeAdapter();
    const { changes, nextCursor } = await adapter.getPersonChanges(pid, cursor ?? undefined);
    return NextResponse.json({ changes, nextCursor });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('FamilySearch changes error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
