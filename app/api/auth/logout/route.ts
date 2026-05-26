import { NextResponse } from 'next/server';
import { getAppOrigin } from '../../../../src/lib/env';
import { getSession } from '../../../../src/lib/session';

export async function POST(req: Request) {
  const session = await getSession();
  await session.destroy();

  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('redirectTo');
  if (redirectTo) {
    try {
      const origin = getAppOrigin();
      const dest = new URL(redirectTo, origin);
      if (dest.origin === origin) {
        return NextResponse.redirect(dest.toString(), { status: 302 });
      }
    } catch {
      // ignore invalid redirectTo
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  return POST(req);
}
