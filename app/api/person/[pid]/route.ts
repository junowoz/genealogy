import { NextResponse } from "next/server";
import { getFamilySearchContext } from "../../../../src/lib/familysearch/client";
import { encodeFamilySearchId } from "../../../../src/lib/familysearch/ids";

export async function GET(_req: Request, ctx: any) {
  const pid: string = ctx?.params?.pid;

  if (!pid) {
    return NextResponse.json({ error: "missing_pid" }, { status: 400 });
  }

  try {
    const safePid = encodeFamilySearchId(pid);
    const { client } = await getFamilySearchContext();
    const data = await client.get<any>(`/platform/tree/persons/${safePid}`);

    const person = data?.persons?.[0];
    if (!person) {
      return NextResponse.json({ error: "person_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      person,
      relationships: data?.relationships || [],
      sourceDescriptions: data?.sourceDescriptions || [],
    });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
      return NextResponse.json(
        { error: "auth_required", message: "Login necessário" },
        { status: 401 }
      );
    }

    if (err.message?.includes("404") || err.message?.includes("not found")) {
      return NextResponse.json({ error: "person_not_found" }, { status: 404 });
    }
    if (err.message === "invalid_familysearch_id") {
      return NextResponse.json({ error: "invalid_pid" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "familysearch_error", message: err.message },
      { status: 502 }
    );
  }
}
