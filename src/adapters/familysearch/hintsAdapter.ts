import type { HintSummary } from '../../domain/types';
import type { HintsAdapter } from '../interfaces';
import { getFamilySearchContext, FamilySearchAuthError, FamilySearchClient } from '../../lib/familysearch/client';
import { normalizeRef } from './utils';

export class FamilySearchHintsAdapter implements HintsAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async getHintSummary(personId: string): Promise<HintSummary> {
    try {
      const client = await this.resolveClient();
      const pid = normalizeRef(personId) ?? personId;
      const data = await client.get<any>(`/platform/tree/persons/${encodeURIComponent(pid)}/matches`);
      const entries = extractEntries(data);

      let recordHints = 0;
      let treeHints = 0;

      for (const entry of entries) {
        const category = extractCategory(entry);
        if (category === 'tree') treeHints += 1;
        else recordHints += 1;
      }

      const total = recordHints + treeHints;

      return {
        personId: pid,
        total,
        recordHints,
        treeHints,
        fsHintsUrl: buildHintsUrl(pid),
      };
    } catch (err) {
      if (err instanceof FamilySearchAuthError) throw err;
      throw new Error(`Falha ao carregar hints: ${(err as Error).message}`);
    }
  }

  private async resolveClient() {
    if (this.options.client) return this.options.client;
    const { client } = await getFamilySearchContext();
    return client;
  }
}

function extractEntries(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.matches)) return data.matches;
  if (Array.isArray(data?.content?.entries)) return data.content.entries;
  return [];
}

function extractCategory(entry: any): 'record' | 'tree' {
  const categories = Array.isArray(entry?.category) ? entry.category : Array.isArray(entry?.categories) ? entry.categories : [];
  const summary = String(entry?.summary ?? entry?.title ?? '').toLowerCase();
  const hints = Array.isArray(entry?.content?.matches) ? entry.content.matches : entry?.content?.gedcomx?.matches;

  const lookup = new Set<string>();
  for (const category of categories) {
    const term = typeof category === 'string' ? category : category?.term ?? category?.label;
    if (term) lookup.add(String(term).toLowerCase());
  }

  if (lookup.size) {
    if ([...lookup].some((c) => c.includes('tree'))) return 'tree';
    if ([...lookup].some((c) => c.includes('record'))) return 'record';
  }

  if (Array.isArray(hints) && hints.length) {
    const type = String(hints[0]?.type ?? hints[0]?.matchType ?? '').toLowerCase();
    if (type.includes('tree')) return 'tree';
    if (type.includes('record')) return 'record';
  }

  if (summary.includes('árvore') || summary.includes('tree')) return 'tree';
  return 'record';
}

function buildHintsUrl(pid: string) {
  return `https://www.familysearch.org/tree/person/sources/${encodeURIComponent(pid)}?active=hints`;
}
