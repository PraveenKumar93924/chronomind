import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Brain, Clock, MessageSquareText, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChronoMind — Turn your documents into a personal timeline" },
      {
        name: "description",
        content:
          "Upload certificates, reports and notes. ChronoMind reads them, creates memories, builds your timeline and answers questions about your past.",
      },
      { property: "og:title", content: "ChronoMind — Turn your documents into a personal timeline" },
      {
        property: "og:description",
        content: "An AI personal memory: upload your records and ask questions about your own history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Upload, title: "Just upload", body: "Drop in a certificate, report or photo. No forms to fill." },
  { icon: Sparkles, title: "AI understands it", body: "Dates, places, organisations and topics are pulled out for you." },
  { icon: Clock, title: "Timeline builds itself", body: "Every memory lands on your timeline in the right month." },
  { icon: MessageSquareText, title: "Ask your memory", body: "\"What did I work on in 2025?\" — answered with sources." },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="flex items-center gap-3">
          <span className="brand-gradient flex size-10 items-center justify-center rounded-2xl">
            <Brain className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold">ChronoMind</span>
        </div>

        <h1 className="mt-16 max-w-3xl text-5xl leading-[1.05] font-semibold sm:text-6xl">
          Your documents become a{" "}
          <span className="brand-text-gradient">memory you can ask questions</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Upload your certificates, project reports, notes and photos. ChronoMind reads each one,
          creates a memory, places it on your timeline, and answers questions about your past.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="surface-card p-6">
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
