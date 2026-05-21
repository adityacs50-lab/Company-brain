export type OAuthProvider = 'google' | 'slack' | 'notion';

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
