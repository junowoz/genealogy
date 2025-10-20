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
  console.log("[fetchCurrentUser] Starting fetch for current tree person");
  console.log("[fetchCurrentUser] API Base URL:", env.FS_API_BASE_URL);
  console.log(
    "[fetchCurrentUser] Token prefix:",
    accessToken.substring(0, 20) + "..."
  );

  // Use the correct endpoint to get current user's person ID
  const res = await fetch(
    `${env.FS_API_BASE_URL.replace(/\/+$/, "")}/platform/tree/current-person`,
    {
      headers: buildHeaders(accessToken),
      cache: "no-store",
      redirect: "manual", // Don't follow redirects automatically
    }
  );

  console.log("[fetchCurrentUser] Response status:", res.status);
  console.log(
    "[fetchCurrentUser] Response headers:",
    Object.fromEntries(res.headers.entries())
  );

  // The API returns 303 with Location header containing the person URL
  if (res.status === 303) {
    const location = res.headers.get("Location");
    console.log("[fetchCurrentUser] Redirect location:", location);

    if (location) {
      // Extract person ID from URL like: /platform/tree/persons/XXXX-XXX
      const personId = location.split("/").filter(Boolean).pop();
      console.log("[fetchCurrentUser] Extracted personId:", personId);

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

    console.warn("[fetchCurrentUser] No person ID found in Location header");
    return undefined;
  }

  if (res.status === 401) {
    // Log the error body for debugging
    try {
      const errorText = await res.text();
      console.error("[fetchCurrentUser] 401 Error body:", errorText);
    } catch (e) {
      console.error("[fetchCurrentUser] Could not read error body");
    }
    console.warn(
      "[fetchCurrentUser] Unauthorized (401) - Token may be invalid or missing permissions"
    );
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
      `Failed to load FamilySearch current person: ${res.status} ${res.statusText} — ${text}`
    );
  }

  // If we get here, try to parse as JSON (some responses might be 200 OK)
  try {
    const payload = await res.json();
    console.log("[fetchCurrentUser] Payload received:", payload);

    // Try to extract person ID from various possible structures
    const personId =
      payload?.persons?.[0]?.id ?? payload?.person?.id ?? payload?.id;

    if (personId) {
      console.log(
        "[fetchCurrentUser] Extracted personId from payload:",
        personId
      );
      return {
        personId,
        id: undefined,
        displayName: undefined,
        contactName: undefined,
        email: undefined,
      };
    }
  } catch (err) {
    console.error("[fetchCurrentUser] Failed to parse response as JSON:", err);
  }

  console.warn("[fetchCurrentUser] Could not extract person ID");
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
