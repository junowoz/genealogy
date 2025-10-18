import { NextResponse } from 'next/server';
import { env } from '../../../../src/lib/env';
import { exchangeAuthorizationCode, fetchCurrentUser } from '../../../../src/lib/familysearch/client';
import { getSession } from '../../../../src/lib/session';
import { saveMcpAuth } from '../../../../src/mcp/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  if (error) {
    return NextResponse.json(
      { error, errorDescription },
      { status: 400 }
    );
  }

  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state') ?? undefined;
  if (!code) {
    return NextResponse.json({ error: 'missing_code' }, { status: 400 });
  }

  const session = await getSession();
  const pending = session.pendingAuth;
  if (!pending) {
    return NextResponse.json({ error: 'no_pending_auth' }, { status: 400 });
  }

  if (stateParam && stateParam !== pending.state) {
    if (pending.state.startsWith('mcp:') && session.familySearch) {
      const mcpSessionId = pending.state.slice(4);
      if (mcpSessionId) {
        saveMcpAuth(mcpSessionId, session.familySearch);
      }
    }

    session.pendingAuth = undefined;
    await session.save();
    return NextResponse.json({ error: 'state_mismatch' }, { status: 400 });
  }

  try {
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.verifier,
    });

    const now = Date.now();
    session.familySearch = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scope: token.scope ?? env.FS_OAUTH_SCOPE,
      tokenType: token.token_type ?? 'Bearer',
      expiresAt: now + (token.expires_in ?? 0) * 1000,
      idToken: token.id_token,
      lastLinkedAt: now,
    };

    try {
      const profile = await fetchCurrentUser(token.access_token);
      if (profile) {
        session.familySearch.displayName = profile.displayName ?? profile.contactName;
        session.familySearch.personId = profile.personId ?? profile.id;
      }
    } catch (profileErr) {
      console.error('Failed to fetch FamilySearch profile', profileErr);
    }

    session.pendingAuth = undefined;
    await session.save();

    const redirectPath = pending.redirectTo ?? `/auth/linked?state=${encodeURIComponent(pending.state)}`;
    const redirectUrl = new URL(redirectPath, env.NEXT_PUBLIC_APP_ORIGIN);
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (tokenErr) {
    console.error('FamilySearch callback error', tokenErr);
    session.pendingAuth = undefined;
    session.familySearch = undefined;
    await session.save();
    return NextResponse.json(
      { error: 'token_exchange_failed', message: (tokenErr as Error).message },
      { status: 500 }
    );
  }
}
