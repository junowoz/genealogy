import type { AncestryResult, DescendancyResult, PedigreeNode, Person, Place } from '../../domain/types';
import type { PedigreeAdapter } from '../interfaces';
import { getFamilySearchContext, FamilySearchAuthError, FamilySearchClient } from '../../lib/familysearch/client';
import { collectPlacesFromGedcom, extractResourceId, mapGedcomPerson, normalizeRef } from './utils';

export class FamilySearchPedigreeAdapter implements PedigreeAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async getAncestry(personId: string, generations: number): Promise<AncestryResult> {
    try {
      const client = await this.resolveClient();
      const params = new URLSearchParams({
        person: normalizeRef(personId) ?? personId,
        generations: String(Math.max(1, generations ?? 4)),
      });
      const data = await client.get<any>(`/platform/tree/ancestry?${params.toString()}`);
      return buildPedigreeResult(personId, generations, data);
    } catch (err) {
      if (err instanceof FamilySearchAuthError) throw err;
      throw new Error(`Falha ao carregar ancestry: ${(err as Error).message}`);
    }
  }

  async getDescendancy(personId: string, generations: number): Promise<DescendancyResult> {
    try {
      const client = await this.resolveClient();
      const params = new URLSearchParams({
        person: normalizeRef(personId) ?? personId,
        generations: String(Math.max(1, generations ?? 3)),
      });
      const data = await client.get<any>(`/platform/tree/descendancy?${params.toString()}`);
      return buildPedigreeResult(personId, generations, data);
    } catch (err) {
      if (err instanceof FamilySearchAuthError) throw err;
      throw new Error(`Falha ao carregar descendentes: ${(err as Error).message}`);
    }
  }

  private async resolveClient() {
    if (this.options.client) return this.options.client;
    const { client } = await getFamilySearchContext();
    return client;
  }
}

function buildPedigreeResult<T extends AncestryResult | DescendancyResult>(
  rootId: string,
  generations: number,
  data: any
): T {
  const { persons, nodes } = extractPersonsAndBuildNodes(data);
  const relationships = extractRelationships(data);

  for (const rel of relationships) {
    const type = String(rel?.type ?? '').toLowerCase();
    if (!type.includes('parentchild')) continue;

    const parentId = extractResourceId(rel.person1);
    const childId = extractResourceId(rel.person2);
    if (!parentId || !childId) continue;

    if (nodes[childId]) {
      const parents = new Set(nodes[childId].parents ?? []);
      parents.add(parentId);
      nodes[childId].parents = Array.from(parents);
    }
    if (nodes[parentId]) {
      const children = new Set(nodes[parentId].children ?? []);
      children.add(childId);
      nodes[parentId].children = Array.from(children);
    }
  }

  return {
    rootId,
    generations,
    nodes,
  } as T;
}

function extractPersonsAndBuildNodes(data: any): { persons: Map<string, Person>; nodes: Record<string, PedigreeNode> } {
  const gedcom = data?.gedcomx ?? data?.gedcom ?? data?.content?.gedcomx ?? data?.content?.gedcom ?? data;
  const places = collectPlacesFromGedcom(gedcom);
  const personsRaw = Array.isArray(gedcom?.persons) ? gedcom.persons : Array.isArray(data?.persons) ? data.persons : [];
  const persons = new Map<string, Person>();
  const nodes: Record<string, PedigreeNode> = {};

  for (const raw of personsRaw) {
    const person = mapGedcomPerson(raw, { placesById: places });
    if (!person) continue;
    persons.set(person.id, person);
    nodes[person.id] = { person, parents: [], children: [] };
  }

  return { persons, nodes };
}

function extractRelationships(data: any): any[] {
  const gedcom = data?.gedcomx ?? data?.gedcom ?? data?.content?.gedcomx ?? data?.content?.gedcom ?? data;
  const rels = Array.isArray(gedcom?.relationships) ? gedcom.relationships : [];
  if (Array.isArray(data?.relationships)) return rels.concat(data.relationships);
  return rels;
}
