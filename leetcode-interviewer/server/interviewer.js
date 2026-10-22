// Asks Claude whether the interviewer should speak, and what to say.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { SYSTEM_PROMPT, userContent } from './lib/prompt.js';

export const MODEL = 'claude-sonnet-5-5';
const KEY_FILE = join(homedir(), '.config/leetcode-interviewer/anthropic-key');

const STAGES = ['understand', 'design', 'explain', 'buy-in', 'code', 'verify', 'done'];

const Decision = z.object({
  speak: z.boolean(),
  message: z.string(),
  stage: z.enum(STAGES),
  hint_level: z.number().int(),
});

function readKey() {
  try {
    return readFileSync(KEY_FILE, 'utf8').trim();
  } catch {
    throw new Error(`No Claude API key at ${KEY_FILE}. See the README, "The API key".`);
  }
}

const client = new Anthropic({ apiKey: readKey() });

/** @returns {Promise<{speak: boolean, message: string, stage: string, hintLevel: number, usage: object, ms: number}>} */
export async function decide(session, event, elapsedMs) {
  const started = performance.now();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // On a safety decline, the API retries on another model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    // Low effort keeps replies fast; most turns only decide to stay quiet.
    output_config: { effort: 'low', format: betaZodOutputFormat(Decision) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent(session, event, elapsedMs) }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined (${response.stop_details?.category ?? 'no category'})`);
  }
  const decision = response.parsed_output;
  if (!decision) throw new Error(`Claude's reply did not match the schema (stop_reason ${response.stop_reason})`);
  return {
    speak: decision.speak && decision.message.trim() !== '',
    message: decision.message.trim(),
    stage: decision.stage,
    hintLevel: Math.min(Math.max(decision.hint_level, 0), 3),
    usage: response.usage,
    ms: Math.round(performance.now() - started),
  };
}
