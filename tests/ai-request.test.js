import { afterEach, expect, mock, test } from "bun:test";

const calls = [];
mock.module("ai", () => ({
  streamText: (options) => {
    calls.push(options);
    if (options.messages.some((message) => message.role === "system")) {
      throw new Error("System messages are not allowed");
    }
    return { text: Promise.resolve('{"answer":"Test Academy","source_document_ids":[]}') };
  },
}));
mock.module("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ responses: (model) => model }),
}));

const { generateAiText } = await import("../src/lib/ai.server.ts");
const originalKey = process.env.LOVABLE_API_KEY;
afterEach(() => {
  calls.length = 0;
  if (originalKey === undefined) delete process.env.LOVABLE_API_KEY;
  else process.env.LOVABLE_API_KEY = originalKey;
});

test("memory guidance goes through instructions without a rejected system message", async () => {
  process.env.LOVABLE_API_KEY = "test-only";
  const messages = [{ role: "user", content: "Which course did I complete?" }];
  const instructions = "Answer only from the supplied personal records.";
  const answer = await generateAiText(messages, instructions);
  expect(answer).toContain("Test Academy");
  expect(calls[0].instructions).toBe(instructions);
  expect(calls[0].messages).toEqual(messages);
  expect(calls[0].model).toBe("openai/gpt-6-astra");
  expect(calls[0].providerOptions.openai.store).toBe(false);
});

test("document extraction still accepts user media without instructions", async () => {
  process.env.LOVABLE_API_KEY = "test-only";
  const messages = [{ role: "user", content: [{ type: "text", text: "Read this document" }] }];
  await generateAiText(messages);
  expect(calls[0].messages).toEqual(messages);
  expect(calls[0].instructions).toBeUndefined();
});