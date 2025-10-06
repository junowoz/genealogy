import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder: in real integration, redirect to FamilySearch OAuth authorization page.
  return NextResponse.json({
    message: 'Auth not implemented in mocks. Configure OAuth2/PKCE and redirect to FS authorization URL here.'
  }, { status: 501 });
}

