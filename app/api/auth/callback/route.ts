import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  // Placeholder: exchange `code` for tokens using server-side call to FS token endpoint.
  return NextResponse.json({
    message: 'Auth callback not implemented in mocks.',
    receivedCode: code
  }, { status: 501 });
}

