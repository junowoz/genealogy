import { NextResponse } from "next/server";
import { env } from "../../../../src/lib/env";
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
    console.error("[OAuth Callback] No pending auth in session");
    return NextResponse.json({ error: "no_pending_auth" }, { status: 400 });
  }

  // Validate state parameter
  if (stateParam && stateParam !== pending.state) {
    console.error("[OAuth Callback] State mismatch", {
      expected: pending.state,
      received: stateParam,
    });
    session.pendingAuth = undefined;
    await session.save();
    return NextResponse.json({ error: "state_mismatch" }, { status: 400 });
  }

  try {
    console.log("[OAuth Callback] Exchanging authorization code for token");
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.verifier,
    });

    console.log("[OAuth Callback] Token received:", {
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      expiresIn: token.expires_in,
      tokenType: token.token_type,
      scope: token.scope,
    });

    const now = Date.now();
    const expiresIn = token.expires_in ?? 3600; // Default 1 hora se não vier
    const expiresAt = now + expiresIn * 1000;

    console.log("[OAuth Callback] Token expiration:", {
      now: new Date(now).toISOString(),
      expiresIn: `${expiresIn} seconds (${Math.floor(expiresIn / 60)} minutes)`,
      expiresAt: new Date(expiresAt).toISOString(),
    });

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
      console.log("[OAuth Callback] Fetching user profile");
      const profile = await fetchCurrentUser(token.access_token);
      console.log("[OAuth Callback] Profile response:", {
        hasProfile: !!profile,
        profileKeys: profile ? Object.keys(profile) : [],
        id: profile?.id,
        personId: profile?.personId,
        displayName: profile?.displayName,
        contactName: profile?.contactName,
      });
      if (profile) {
        session.familySearch.displayName =
          profile.displayName ?? profile.contactName;
        session.familySearch.personId = profile.personId ?? profile.id;
        console.log("[OAuth Callback] User profile saved to session", {
          personId: session.familySearch.personId,
          displayName: session.familySearch.displayName,
        });
      } else {
        console.warn(
          "[OAuth Callback] No profile returned from fetchCurrentUser"
        );
      }
    } catch (profileErr) {
      console.error("[OAuth Callback] Failed to fetch FamilySearch profile:", {
        error: (profileErr as Error).message,
        stack: (profileErr as Error).stack,
      });
    }

    // Save session FIRST before MCP store
    session.pendingAuth = undefined;
    await session.save();
    console.log("[OAuth Callback] Session saved successfully", {
      hasAccessToken: !!session.familySearch.accessToken,
      hasRefreshToken: !!session.familySearch.refreshToken,
      personId: session.familySearch.personId,
      expiresAt: new Date(session.familySearch.expiresAt).toISOString(),
      cookieName: "genealogy_session",
    });

    // If this is an MCP session, save to MCP store AFTER session is saved
    if (pending.state.startsWith("mcp:")) {
      const mcpSessionId = pending.state.slice(4);
      console.log(
        "[OAuth Callback] Saving MCP auth for session:",
        mcpSessionId
      );
      await saveMcpAuth(mcpSessionId, session.familySearch);
    }

    const redirectPath =
      pending.redirectTo ??
      `/auth/linked?state=${encodeURIComponent(pending.state)}`;
    const redirectUrl = new URL(redirectPath, env.NEXT_PUBLIC_APP_ORIGIN);
    console.log("[OAuth Callback] Redirecting to:", redirectPath);
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (tokenErr) {
    console.error("FamilySearch callback error", tokenErr);
    session.pendingAuth = undefined;
    session.familySearch = undefined;
    await session.save();
    return NextResponse.json(
      { error: "token_exchange_failed", message: (tokenErr as Error).message },
      { status: 500 }
    );
  }
}
