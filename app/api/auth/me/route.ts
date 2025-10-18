import { NextResponse } from "next/server";
import { getSession } from "../../../../src/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    const auth = session.familySearch;

    if (!auth?.accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      personId: auth.personId,
      displayName: auth.displayName,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
