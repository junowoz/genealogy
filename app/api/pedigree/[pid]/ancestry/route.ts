import { NextRequest, NextResponse } from 'next/server';
import { FamilySearchPedigreeAdapter } from '../../../../../src/adapters/familysearch/pedigreeAdapter';
import { FamilySearchAuthError } from '../../../../../src/lib/familysearch/client';

export async function GET(req: NextRequest, ctx: { params: { pid: string } }) {
  const pid = ctx.params.pid;
  const url = new URL(req.url);
  const generations = Number.parseInt(url.searchParams.get('generations') ?? '4', 10);

  try {
    const adapter = new FamilySearchPedigreeAdapter();
    const data = await adapter.getAncestry(pid, Number.isNaN(generations) ? 4 : generations);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('FamilySearch ancestry error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
