import { NextResponse } from "next/server";
import { getSession } from "../../../../src/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    const auth = session.familySearch;

    if (!auth?.accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const response = {
      authenticated: true,
      personId: auth.personId,
      displayName: auth.displayName,
      expiresAt: auth.expiresAt,
      expiresIn: Math.floor((auth.expiresAt - Date.now()) / 1000), // seconds
      hasRefreshToken: !!auth.refreshToken,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
