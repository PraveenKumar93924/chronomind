import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, FileText, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { askMemory } from "@/lib/chronomind.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({
    meta: [
      { title: "Ask My Memory — ChronoMind" },
      { name: "description", content: "Ask questions about your own past, answered from your documents." },
      { property: "og:title", content: "Ask My Memory — ChronoMind" },
      { property: "og:description", content: "Grounded answers with the source documents attached." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ask,
});

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ id: string; file_name: string }>;
};

const SUGGESTIONS = [
  "What did I work on this year?",
  "What certifications have I completed?",
  "Which organisations have I worked with?",
  "Summarise my academic activities.",
];

function Ask() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setInput("");
    setMessages((previous) => [...previous, { role: "user", text: trimmed }]);
    setBusy(true);
    try {
      const result = await askMemory({ data: { question: trimmed } });
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: result.answer, sources: result.sources },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <PageHeader title="Ask My Memory" subtitle="Answers come only from your own records" />

      <div className="flex-1 space-y-5">
        {messages.length === 0 && (
          <div className="surface-card p-8 text-center">
            <span className="brand-gradient mx-auto flex size-11 items-center justify-center rounded-2xl">
              <Brain className="size-5 text-primary-foreground" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">
              Ask anything about your past. Try one of these:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] space-y-3",
                message.role === "user"
                  ? "rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                  : "text-foreground",
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Sources</p>
                  {message.sources.map((source) => (
                    <p key={source.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="size-3.5" />
                      {source.file_name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Searching your memories...
          </p>
        )}
      </div>

      <form
        className="sticky bottom-0 mt-6 flex items-end gap-2 bg-background pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder="What did I work on in 2025?"
          className="resize-none"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
