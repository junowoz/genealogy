import path from "path";
import { getStorageRoot } from "./env";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/tiff", ".tiff"],
  ["application/pdf", ".pdf"],
]);

export function getAppDataPath(...segments: string[]) {
  return path.join(getStorageRoot(), ...segments);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function extensionForUpload(contentType: string, filename: string) {
  const byType = ALLOWED_UPLOAD_TYPES.get(contentType);
  if (byType) return byType;

  const ext = path.extname(filename).toLowerCase();
  for (const allowedExt of ALLOWED_UPLOAD_TYPES.values()) {
    if (ext === allowedExt) return allowedExt;
  }

  return undefined;
}
