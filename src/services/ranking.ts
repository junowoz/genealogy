import type { MatchCandidate, Person, Place, SearchParams } from '../domain/types';
import { nameVariantMatch, placeMatchScore } from './normalization';

type Weights = {
  place: number;
  date: number;
  relatives: number;
  nameVariant: number;
};

const DEFAULT_WEIGHTS: Weights = { place: 0.45, date: 0.25, relatives: 0.2, nameVariant: 0.1 };

function dateOverlapScore(p: Person, from?: number, to?: number): { score: number; reason?: string } {
  if (!from && !to) return { score: 0, reason: undefined };
  const by = p.birthYear;
  if (!by) return { score: 0, reason: 'Data ? (sem ano de nascimento)' };
  if (from && to && by >= from - 2 && by <= to + 2) return { score: 1, reason: 'Data ✓ (janela ±2)' };
  if (from && by >= from - 2) return { score: 0.6, reason: 'Data ~ (>= de-2)' };
  if (to && by <= to + 2) return { score: 0.6, reason: 'Data ~ (<= até+2)' };
  return { score: 0.2, reason: 'Data ~ (fora mas próximo)' };
}

function relativesOverlapScore(query: Partial<Person>, candidate: Person): { score: number; reason?: string } {
  let s = 0;
  const reasons: string[] = [];
  const overlaps = (
    label: string,
    qa?: { id?: string; name?: string },
    ca?: { id?: string; name?: string }
  ) => {
    if (!qa || !ca) return;
    if (qa.id && ca.id && qa.id === ca.id) {
      s += 0.4;
      reasons.push(`${label} ✓`);
    } else if (qa.name && ca.name && nameVariantMatch(qa.name, ca.name) >= 0.7) {
      s += 0.25;
      reasons.push(`${label} ~`);
    }
  };
  overlaps('Pais', query.father, candidate.father);
  overlaps('Pais', query.mother, candidate.mother);
  overlaps('Cônjuge', query.spouse, candidate.spouse);
  return { score: Math.min(1, s), reason: reasons.join(', ') || undefined };
}

export function rankCandidates(
  params: SearchParams,
  candidates: Person[],
  resolver?: (id: string) => Place | undefined
): MatchCandidate[] {
  const w = DEFAULT_WEIGHTS;
  const qp = params.placeId ? resolver?.(params.placeId) : undefined;
  const qperson: Partial<Person> = {};
  const list = candidates.map((p) => {
    const explanations: string[] = [];
    const nm = nameVariantMatch(params.name, p.name);
    if (nm >= 0.99) explanations.push('Nome ✓');
    else if (nm >= 0.6) explanations.push('Variantes ✓');
    const { score: pm, reason: pr } = placeMatchScore({
      queryPlace: qp,
      queryText: params.placeText,
      candidatePlace: p.primaryPlace,
      candidateText: p.primaryPlace?.displayName ?? p.primaryPlaceText,
    });
    if (pr) explanations.push(pr);
    const { score: dm, reason: dr } = dateOverlapScore(p, params.birthYearFrom, params.birthYearTo);
    if (dr) explanations.push(dr);
    const { score: rm, reason: rr } = relativesOverlapScore(qperson, p);
    if (rr) explanations.push(rr);

    const score = w.place * pm + w.date * dm + w.relatives * rm + w.nameVariant * nm;
    return { person: p, score, explanations } satisfies MatchCandidate;
  });

  // Sort descending by score
  list.sort((a, b) => b.score - a.score);

  return list;
}
