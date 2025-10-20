import type { FamilySearchAuthState } from "../lib/session";
import { prisma } from "../lib/prisma";

const mem = new Map<string, FamilySearchAuthState>();

function hasDb() {
  return !!process.env.DATABASE_URL;
}

export async function saveMcpAuth(
  sessionId: string,
  auth: FamilySearchAuthState
) {
  console.log("[MCP Store] Saving auth for session:", sessionId, {
    hasAccessToken: !!auth.accessToken,
    hasRefreshToken: !!auth.refreshToken,
    personId: auth.personId,
    expiresAt: new Date(auth.expiresAt).toISOString(),
  });
  mem.set(sessionId, { ...auth });
  if (!hasDb()) {
    console.log("[MCP Store] No database, saved to memory only");
    return;
  }
  await prisma.mcpAuthSession.upsert({
    where: { sessionId },
    create: {
      sessionId,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken ?? null,
      scope: auth.scope ?? null,
      tokenType: auth.tokenType,
      expiresAt: new Date(auth.expiresAt),
      personId: auth.personId ?? null,
      displayName: auth.displayName ?? null,
    },
    update: {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken ?? null,
      scope: auth.scope ?? null,
      tokenType: auth.tokenType,
      expiresAt: new Date(auth.expiresAt),
      personId: auth.personId ?? null,
      displayName: auth.displayName ?? null,
    },
  });
  console.log("[MCP Store] Saved to database successfully");
}

export async function getMcpAuth(
  sessionId: string
): Promise<FamilySearchAuthState | undefined> {
  console.log("[MCP Store] Getting auth for session:", sessionId);
  const inMem = mem.get(sessionId);
  if (inMem) {
    console.log("[MCP Store] Found in memory", {
      personId: inMem.personId,
      expiresAt: new Date(inMem.expiresAt).toISOString(),
    });
    return inMem;
  }
  if (!hasDb()) {
    console.log("[MCP Store] Not in memory, no database available");
    return undefined;
  }
  const row = await prisma.mcpAuthSession.findUnique({ where: { sessionId } });
  if (!row) {
    console.log("[MCP Store] Not found in database");
    return undefined;
  }
  const auth: FamilySearchAuthState = {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    scope: row.scope ?? "",
    tokenType: row.tokenType,
    expiresAt: row.expiresAt.getTime(),
    personId: row.personId ?? undefined,
    displayName: row.displayName ?? undefined,
    lastLinkedAt: row.updatedAt.getTime(),
  };
  mem.set(sessionId, auth);
  console.log("[MCP Store] Found in database and cached", {
    personId: auth.personId,
  });
  return auth;
}

export async function clearMcpAuth(sessionId: string) {
  mem.delete(sessionId);
  if (!hasDb()) return;
  await prisma.mcpAuthSession.delete({ where: { sessionId } }).catch(() => {});
}
