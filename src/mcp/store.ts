import type { FamilySearchAuthState } from '../lib/session';
import { prisma } from '../lib/prisma';

const mem = new Map<string, FamilySearchAuthState>();

function hasDb() {
  return !!process.env.DATABASE_URL;
}

export async function saveMcpAuth(sessionId: string, auth: FamilySearchAuthState) {
  mem.set(sessionId, { ...auth });
  if (!hasDb()) return;
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
}

export async function getMcpAuth(sessionId: string): Promise<FamilySearchAuthState | undefined> {
  const inMem = mem.get(sessionId);
  if (inMem) return inMem;
  if (!hasDb()) return undefined;
  const row = await prisma.mcpAuthSession.findUnique({ where: { sessionId } });
  if (!row) return undefined;
  const auth: FamilySearchAuthState = {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    scope: row.scope ?? undefined,
    tokenType: row.tokenType,
    expiresAt: row.expiresAt.getTime(),
    personId: row.personId ?? undefined,
    displayName: row.displayName ?? undefined,
    lastLinkedAt: row.updatedAt.getTime(),
  };
  mem.set(sessionId, auth);
  return auth;
}

export async function clearMcpAuth(sessionId: string) {
  mem.delete(sessionId);
  if (!hasDb()) return;
  await prisma.mcpAuthSession.delete({ where: { sessionId } }).catch(() => {});
}
