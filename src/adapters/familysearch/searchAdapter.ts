import type {
  MatchCandidate,
  Person,
  Place,
  SearchParams,
} from "../../domain/types";
import type { SearchAdapter } from "../interfaces";
import { rankCandidates } from "../../services/ranking";
import {
  getFamilySearchContext,
  FamilySearchAuthError,
  FamilySearchClient,
} from "../../lib/familysearch/client";
import {
  collectPlacesFromGedcom,
  mapGedcomPerson,
  normalizeRef,
} from "./utils";

export class FamilySearchSearchAdapter implements SearchAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async searchPersons(params: SearchParams): Promise<MatchCandidate[]> {
    try {
      const client = await this.resolveClient();
      const query = buildSearchQuery(params);
      const data = await client.get<any>(
        `/platform/tree/search?${query.toString()}`
      );
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      const persons: Person[] = [];
      const placeCache = new Map<string, Place>();

      for (const entry of entries) {
        const gedcom =
          entry?.content?.gedcomx ?? entry?.content?.gedcom ?? entry?.content;
        if (!gedcom) continue;
        const places = collectPlacesFromGedcom(gedcom);
        places.forEach((place, id) => {
          if (!placeCache.has(id)) placeCache.set(id, place);
        });
        const personsRaw = Array.isArray(gedcom?.persons) ? gedcom.persons : [];
        if (!personsRaw.length) continue;
        const primaryPerson =
          personsRaw.find((p: any) => p?.principal === true) ?? personsRaw[0];
        const person = mapGedcomPerson(primaryPerson, {
          placesById: placeCache,
        });
        if (!person) continue;
        if (!person.fsUrl) {
          person.fsUrl = buildPersonUrl(person.id);
        }
        persons.push(person);
      }

      return rankCandidates(params, persons);
    } catch (err) {
      if (err instanceof FamilySearchAuthError) {
        throw err;
      }
      throw new Error(
        `Falha ao buscar pessoas no FamilySearch: ${(err as Error).message}`
      );
    }
  }

  private async resolveClient() {
    if (this.options.client) return this.options.client;
    const { client } = await getFamilySearchContext();
    return client;
  }
}

function buildSearchQuery(params: SearchParams) {
  const search = new URLSearchParams();
  search.set("count", "20");
  const { givenName, surname } = splitName(params.name);
  if (givenName) search.set("givenName", givenName);
  if (surname) search.set("surname", surname);
  if (!givenName && !surname) {
    search.set("name", params.name);
  } else {
    search.set("name", params.name);
  }
  if (params.birthYearFrom && params.birthYearTo) {
    search.set("birthDate", `${params.birthYearFrom}-${params.birthYearTo}`);
  } else if (params.birthYearFrom) {
    search.set("birthDate", `${params.birthYearFrom}`);
  } else if (params.birthYearTo) {
    search.set("birthDate", `${params.birthYearTo}`);
  }
  if (params.placeId) {
    search.set("birthPlaceId", normalizeRef(params.placeId) ?? params.placeId);
  } else if (params.placeText) {
    search.set("birthPlace", params.placeText);
  }
  search.set("order", "lastModified");
  return search;
}

function splitName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { givenName: "", surname: "" };
  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { givenName: parts[0], surname: "" };
  }
  const surname = parts.pop() ?? "";
  const givenName = parts.join(" ");
  return { givenName, surname };
}

function buildPersonUrl(id: string) {
  return `https://www.familysearch.org/tree/person/details/${encodeURIComponent(
    id
  )}`;
}
