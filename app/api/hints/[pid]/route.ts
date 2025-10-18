import { NextRequest, NextResponse } from 'next/server';
import { FamilySearchHintsAdapter } from '../../../../src/adapters/familysearch/hintsAdapter';
import { FamilySearchAuthError } from '../../../../src/lib/familysearch/client';

export async function GET(_req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  try {
    const adapter = new FamilySearchHintsAdapter();
    const data = await adapter.getHintSummary(pid);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('FamilySearch hints error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
