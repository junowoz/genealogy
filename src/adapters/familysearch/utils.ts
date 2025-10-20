import type { Person, PersonRef, Place } from "../../domain/types";

const GENDER_MAP: Record<string, Person["gender"]> = {
  male: "Male",
  female: "Female",
  unknown: "Unknown",
};

export function mapGedcomPerson(
  raw: any,
  options: { placesById?: Map<string, Place> } = {}
): Person | undefined {
  if (!raw) return undefined;
  const id = raw.id ?? raw.identifier ?? extractIdentifier(raw.identifiers);
  if (!id) return undefined;

  const display = raw.display ?? {};
  const names = Array.isArray(raw.names) ? raw.names : [];
  const primaryName = display.name ?? getNameFromNames(names) ?? id;
  const gender = mapGender(display.gender ?? raw.gender?.type);

  const birthFact = findFact(raw.facts, "Birth");
  const deathFact = findFact(raw.facts, "Death");

  const birthYear =
    extractYearFromFact(birthFact) ??
    extractYearFromString(display.birthDate) ??
    extractYearFromString(raw.birthDate);
  const deathYear =
    extractYearFromFact(deathFact) ??
    extractYearFromString(display.deathDate) ??
    extractYearFromString(raw.deathDate);

  const placeRef =
    birthFact?.place?.descriptionRef ?? birthFact?.place?.descriptionId;
  const placeId = placeRef ? normalizeRef(placeRef) : undefined;
  const place = placeId ? options.placesById?.get(placeId) : undefined;

  const birthPlaceText =
    place?.displayName ??
    display.birthPlace ??
    birthFact?.place?.original ??
    birthFact?.place?.normalized?.[0]?.value ??
    birthFact?.place?.normalizedDescription ??
    birthFact?.place?.description ??
    undefined;

  const fsUrl = `https://beta.familysearch.org/tree/person/details/${encodeURIComponent(
    id
  )}`;

  const person: Person = {
    id,
    name: primaryName,
    gender,
    birthYear,
    deathYear,
    lifespan: display.lifespan ?? buildLifespan(birthYear, deathYear),
    primaryPlace: place,
    primaryPlaceText: birthPlaceText,
    father:
      mapPersonRef(raw.display?.ancestorSummary?.father) ??
      mapPersonRef(raw.father),
    mother:
      mapPersonRef(raw.display?.ancestorSummary?.mother) ??
      mapPersonRef(raw.mother),
    spouse: mapPersonRef(raw.display?.spouse),
    fsUrl,
  };

  return person;
}

export function collectPlacesFromGedcom(gedcom: any): Map<string, Place> {
  const map = new Map<string, Place>();
  const places = Array.isArray(gedcom?.places)
    ? gedcom.places
    : Array.isArray(gedcom?.place)
    ? gedcom.place
    : [];
  for (const p of places) {
    const normalized = mapGedcomPlace(p);
    if (normalized) {
      map.set(normalized.id, normalized);
    }
  }
  return map;
}

export function mapGedcomPlace(raw: any): Place | undefined {
  if (!raw) return undefined;
  const id =
    normalizeRef(raw.id) ??
    extractIdentifier(raw.identifiers) ??
    (Array.isArray(raw.names) && raw.names[0]?.value
      ? slugify(raw.names[0].value)
      : undefined);
  const displayName =
    raw.display?.name ??
    raw.fullText ??
    (Array.isArray(raw.names)
      ? raw.names[0]?.value ?? getNameFromNames(raw.names)
      : undefined);
  if (!id && !displayName) return undefined;

  const jurisdictionPath = Array.isArray(raw.jurisdiction)
    ? raw.jurisdiction
        .map((j: any) => normalizeRef(j?.resourceId ?? j?.resource))
        .filter((v: string | undefined): v is string => Boolean(v))
    : undefined;

  return {
    id: id ?? displayName ?? "",
    displayName: displayName ?? id ?? "Localidade",
    type: raw.type ? raw.type.split("/").pop() : undefined,
    jurisdictionPath,
  };
}

export function extractIdentifier(identifiers: any): string | undefined {
  if (!Array.isArray(identifiers)) return undefined;
  for (const item of identifiers) {
    const value = item?.value ?? item?.identifier ?? item;
    if (typeof value === "string") {
      const normalized = normalizeRef(value);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

export function mapGender(input: any): Person["gender"] | undefined {
  if (!input) return undefined;
  const str = String(input).toLowerCase();
  if (str.includes("male")) return "Male";
  if (str.includes("female")) return "Female";
  if (str.includes("unknown")) return "Unknown";
  return GENDER_MAP[str] ?? undefined;
}

export function buildLifespan(birth?: number, death?: number) {
  if (!birth && !death) return undefined;
  const from = birth ? String(birth) : "…";
  const to = death ? String(death) : "…";
  return `${from}–${to}`;
}

export function findFact(facts: any, typeSuffix: string) {
  if (!Array.isArray(facts)) return undefined;
  return facts.find((f) => {
    const t = String(f?.type ?? "").toLowerCase();
    return t.endsWith(typeSuffix.toLowerCase());
  });
}

export function extractYearFromFact(fact: any): number | undefined {
  if (!fact) return undefined;
  const formal = fact?.date?.formal ?? fact?.date?.normalized?.[0]?.value;
  const original = fact?.date?.original ?? fact?.date?.normalized?.[0]?.value;
  return extractYearFromString(formal ?? original);
}

export function extractYearFromString(
  input?: string | null
): number | undefined {
  if (!input) return undefined;
  const match = String(input).match(/(-?\d{4})/);
  if (!match) return undefined;
  const year = Number.parseInt(match[1], 10);
  if (Number.isNaN(year)) return undefined;
  return year;
}

export function normalizeRef(input?: string): string | undefined {
  if (!input) return undefined;
  let value = input.trim();
  if (value.startsWith("#")) value = value.slice(1);
  const slash = value.lastIndexOf("/");
  if (slash >= 0) value = value.slice(slash + 1);
  const colon = value.lastIndexOf(":");
  if (colon >= 0 && colon < value.length - 1) {
    value = value.slice(colon + 1);
  }
  return value || undefined;
}

export function extractResourceId(entry: any): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === "string") return normalizeRef(entry);
  return normalizeRef(
    entry.resourceId ??
      entry.resource ??
      entry.personId ??
      entry.id ??
      entry.href ??
      entry["@href"] ??
      entry.identifier
  );
}

function getNameFromNames(names: any[]): string | undefined {
  for (const name of names) {
    const value = name?.value ?? name?.fullText;
    if (value) return value;
    const forms = Array.isArray(name?.forms) ? name.forms : name?.nameForms;
    if (Array.isArray(forms)) {
      for (const form of forms) {
        if (form?.fullText) return form.fullText;
        if (form?.value) return form.value;
      }
    }
  }
  return undefined;
}

function mapPersonRef(raw: any): PersonRef | undefined {
  if (!raw) return undefined;
  const id =
    raw.id ??
    raw.personId ??
    normalizeRef(
      raw.resourceId ??
        raw.resource ??
        raw.href ??
        raw.identifier ??
        raw.summaryId
    );
  const name = raw.name ?? raw.displayName ?? raw.fullName ?? raw.text;
  if (!id && !name) return undefined;
  return {
    id: id ?? name ?? "",
    name: name ?? id ?? undefined,
  };
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
