import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function friendlyAiError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("402")) {
    return new Error("AI credits are used up. Add credits to keep reading documents.");
  }
  if (raw.includes("429")) {
    return new Error("The AI is busy right now. Please try again in a moment.");
  }
  if (raw.includes("401") || raw.includes("403")) {
    return new Error("AI access is unavailable for this app right now.");
  }
  return new Error(`The AI could not finish this request: ${raw}`);
}

/**
 * Calls Lovable AI (Responses API) and returns the complete text.
 * The call is streamed and consumed server-side so long documents don't time out.
 */
export async function generateAiText(messages: ModelMessage[], instructions?: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("AI is not configured for this app yet.");
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      ...(instructions === undefined ? {} : { instructions }),
      messages,
      maxRetries: 1,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return await result.text;
  } catch (error) {
    console.error("[ai] gateway call failed", error);
    throw friendlyAiError(error);
  }
}

/** Extracts the first JSON object from a model reply, tolerating fences and prose. */
export function parseJsonReply<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/gim, "")
    .replace(/```$/gim, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("The AI reply could not be understood.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
