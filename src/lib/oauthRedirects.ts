export type OAuthProvider = 'google' | 'slack' | 'notion';

type OAuthState = {
  employeeId: string;
  orgId: string;
  returnTo?: string;
};

const providerEnvVars: Record<OAuthProvider, string> = {
  google: 'GOOGLE_REDIRECT_URI',
  slack: 'SLACK_REDIRECT_URI',
  notion: 'NOTION_REDIRECT_URI',
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getBaseUrl(request: Request) {
  const configuredBaseUrl =
    process.env.OAUTH_REDIRECT_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function getOAuthRedirectUri(provider: OAuthProvider, request: Request) {
  const configuredRedirectUri = process.env[providerEnvVars[provider]];

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return `${getBaseUrl(request)}/api/auth/${provider}/callback`;
}

export function getOAuthRedirectUris(request: Request) {
  return {
    google: getOAuthRedirectUri('google', request),
    slack: getOAuthRedirectUri('slack', request),
    notion: getOAuthRedirectUri('notion', request),
  };
}

function getFrontendBaseUrl(request: Request) {
  const referer = request.headers.get('referer');

  if (referer) {
    return new URL(referer).origin;
  }

  const configuredBaseUrl =
    process.env.POST_AUTH_REDIRECT_BASE_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return getBaseUrl(request);
}

export function encodeOAuthState(state: OAuthState) {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

export function decodeOAuthState(stateBase64: string): OAuthState {
  return JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf-8'));
}

export function getOAuthReturnTo(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('return_to');

  if (returnTo) {
    return returnTo;
  }

  return `${getFrontendBaseUrl(request)}/admin/sweep`;
}

export function getPostAuthRedirectUrl(request: Request, state: Pick<OAuthState, 'returnTo'>) {
  return new URL(state.returnTo || `${getFrontendBaseUrl(request)}/admin/sweep`);
}

export function getPostAuthErrorRedirectUrl(request: Request) {
  try {
    const stateBase64 = new URL(request.url).searchParams.get('state');
    const state = stateBase64 ? decodeOAuthState(stateBase64) : {};

    return getPostAuthRedirectUrl(request, state);
  } catch {
    return getPostAuthRedirectUrl(request, {});
  }
}
