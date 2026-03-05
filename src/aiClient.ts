import OpenAI from 'openai';
import { sleep, logger } from './utils';

export type AIProvider = 'groq' | 'gemini' | 'openai' | 'claude';

export interface AIFixResult {
  status: 'fixed' | 'unfixable';
  fileName?: string;
  code?: string;
  files?: Record<string, string>;
  explanation?: string;
  reason?: string;
}

interface AIClientOptions {
  provider: AIProvider;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  groq:   'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-20250514',
};

const extractJSON = (raw: string): AIFixResult => {
  const attempts = [
    () => JSON.parse(raw),
    () => {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (!m) throw new Error();
      return JSON.parse(m[1].trim());
    },
    () => JSON.parse(raw.trim()),
    () => {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error();
      return JSON.parse(m[0]);
    },
    () => {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error();
      return JSON.parse(raw.slice(start, end + 1));
    },
  ];

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (result && typeof result === 'object') return result;
    } catch {}
  }

  return { status: 'unfixable', reason: 'AI returned malformed response — could not parse JSON' };
};

const callGroq = async (
  systemPrompt: string,
  userPrompt: string,
  model: string,
  timeoutMs: number
): Promise<string> => {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: timeoutMs,
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
  });

  return response.choices[0]?.message?.content ?? '';
};

const callGemini = async (
  systemPrompt: string,
  userPrompt: string,
  model: string,
  timeoutMs: number
): Promise<string> => {
  const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    timeout: timeoutMs,
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
  });

  return response.choices[0]?.message?.content ?? '';
};

const callProvider = async (
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  model: string,
  timeoutMs: number
): Promise<string> => {
  switch (provider) {
    case 'groq':   return callGroq(systemPrompt, userPrompt, model, timeoutMs);
    case 'gemini': return callGemini(systemPrompt, userPrompt, model, timeoutMs);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};

const isRetryable = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('timeout') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('network')
    );
  }
  return false;
};

export const callAI = async (
  systemPrompt: string,
  userPrompt: string,
  opts: AIClientOptions
): Promise<AIFixResult> => {
  const provider   = opts.provider ?? 'groq';
  const model      = opts.model ?? DEFAULT_MODELS[provider];
  const timeoutMs  = opts.timeoutMs  ?? parseInt(process.env.REQUEST_TIMEOUT_MS ?? '30000');
  const maxRetries = opts.maxRetries ?? parseInt(process.env.MAX_RETRIES ?? '3');

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxRetries} → ${provider} (${model})`);

      const raw = await callProvider(provider, systemPrompt, userPrompt, model, timeoutMs);

      if (!raw || raw.trim() === '') {
        return { status: 'unfixable', reason: 'AI returned empty response' };
      }

      return extractJSON(raw);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) {
        logger.error(`Non-retryable error: ${err instanceof Error ? err.message : err}`);
        break;
      }
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  const reason =
    lastError instanceof Error
      ? `AI call failed after ${maxRetries} retries: ${lastError.message}`
      : 'AI call failed — unknown error';

  return { status: 'unfixable', reason };
};