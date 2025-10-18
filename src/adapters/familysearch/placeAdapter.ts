import type { Place } from '../../domain/types';
import type { PlaceAdapter } from '../interfaces';
import { getFamilySearchContext, FamilySearchAuthError, FamilySearchClient } from '../../lib/familysearch/client';
import { collectPlacesFromGedcom, mapGedcomPlace, normalizeRef } from './utils';

export class FamilySearchPlaceAdapter implements PlaceAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async searchPlaces(q: string): Promise<Place[]> {
    if (!q.trim()) return [];
    try {
      const client = await this.resolveClient();
      const params = new URLSearchParams({ q: q.trim(), count: '10' });
      const data = await client.get<any>(`/platform/places/search?${params.toString()}`);
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      const result: Place[] = [];
      const seen = new Set<string>();

      for (const entry of entries) {
        const gedcom = entry?.content?.gedcomx ?? entry?.content?.gedcom ?? entry?.content;
        if (!gedcom) continue;
        const places = collectPlacesFromGedcom(gedcom);
        places.forEach((place, id) => {
          if (!seen.has(id)) {
            seen.add(id);
            result.push(place);
          }
        });
      }
      return result.slice(0, 25);
    } catch (err) {
      if (err instanceof FamilySearchAuthError) {
        throw err;
      }
      throw new Error(`Falha ao buscar lugares: ${(err as Error).message}`);
    }
  }

  async getPlaceById(id: string): Promise<Place | undefined> {
    if (!id) return undefined;
    try {
      const client = await this.resolveClient();
      const normalized = normalizeRef(id) ?? id;
      const data = await client.get<any>(`/platform/places/${encodeURIComponent(normalized)}`);
      const gedcom =
        data?.gedcomx ??
        data?.gedcom ??
        data?.content?.gedcomx ??
        data?.content?.gedcom ??
        undefined;

      if (gedcom) {
        const places = collectPlacesFromGedcom(gedcom);
        if (places.has(normalized)) return places.get(normalized);
        const first = Array.from(places.values())[0];
        if (first) return first;
      }

      if (Array.isArray(data?.places) && data.places.length) {
        const mapped = mapGedcomPlace({ ...data.places[0], id: normalizeRef(data.places[0]?.id) ?? normalized });
        if (mapped) return mapped;
      }

      return undefined;
    } catch (err) {
      if (err instanceof FamilySearchAuthError) {
        throw err;
      }
      return undefined;
    }
  }

  private async resolveClient() {
    if (this.options.client) return this.options.client;
    const { client } = await getFamilySearchContext();
    return client;
  }
}
