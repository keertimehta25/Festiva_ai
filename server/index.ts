import { createClient } from '@supabase/supabase-js';
import { createGeminiClient } from './ai/geminiClient';
import { createGeminiService } from './ai/geminiService';
import { createApp } from './app';
import { createSupabaseVerifier, withVerificationCache } from './auth/verifier';
import { loadConfig } from './config';
import { createSupabaseRepository } from './data/supabaseRepository';
import { consoleLogger } from './logger';

const config = loadConfig();

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = createApp({
  config,
  repo: createSupabaseRepository(supabase),
  auth: withVerificationCache(createSupabaseVerifier(supabase)),
  ai: createGeminiService(createGeminiClient(config.gemini, consoleLogger), config.gemini.apiKey !== undefined),
  logger: consoleLogger,
});

app.listen(config.port, () => {
  consoleLogger.info(`Festiva AI API listening on port ${config.port} (${config.env})`);
  if (!config.gemini.apiKey) consoleLogger.warn('GEMINI_API_KEY is not set: AI endpoints will answer 503 until it is configured.');
});
