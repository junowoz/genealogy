import { z } from "zod";

const envSchema = z.object({
  FS_APP_KEY: z.string().min(1, "FS_APP_KEY is required"),
  FS_REDIRECT_URI: z.string().url("FS_REDIRECT_URI must be a valid URL"),
  FS_AUTH_BASE_URL: z.string().url("FS_AUTH_BASE_URL is required"),
  FS_API_BASE_URL: z.string().url("FS_API_BASE_URL is required"),
  FS_OAUTH_SCOPE: z.string().min(1, "FS_OAUTH_SCOPE is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
  NEXT_PUBLIC_APP_ORIGIN: z
    .string()
    .url("NEXT_PUBLIC_APP_ORIGIN must be a valid URL"),
});

const parsed = envSchema.safeParse({
  FS_APP_KEY: process.env.FS_APP_KEY,
  FS_REDIRECT_URI: process.env.FS_REDIRECT_URI,
  FS_AUTH_BASE_URL: process.env.FS_AUTH_BASE_URL,
  FS_API_BASE_URL: process.env.FS_API_BASE_URL,
  FS_OAUTH_SCOPE: process.env.FS_OAUTH_SCOPE,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = {
  ...parsed.data,
  FS_AUTH_BASE_URL: parsed.data.FS_AUTH_BASE_URL,
  FS_API_BASE_URL: parsed.data.FS_API_BASE_URL,
  FS_OAUTH_SCOPE: parsed.data.FS_OAUTH_SCOPE,
};

export type AppEnv = typeof env;
