import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '../../../../src/lib/env';
import { FS_AUTHORIZATION_URL } from '../../../../src/lib/familysearch/client';
import { generateCodeChallenge, generateCodeVerifier } from '../../../../src/lib/pkce';
import { getSession } from '../../../../src/lib/session';

const LoginQuerySchema = z.object({
  state: z
    .string()
    .regex(/^[A-Za-z0-9:_-]{1,128}$/, 'state inválido')
    .default('web'),
  redirectTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateParam = url.searchParams.get('state') ?? undefined;
  const redirectToParam = url.searchParams.get('redirectTo') ?? undefined;

  const parsed = LoginQuerySchema.safeParse({ state: stateParam, redirectTo: redirectToParam });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const { state, redirectTo } = parsed.data;
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const session = await getSession();
  session.pendingAuth = {
    verifier,
    state,
    redirectTo: normalizeRedirect(redirectTo),
    createdAt: Date.now(),
  };
  await session.save();

  const authorizeUrl = new URL(FS_AUTHORIZATION_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', env.FS_APP_KEY);
  authorizeUrl.searchParams.set('redirect_uri', env.FS_REDIRECT_URI);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('scope', env.FS_OAUTH_SCOPE);

  return NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
}

function normalizeRedirect(redirectTo?: string) {
  if (!redirectTo) return undefined;
  try {
    const url = new URL(redirectTo, env.NEXT_PUBLIC_APP_ORIGIN);
    if (url.origin !== env.NEXT_PUBLIC_APP_ORIGIN) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
