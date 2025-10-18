import { NextRequest, NextResponse } from 'next/server';
import { FamilySearchPlaceAdapter } from '../../../src/adapters/familysearch/placeAdapter';
import { FamilySearchAuthError } from '../../../src/lib/familysearch/client';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ places: [] });
  try {
    const adapter = new FamilySearchPlaceAdapter();
    const places = await adapter.searchPlaces(q);
    return NextResponse.json({ places });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('FamilySearch place search error', err);
    return NextResponse.json(
      { error: 'familysearch_error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
