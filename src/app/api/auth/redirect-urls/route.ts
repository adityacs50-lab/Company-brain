import { NextResponse } from 'next/server';
import { getOAuthRedirectUris } from '@/lib/oauthRedirects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return NextResponse.json({
    redirectUris: getOAuthRedirectUris(request),
  });
}
