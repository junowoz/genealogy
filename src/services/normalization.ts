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

interface PlaceMatchInput {
  queryPlace?: Place;
  queryText?: string;
  candidatePlace?: Place;
  candidateText?: string;
}

export function placeMatchScore({ queryPlace, queryText, candidatePlace, candidateText }: PlaceMatchInput): {
  score: number;
  reason?: string;
} {
  if (queryPlace && candidatePlace) {
    if (queryPlace.id === candidatePlace.id) {
      return { score: 1, reason: 'Lugar ✓ (mesmo placeId)' };
    }
    const a = new Set(queryPlace.jurisdictionPath ?? []);
    const b = new Set(candidatePlace.jurisdictionPath ?? []);
    const inter = [...a].filter((id) => b.has(id));
    if (inter.length > 0) return { score: 0.6, reason: 'Lugar ~ (mesma jurisdição)' };
  }

  const q = (queryText ?? queryPlace?.displayName ?? '').toLowerCase();
  const c = (candidateText ?? candidatePlace?.displayName ?? '').toLowerCase();
  if (q && c) {
    if (c.includes(q) || q.includes(c)) {
      return { score: 0.8, reason: 'Lugar ✓ (texto compatível)' };
    }
    const nq = q.split(/[,\s]+/).filter(Boolean);
    const nc = c.split(/[,\s]+/).filter(Boolean);
    const inter = nq.filter((tok) => nc.includes(tok));
    if (inter.length) {
      return { score: 0.5, reason: 'Lugar ~ (palavras coincidem)' };
    }
  }

  return { score: 0, reason: undefined };
}
