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

const FAMILYSEARCH_TIMEOUT_MS = 20_000;

export function getFamilySearchAuthorizationUrl() {
  return `${env.FS_AUTH_BASE_URL.replace(/\/+$/, "")}/authorization`;
}

function getFamilySearchTokenUrl() {
  return `${env.FS_AUTH_BASE_URL.replace(/\/+$/, "")}/token`;
}

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

  const res = await fetchWithTimeout(getFamilySearchTokenUrl(), {
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

  const res = await fetchWithTimeout(getFamilySearchTokenUrl(), {
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
  const res = await fetchWithTimeout(
    `${env.FS_API_BASE_URL.replace(/\/+$/, "")}/platform/tree/current-person`,
    {
      headers: buildHeaders(accessToken),
      cache: "no-store",
      redirect: "manual", // Don't follow redirects automatically
    }
  );

  if (res.status === 303) {
    const location = res.headers.get("Location");

    if (location) {
      const personId = location.split("/").filter(Boolean).pop();

      if (personId) {
        return {
          personId,
          id: undefined,
          displayName: undefined,
          contactName: undefined,
          email: undefined,
        };
      }
    }

    return undefined;
  }

  if (res.status === 401) {
    return undefined;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to load FamilySearch current person: ${res.status} ${res.statusText} — ${text}`
    );
  }

  try {
    const payload = await res.json();
    const personId =
      payload?.persons?.[0]?.id ?? payload?.person?.id ?? payload?.id;

    if (personId) {
      return {
        personId,
        id: undefined,
        displayName: undefined,
        contactName: undefined,
        email: undefined,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
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
    const res = await fetchWithTimeout(`${this.baseUrl}${path}`, {
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

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FAMILYSEARCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
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
