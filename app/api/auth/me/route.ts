import { NextResponse } from "next/server";
import { getSession } from "../../../../src/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    const auth = session.familySearch;

    console.log("[Auth Me] Session check:", {
      hasAuth: !!auth,
      hasAccessToken: !!auth?.accessToken,
      hasRefreshToken: !!auth?.refreshToken,
      personId: auth?.personId,
      displayName: auth?.displayName,
      expiresAt: auth ? new Date(auth.expiresAt).toISOString() : null,
      isExpired: auth ? auth.expiresAt < Date.now() : null,
    });

    if (!auth?.accessToken) {
      console.log("[Auth Me] No access token, returning 401");
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

    console.log("[Auth Me] Returning authenticated response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Auth Me] Error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
