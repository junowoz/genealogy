import { NextRequest, NextResponse } from 'next/server';
import { MockPlaceAdapter } from '../../../src/adapters/mock/mockPlaceAdapter';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ places: [] });
  const adapter = new MockPlaceAdapter();
  const places = await adapter.searchPlaces(q);
  return NextResponse.json({ places });
}

