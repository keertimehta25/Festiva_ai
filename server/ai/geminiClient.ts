import { z } from 'zod';
import type { AppConfig } from '../config';
import { AppError } from '../errors';
import type { Logger } from '../logger';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/** A malformed answer is retried once; failures from the provider itself are not retried. */
const MAX_ATTEMPTS = 2;

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  systemInstruction: string;
  /** User and event data, serialised by the caller. Always sent separately from the instructions. */
  userContent: string;
  maxOutputTokens: number;
  temperature?: number;
}

export interface GeminiClient {
  generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

const schemaCache = new WeakMap<z.ZodType, Record<string, unknown>>();

/** Converts a zod schema to the JSON Schema the provider uses to constrain its output. */
function providerSchema(schema: z.ZodType): Record<string, unknown> {
  const cached = schemaCache.get(schema);
  if (cached) return cached;
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  schemaCache.set(schema, json);
  return json;
}

function httpError(status: number): AppError {
  if (status === 429) return new AppError(429, 'AI_RATE_LIMITED', 'The AI service is busy right now. Please try again in a minute.');
  if (status === 401 || status === 403) return new AppError(502, 'AI_AUTH_FAILED', 'The AI service rejected the server’s credentials. The site owner needs to check the AI key.');
  if (status === 400 || status === 404) return new AppError(502, 'AI_BAD_REQUEST', 'The AI service could not process this request. The site owner may need to check the model setting.');
  return new AppError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable. Please try again shortly.');
}

function extractText(body: GeminiResponse): string {
  if (body.promptFeedback?.blockReason) {
    throw new AppError(422, 'AI_BLOCKED', 'The AI service declined to answer this request. Try rephrasing it.');
  }
  const candidate = body.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    // Thinking tokens share the output limit, so a long answer can be cut off. Retrying would cut off again.
    throw new AppError(502, 'AI_TRUNCATED', 'The AI ran out of space before finishing its answer. Please try again, or ask for something shorter.');
  }
  const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (text.trim().length === 0) {
    throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty answer. Please try again.');
  }
  return text;
}

function parseJson(text: string): unknown {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(unfenced) as unknown;
}

/** Thin client for the Gemini REST API. It never logs keys, prompts or model output. */
export function createGeminiClient(
  config: AppConfig['gemini'],
  logger: Logger,
  fetchFn: typeof fetch = fetch,
): GeminiClient {
  async function callProvider(apiKey: string, body: unknown): Promise<GeminiResponse> {
    let response: Response;
    try {
      response = await fetchFn(`${ENDPOINT}/${encodeURIComponent(config.model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'The AI service took too long to respond. Please try again.');
      }
      logger.error(`Gemini network error: ${name || 'unknown'}`);
      throw new AppError(502, 'AI_UNAVAILABLE', 'The AI service could not be reached. Please try again shortly.');
    }

    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as GeminiResponse;
      logger.error(`Gemini request failed: HTTP ${response.status} ${detail.error?.status ?? ''} ${(detail.error?.message ?? '').slice(0, 200)}`);
      throw httpError(response.status);
    }
    return (await response.json()) as GeminiResponse;
  }

  return {
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      if (!config.apiKey) {
        throw new AppError(503, 'AI_NOT_CONFIGURED', 'The AI assistant is not configured on this server yet.');
      }
      const body = {
        systemInstruction: { parts: [{ text: request.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: request.userContent }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: providerSchema(request.schema),
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature ?? 0.7,
          ...(config.thinkingLevel ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } } : {}),
        },
      };

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const text = extractText(await callProvider(config.apiKey, body));
        try {
          const parsed = request.schema.safeParse(parseJson(text));
          if (parsed.success) return parsed.data;
          logger.warn(`Gemini output failed schema validation (attempt ${attempt}): ${parsed.error.issues.length} issue(s)`);
        } catch {
          logger.warn(`Gemini output was not valid JSON (attempt ${attempt})`);
        }
      }
      throw new AppError(502, 'AI_INVALID_RESPONSE', 'The AI returned an answer in the wrong format. Please try again.');
    },
  };
}
