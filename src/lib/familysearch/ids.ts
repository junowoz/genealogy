export function normalizeFamilySearchId(value: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9-]{1,32}$/.test(normalized)) {
    throw new Error("invalid_familysearch_id");
  }
  return normalized;
}

export function encodeFamilySearchId(value: string) {
  return encodeURIComponent(normalizeFamilySearchId(value));
}
