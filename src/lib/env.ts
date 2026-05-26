import { z } from "zod";

const envSchema = {
  FS_APP_KEY: z.string().min(1, "FS_APP_KEY is required"),
  FS_REDIRECT_URI: z.string().url("FS_REDIRECT_URI must be a valid URL"),
  FS_AUTH_BASE_URL: z.string().url("FS_AUTH_BASE_URL must be a valid URL"),
  FS_API_BASE_URL: z.string().url("FS_API_BASE_URL must be a valid URL"),
  FS_OAUTH_SCOPE: z.string().min(1, "FS_OAUTH_SCOPE is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
  NEXT_PUBLIC_APP_ORIGIN: z
    .string()
    .url("NEXT_PUBLIC_APP_ORIGIN must be a valid URL"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL").optional(),
  APP_STORAGE_DIR: z.string().min(1).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  MCP_ALLOWED_ORIGINS: z.string().optional(),
};

type EnvKey = keyof typeof envSchema;

export type AppEnv = {
  readonly [K in EnvKey]: z.infer<(typeof envSchema)[K]>;
};

function readEnv<K extends EnvKey>(key: K): AppEnv[K] {
  const parsed = envSchema[key].safeParse(process.env[key]);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid environment configuration for ${key}: ${message}`);
  }
  return parsed.data as AppEnv[K];
}

export const env = Object.freeze(
  Object.defineProperties(
    {},
    Object.fromEntries(
      Object.keys(envSchema).map((key) => [
        key,
        {
          enumerable: true,
          get: () => readEnv(key as EnvKey),
        },
      ])
    )
  )
) as AppEnv;

export function getAppOrigin() {
  return env.NEXT_PUBLIC_APP_ORIGIN.replace(/\/+$/, "");
}

export function getStorageRoot() {
  return env.APP_STORAGE_DIR ?? process.cwd();
}

export function getAllowedMcpOrigins() {
  const configured = env.MCP_ALLOWED_ORIGINS;
  const origins = new Set<string>([getAppOrigin()]);

  if (configured) {
    for (const rawOrigin of configured.split(",")) {
      const origin = rawOrigin.trim();
      if (origin) origins.add(origin.replace(/\/+$/, ""));
    }
  }

  return origins;
}
