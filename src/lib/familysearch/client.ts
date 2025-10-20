import type { IronSession } from "iron-session";
import { env } from "../env";
import {
  clearAuth,
  getSession,
  isTokenExpired,
  type AppSessionData,
  type FamilySearchAuthState,
} from "../session";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface CurrentUserProfile {
  id?: string;
  displayName?: string;
  contactName?: string;
  personId?: string;
  email?: string;
}

const authorizationUrl = `${env.FS_AUTH_BASE_URL.replace(
  /\/+$/,
  ""
)}/authorization`;
const tokenUrl = `${env.FS_AUTH_BASE_URL.replace(/\/+$/, "")}/token`;

export const FS_AUTHORIZATION_URL = authorizationUrl;
export const FS_TOKEN_URL = tokenUrl;

export async function exchangeAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: env.FS_REDIRECT_URI,
    client_id: env.FS_APP_KEY,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `FamilySearch token exchange failed: ${res.status} ${res.statusText} — ${errorText}`
    );
  }

  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri: env.FS_REDIRECT_URI,
    client_id: env.FS_APP_KEY,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `FamilySearch token refresh failed: ${res.status} ${res.statusText} — ${errorText}`
    );
  }

  return (await res.json()) as TokenResponse;
}

export async function fetchCurrentUser(
  accessToken: string
): Promise<CurrentUserProfile | undefined> {
  console.log("[fetchCurrentUser] Starting fetch");
  const res = await fetch(
    `${env.FS_API_BASE_URL.replace(/\/+$/, "")}/platform/users/current`,
    {
      headers: buildHeaders(accessToken),
      cache: "no-store",
    }
  );

  console.log("[fetchCurrentUser] Response status:", res.status);

  if (res.status === 401) {
    console.warn("[fetchCurrentUser] Unauthorized (401)");
    return undefined;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[fetchCurrentUser] Error response:", {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new Error(
      `Failed to load FamilySearch profile: ${res.status} ${res.statusText} — ${text}`
    );
  }

  const payload = await res.json();
  console.log("[fetchCurrentUser] Payload received:", {
    hasUsers: Array.isArray(payload?.users),
    usersCount: Array.isArray(payload?.users) ? payload.users.length : 0,
    payloadKeys: Object.keys(payload || {}),
  });

  const user =
    Array.isArray(payload?.users) && payload.users.length
      ? payload.users[0]
      : undefined;
  
  if (!user) {
    console.warn("[fetchCurrentUser] No user found in payload");
    return undefined;
  }

  console.log("[fetchCurrentUser] User object:", {
    hasId: !!user.id,
    hasUserId: !!user.userId,
    hasLinks: !!user.links,
    linksKeys: user.links ? Object.keys(user.links) : [],
    personLink: user?.links?.person?.href,
    treeLink: user?.links?.tree?.href,
  });

  const personLink: string | undefined =
    user?.links?.person?.href ??
    user?.links?.tree?.href ??
    user?.links?.Person?.href ??
    undefined;

  const personId = personLink
    ? personLink.split("/").filter(Boolean).pop()
    : undefined;

  console.log("[fetchCurrentUser] Extracted personId:", personId);

  const profile = {
    id: user.id ?? user.userId ?? undefined,
    displayName:
      user.displayName ?? user.fullName ?? user.contactName ?? undefined,
    contactName: user.contactName ?? undefined,
    personId,
    email: user.preferredEmail ?? user.email ?? undefined,
  };

  console.log("[fetchCurrentUser] Final profile:", profile);

  return profile;
}

export class FamilySearchClient {
  private readonly baseUrl = env.FS_API_BASE_URL.replace(/\/+$/, "");

  constructor(private readonly accessToken: string) {}

  public async get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: "GET" });
  }

  public async post<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: "POST" });
  }

  public async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...buildHeaders(this.accessToken),
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `FamilySearch request failed: ${res.status} ${res.statusText} — ${text}`
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }
}

function buildHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json, application/x-gedcomx-v1+json",
    "Content-Type": "application/json",
    "Accept-Language": "pt,en;q=0.9",
  };
}

export class FamilySearchAuthError extends Error {
  constructor(
    public readonly code: "not_linked" | "expired" | "refresh_failed",
    message: string
  ) {
    super(message);
    this.name = "FamilySearchAuthError";
  }
}

export interface FamilySearchContext {
  session: IronSession<AppSessionData>;
  auth: FamilySearchAuthState;
  client: FamilySearchClient;
}

export async function getFamilySearchContext(): Promise<FamilySearchContext> {
  const session = await getSession();
  let auth = session.familySearch;

  console.log("[getFamilySearchContext] Session state:", {
    hasAuth: !!auth,
    hasPendingAuth: !!session.pendingAuth,
    authKeys: auth ? Object.keys(auth) : [],
    hasAccessToken: auth ? !!auth.accessToken : false,
    hasRefreshToken: auth ? !!auth.refreshToken : false,
    personId: auth?.personId,
    expiresAt: auth ? new Date(auth.expiresAt).toISOString() : null,
  });

  if (!auth) {
    throw new FamilySearchAuthError(
      "not_linked",
      "Conta FamilySearch não vinculada."
    );
  }

  if (isTokenExpired(auth)) {
    if (!auth.refreshToken) {
      clearAuth(session);
      await session.save();
      throw new FamilySearchAuthError(
        "expired",
        "Sessão expirada. Faça login novamente."
      );
    }

    try {
      const refreshed = await refreshAccessToken(auth.refreshToken);
      const now = Date.now();
      auth = {
        ...auth,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? auth.refreshToken,
        scope: refreshed.scope ?? auth.scope,
        tokenType: refreshed.token_type ?? auth.tokenType,
        expiresAt: now + (refreshed.expires_in ?? 0) * 1000,
      };
      session.familySearch = auth;
      await session.save();
    } catch (err) {
      clearAuth(session);
      await session.save();
      throw new FamilySearchAuthError(
        "refresh_failed",
        `Falha ao renovar token: ${(err as Error).message}`
      );
    }
  }

  return {
    session,
    auth,
    client: new FamilySearchClient(auth.accessToken),
  };
}

export async function ensureFreshAuth(
  auth: FamilySearchAuthState
): Promise<FamilySearchAuthState> {
  if (!isTokenExpired(auth)) return auth;
  if (!auth.refreshToken) {
    throw new FamilySearchAuthError(
      "expired",
      "Sessão expirada. Faça login novamente."
    );
  }
  try {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    const now = Date.now();
    return {
      ...auth,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? auth.refreshToken,
      scope: refreshed.scope ?? auth.scope,
      tokenType: refreshed.token_type ?? auth.tokenType,
      expiresAt: now + (refreshed.expires_in ?? 0) * 1000,
    };
  } catch (err) {
    throw new FamilySearchAuthError(
      "refresh_failed",
      `Falha ao renovar token: ${(err as Error).message}`
    );
  }
}
