import { randomUUID } from "node:crypto";
import type { ChangeItem } from "../../domain/types";
import type { ChangeAdapter } from "../interfaces";
import {
  getFamilySearchContext,
  FamilySearchAuthError,
  FamilySearchClient,
} from "../../lib/familysearch/client";
import { normalizeRef } from "./utils";

export class FamilySearchChangeAdapter implements ChangeAdapter {
  constructor(private readonly options: { client?: FamilySearchClient } = {}) {}

  async getPersonChanges(
    personId: string,
    cursor?: string
  ): Promise<{ changes: ChangeItem[]; nextCursor?: string }> {
    try {
      const client = await this.resolveClient();
      const params = new URLSearchParams();
      if (cursor) params.set("after", cursor);
      params.set("count", "50");
      const suffix = params.size ? `?${params.toString()}` : "";
      const data = await client.get<any>(
        `/platform/tree/persons/${encodeURIComponent(
          normalizeRef(personId) ?? personId
        )}/changes${suffix}`,
        { headers: { Accept: "application/x-gedcomx-atom+json" } }
      );
      const entries = extractEntries(data);
      const changes = entries
        .map((entry: any) => mapChangeEntry(entry, personId))
        .filter(Boolean) as ChangeItem[];
      const nextCursor = extractCursor(data?.links?.next?.href);
      return { changes, nextCursor };
    } catch (err) {
      if (err instanceof FamilySearchAuthError) throw err;
      throw new Error(
        `Falha ao carregar alterações: ${(err as Error).message}`
      );
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
  if (Array.isArray(data.changes)) return data.changes;
  if (Array.isArray(data?.content?.entries)) return data.content.entries;
  return [];
}

function mapChangeEntry(entry: any, personId: string): ChangeItem | undefined {
  if (!entry) return undefined;
  const id =
    normalizeRef(
      entry?.id ??
        entry?.identifier ??
        entry?.changeId ??
        entry?.links?.self?.href
    ) ??
    entry?.id ??
    entry?.identifier ??
    undefined;
  const summary = entry?.summary ?? entry?.title ?? entry?.category?.label;
  const updated =
    entry?.updated ??
    entry?.published ??
    entry?.timestamp ??
    entry?.changed ??
    new Date().toISOString();
  const contributor =
    entry?.author?.name ??
    entry?.agent?.name ??
    entry?.contributor?.name ??
    entry?.agentName ??
    entry?.attribution?.contributor ??
    "Desconhecido";

  const changeContent = extractChangeContent(entry);

  const fsChangeUrl =
    entry?.links?.alternate?.href ??
    entry?.links?.self?.href ??
    `https://beta.familysearch.org/tree/person/details/${encodeURIComponent(
      personId
    )}/changes`;

  return {
    id: id ?? randomUUID(),
    type: summary ?? changeContent?.type ?? "Alteração",
    at: new Date(updated).toISOString(),
    by: contributor,
    field: changeContent?.field,
    oldValue: stringifyValue(changeContent?.oldValue),
    newValue: stringifyValue(changeContent?.newValue),
    fsChangeUrl,
  };
}

function extractChangeContent(entry: any) {
  const changes =
    entry?.content?.gedcomx?.changes ??
    entry?.content?.changes ??
    entry?.changes ??
    entry?.content ??
    [];
  if (Array.isArray(changes) && changes.length) {
    const primary = changes[0];
    return {
      type: primary?.type ?? primary?.objectType ?? primary?.action,
      field:
        primary?.field ?? primary?.data?.field ?? primary?.changedAttribute,
      oldValue: primary?.oldValue ?? primary?.data?.old ?? primary?.old,
      newValue: primary?.newValue ?? primary?.data?.new ?? primary?.new,
    };
  }
  return undefined;
}

function stringifyValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractCursor(href?: string) {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    const value =
      url.searchParams.get("after") ??
      url.searchParams.get("cursor") ??
      url.searchParams.get("next");
    return value ?? undefined;
  } catch {
    return undefined;
  }
}
