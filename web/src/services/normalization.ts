import type { Place } from '../domain/types';

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameVariantMatch(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  // soft variant match: token overlap/Jaccard
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union > 0 ? inter / union : 0;
}

export function placeMatchScore(queryPlace?: Place, candidatePlace?: Place): { score: number; reason?: string } {
  if (!queryPlace || !candidatePlace) return { score: 0, reason: undefined };
  if (queryPlace.id === candidatePlace.id) return { score: 1, reason: 'Lugar ✓ (mesmo placeId)' };
  const a = new Set(queryPlace.jurisdictionPath ?? []);
  const b = new Set(candidatePlace.jurisdictionPath ?? []);
  const inter = [...a].filter((id) => b.has(id));
  if (inter.length > 0) return { score: 0.6, reason: 'Lugar ~ (mesma jurisdição)' };
  return { score: 0.3, reason: 'Lugar ~ (fuzzy próximo)' };
}

