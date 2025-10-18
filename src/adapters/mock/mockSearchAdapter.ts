import { readFileSync } from 'fs';
import path from 'path';
import type { MatchCandidate, Person, SearchParams } from '../../domain/types';
import type { SearchAdapter } from '../interfaces';
import { rankCandidates } from '../../services/ranking';
import { resolvePlaceSync } from './mockPlaceAdapter';

function loadPersons(): Person[] {
  const p = path.join(process.cwd(), 'mocks', 'persons.json');
  const raw = JSON.parse(readFileSync(p, 'utf-8')) as { persons: Person[] };
  return raw.persons;
}

export class MockSearchAdapter implements SearchAdapter {
  async searchPersons(params: SearchParams): Promise<MatchCandidate[]> {
    const persons = loadPersons();
    // Very naive filter to cut candidate set size
    const nameLower = params.name.toLowerCase();
    const prelim = persons.filter((p) => p.name.toLowerCase().includes(nameLower));
    const candidates = rankCandidates(params, prelim, (id) => resolvePlaceSync(id));
    return candidates;
  }
}

