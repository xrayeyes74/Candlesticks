/**
 * Generic OpenAI-compatible AI provider.
 *
 * Works with OpenAI, Anthropic (via an OpenAI-compatible proxy), OpenRouter, Groq,
 * or any other OpenAI-compatible endpoint — just change AI_BASE_URL / AI_API_KEY /
 * AI_MODEL in your .env, no code changes needed.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiProvider(
  apiKey: string,
  options?: { baseURL?: string; structuredOutputs?: boolean },
) {
  return createOpenAICompatible({
    name: "candlestick-ai",
    baseURL: options?.baseURL || "https://api.openai.com/v1",
    supportsStructuredOutputs: options?.structuredOutputs ?? false,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
