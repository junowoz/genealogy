import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MockSearchAdapter } from '../../../src/adapters/mock/mockSearchAdapter';

const QuerySchema = z.object({
  name: z.string().min(1),
  birthYearFrom: z.string().optional(),
  birthYearTo: z.string().optional(),
  placeId: z.string().optional(),
  placeText: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }
  const { name, birthYearFrom, birthYearTo, placeId, placeText } = parsed.data;
  const adapter = new MockSearchAdapter();
  const candidates = await adapter.searchPersons({
    name,
    birthYearFrom: birthYearFrom ? parseInt(birthYearFrom) : undefined,
    birthYearTo: birthYearTo ? parseInt(birthYearTo) : undefined,
    placeId,
    placeText,
  });
  // group by score bands? For now, return as array sorted by adapter
  return NextResponse.json({ candidates });
}

