import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./env";

export interface PendingAuthState {
  verifier: string;
  state: string;
  redirectTo?: string;
  createdAt: number;
}

export interface FamilySearchAuthState {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  tokenType: string;
  expiresAt: number;
  idToken?: string;
  personId?: string;
  displayName?: string;
  lastLinkedAt: number;
}

export interface AppSessionData {
  pendingAuth?: PendingAuthState;
  familySearch?: FamilySearchAuthState;
}

function getSessionOptions(): SessionOptions {
  const secureCookie = process.env.NODE_ENV !== "development";

  return {
    cookieName: "genealogy_session",
    password: env.SESSION_SECRET,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
    ttl: 60 * 60 * 24 * 7,
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<AppSessionData>(
    cookieStore,
    getSessionOptions()
  );
  return session;
}

export function isTokenExpired(auth?: FamilySearchAuthState) {
  if (!auth) return true;
  const now = Date.now();
  return auth.expiresAt - now < 60_000; // refresh 1 min early
}

export function clearAuth(session: AppSessionData) {
  session.familySearch = undefined;
}
