import { NextResponse } from "next/server";
import { z } from "zod";
import { FamilySearchSearchAdapter } from "../../../src/adapters/familysearch/searchAdapter";
import { FamilySearchAuthError } from "../../../src/lib/familysearch/client";

const QuerySchema = z.object({
  name: z.string().min(1),
  birthYearFrom: z.string().optional(),
  birthYearTo: z.string().optional(),
  placeId: z.string().optional(),
  placeText: z.string().optional(),
});

export async function GET(req: Request) {
  console.log("[Search API] Request received");
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos" },
      { status: 400 }
    );
  }
  const { name, birthYearFrom, birthYearTo, placeId, placeText } = parsed.data;

  try {
    console.log("[Search API] Creating FamilySearchSearchAdapter");
    const adapter = new FamilySearchSearchAdapter();
    const candidates = await adapter.searchPersons({
      name,
      birthYearFrom: birthYearFrom
        ? Number.parseInt(birthYearFrom, 10)
        : undefined,
      birthYearTo: birthYearTo ? Number.parseInt(birthYearTo, 10) : undefined,
      placeId: placeId || undefined,
      placeText: placeText || undefined,
    });
    return NextResponse.json({ candidates });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json(
        { error: "auth_required", message: err.message },
        { status: 401 }
      );
    }
    console.error("FamilySearch search error", err);
    return NextResponse.json(
      { error: "familysearch_error", message: (err as Error).message },
      { status: 502 }
    );
  }
}
