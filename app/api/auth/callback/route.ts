import { NextResponse } from "next/server";
import { env, getAppOrigin } from "../../../../src/lib/env";
import {
  exchangeAuthorizationCode,
  fetchCurrentUser,
} from "../../../../src/lib/familysearch/client";
import { getSession } from "../../../../src/lib/session";
import { saveMcpAuth } from "../../../../src/mcp/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (error) {
    return NextResponse.json({ error, errorDescription }, { status: 400 });
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state") ?? undefined;
  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const session = await getSession();
  const pending = session.pendingAuth;
  if (!pending) {
    return NextResponse.json({ error: "no_pending_auth" }, { status: 400 });
  }

  const stateExpired = Date.now() - pending.createdAt > 10 * 60 * 1000;
  if (!stateParam || stateParam !== pending.state || stateExpired) {
    session.pendingAuth = undefined;
    await session.save();
    return NextResponse.json(
      { error: stateExpired ? "state_expired" : "state_mismatch" },
      { status: 400 }
    );
  }

  try {
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.verifier,
    });

    const now = Date.now();
    const expiresIn = token.expires_in ?? 3600;
    const expiresAt = now + expiresIn * 1000;

    session.familySearch = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scope: token.scope ?? env.FS_OAUTH_SCOPE,
      tokenType: token.token_type ?? "Bearer",
      expiresAt,
      idToken: token.id_token,
      lastLinkedAt: now,
    };

    try {
      const profile = await fetchCurrentUser(token.access_token);
      if (profile) {
        session.familySearch.displayName =
          profile.displayName ?? profile.contactName;
        session.familySearch.personId = profile.personId ?? profile.id;
      }
    } catch {
      // Profile lookup is best-effort; the access token is still valid.
    }

    session.pendingAuth = undefined;
    await session.save();

    if (pending.state.startsWith("mcp:")) {
      const mcpSessionId = pending.state.slice(4);
      await saveMcpAuth(mcpSessionId, session.familySearch);
    }

    const redirectPath =
      pending.redirectTo ??
      `/auth/linked?state=${encodeURIComponent(pending.state)}`;
    const redirectUrl = new URL(redirectPath, getAppOrigin());
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (tokenErr) {
    console.error("FamilySearch callback error", (tokenErr as Error).message);
    session.pendingAuth = undefined;
    session.familySearch = undefined;
    await session.save();
    return NextResponse.json(
      { error: "token_exchange_failed" },
      { status: 500 }
    );
  }
}
