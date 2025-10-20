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
import { collectPlacesFromGedcom, mapGedcomPerson } from "./utils";

export class FamilySearchSearchAdapter implements SearchAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async searchPersons(params: SearchParams): Promise<MatchCandidate[]> {
    try {
      const client = await this.resolveClient();
      const query = buildTreeSearchQuery(params);
      const path = `/platform/tree/search?${query.toString()}`;
      // For search endpoints, prefer GEDCOM X Atom feed
      try {
        // Lightweight debug for visibility in server logs
        console.log("[FamilySearchSearchAdapter] GET", path);
      } catch {}
      const data = await client.get<any>(path, {
        headers: { Accept: "application/x-gedcomx-atom+json" },
      });
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

  const qParts: string[] = [];
  const { givenName, surname } = splitName(params.name);

  // Prefer granular name tokens; fallback to name
  if (givenName) qParts.push(`givenName:"${escapeQuotes(givenName)}"`);
  if (surname) qParts.push(`surname:"${escapeQuotes(surname)}"`);
  if (!givenName && !surname && params.name?.trim()) {
    qParts.push(`name:"${escapeQuotes(params.name.trim())}"`);
  }

  // birthDate: YYYY or YYYY-YYYY
  if (params.birthYearFrom && params.birthYearTo) {
    qParts.push(`birthDate:${params.birthYearFrom}-${params.birthYearTo}`);
  } else if (params.birthYearFrom) {
    qParts.push(`birthDate:${params.birthYearFrom}`);
  } else if (params.birthYearTo) {
    qParts.push(`birthDate:${params.birthYearTo}`);
  }

  // birthPlace: prefer text; avoid id to reduce 400 risk
  if (params.placeText?.trim()) {
    qParts.push(`birthPlace:"${escapeQuotes(params.placeText.trim())}"`);
  }

  // Only include q if has content
  const q = qParts.join(" ").trim();
  if (q) search.set("q", q);

  return search;
}

// Build FamilySearch Tree Person Search parameters using q.* category
function buildTreeSearchQuery(params: SearchParams) {
  const search = new URLSearchParams();
  search.set("count", "20");

  const { givenName, surname } = splitName(params.name);
  if (surname) search.set("q.surname", surname);
  if (givenName) search.set("q.givenName", givenName);

  const from = params.birthYearFrom;
  const to = params.birthYearTo;
  if (from && to) {
    search.set("q.birthLikeDate.from", formatSimpleYear(from));
    search.set("q.birthLikeDate.to", formatSimpleYear(to));
  } else if (from) {
    search.set("q.birthLikeDate", formatSimpleYear(from));
  } else if (to) {
    search.set("q.birthLikeDate", formatSimpleYear(to));
  }

  if (params.placeText?.trim()) {
    search.set("q.birthLikePlace", params.placeText.trim());
  }

  return search;
}

function formatSimpleYear(year: number) {
  return (year >= 0 ? "+" : "") + String(year);
}

function splitName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { givenName: "", surname: "" };
  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { givenName: "", surname: parts[0] };
  }
  const surname = parts.pop() ?? "";
  const givenName = parts.join(" ");
  return { givenName, surname };
}

function buildPersonUrl(id: string) {
  return `https://beta.familysearch.org/tree/person/details/${encodeURIComponent(
    id
  )}`;
}

function escapeQuotes(input: string) {
  return input.replace(/"/g, '\\"');
}
