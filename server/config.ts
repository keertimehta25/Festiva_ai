import { z } from 'zod';

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  /** Number of reverse-proxy hops to trust for client IPs (needed for rate limiting behind Render). */
  trustProxy: number;
  timeZone: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  gemini: {
    /** Absent when the key is not configured; AI endpoints then answer 503 instead of faking output. */
    apiKey: string | undefined;
    model: string;
    timeoutMs: number;
    /** Optional thinking effort. Left unset, the provider's default applies. */
    thinkingLevel: 'minimal' | 'low' | 'medium' | 'high' | undefined;
  };
}

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    CORS_ORIGINS: z.string().default(''),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).optional(),
    APP_TIME_ZONE: z.string().default('Asia/Kolkata'),
    SUPABASE_URL: z.url('SUPABASE_URL must be a valid URL'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is missing or too short'),
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.string().min(3).default('gemini-3.6-flash'),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(90_000),
    GEMINI_THINKING_LEVEL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.enum(['minimal', 'low', 'medium', 'high']).optional(),
    ),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.CORS_ORIGINS.trim().length > 0, {
    path: ['CORS_ORIGINS'],
    message: 'CORS_ORIGINS must list the production web origin',
  });

/** Reads and validates environment variables once at startup; throws a readable error if any are invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid server configuration:\n${problems}`);
  }
  const values = result.data;
  return {
    env: values.NODE_ENV,
    port: values.PORT,
    corsOrigins: values.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: values.TRUST_PROXY ?? (values.NODE_ENV === 'production' ? 1 : 0),
    timeZone: values.APP_TIME_ZONE,
    supabaseUrl: values.SUPABASE_URL,
    supabaseServiceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
    gemini: {
      apiKey: values.GEMINI_API_KEY,
      model: values.GEMINI_MODEL,
      timeoutMs: values.AI_TIMEOUT_MS,
      thinkingLevel: values.GEMINI_THINKING_LEVEL,
    },
  };
}
