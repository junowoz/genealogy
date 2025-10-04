export type ID = string;

export interface Place {
  id: ID;
  displayName: string;
  type?: string; // e.g., City, Parish
  jurisdictionPath?: ID[]; // parent placeIds up the hierarchy
}

export interface PersonRef {
  id: ID;
  name?: string;
}

export interface Person {
  id: ID;
  name: string;
  gender?: 'Male' | 'Female' | 'Unknown';
  birthYear?: number;
  deathYear?: number;
  lifespan?: string; // "1840–1902"
  primaryPlace?: Place;
  primaryPlaceText?: string;
  father?: PersonRef;
  mother?: PersonRef;
  spouse?: PersonRef;
  fsUrl: string; // Deep-link to FamilySearch person page
}

export interface MatchCandidate {
  person: Person;
  score: number;
  explanations: string[]; // human-readable chips explaining the score
}

export interface HintSummary {
  personId: ID;
  total: number;
  recordHints: number;
  treeHints: number;
  fsHintsUrl: string; // redirect to official analysis page
}

export interface ChangeItem {
  id: ID;
  type: string;
  at: string; // ISO date
  by: string; // contributor
  field?: string;
  oldValue?: string;
  newValue?: string;
  fsChangeUrl: string;
}

export interface PedigreeNode {
  person: Person;
  parents?: ID[];
  children?: ID[];
}

export interface AncestryResult {
  rootId: ID;
  generations: number;
  nodes: Record<ID, PedigreeNode>;
}

export interface DescendancyResult {
  rootId: ID;
  generations: number;
  nodes: Record<ID, PedigreeNode>;
}

export interface SearchParams {
  name: string;
  birthYearFrom?: number;
  birthYearTo?: number;
  placeId?: string;
  placeText?: string;
}

