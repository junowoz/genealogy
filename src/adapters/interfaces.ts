import type {
  AncestryResult,
  ChangeItem,
  DescendancyResult,
  HintSummary,
  MatchCandidate,
  Place,
  SearchParams,
} from '../domain/types';

export interface SearchAdapter {
  searchPersons(params: SearchParams): Promise<MatchCandidate[]>;
}

export interface PlaceAdapter {
  searchPlaces(q: string): Promise<Place[]>;
  getPlaceById(id: string): Promise<Place | undefined>;
}

export interface PedigreeAdapter {
  getAncestry(personId: string, generations: number): Promise<AncestryResult>;
  getDescendancy(personId: string, generations: number): Promise<DescendancyResult>;
}

export interface ChangeAdapter {
  getPersonChanges(personId: string, cursor?: string): Promise<{ changes: ChangeItem[]; nextCursor?: string }>;
}

export interface HintsAdapter {
  getHintSummary(personId: string): Promise<HintSummary>;
}

