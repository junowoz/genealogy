import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "./env";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function getKey() {
  const material = env.TOKEN_ENCRYPTION_KEY ?? env.SESSION_SECRET;
  return createHash("sha256").update(material).digest();
}

export function encryptSecret(value: string) {
  if (!value.startsWith(PREFIX)) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
  }

  return value;
}

export function decryptSecret(value: string) {
  if (!value.startsWith(PREFIX)) return value;

  const payload = Buffer.from(value.slice(PREFIX.length), "base64url");
  if (payload.length < 29) {
    throw new Error("Encrypted secret payload is malformed");
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
