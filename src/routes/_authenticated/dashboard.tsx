import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Brain, FileText, Layers, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/components/MemoryCard";
import { PageHeader } from "@/components/PageHeader";
import { UploadDialog } from "@/components/UploadDialog";
import { documentsQuery, memoriesQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { monthlyActivity } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ChronoMind" },
      { name: "description", content: "Your digital memory at a glance: memories, documents and activity." },
      { property: "og:title", content: "Dashboard — ChronoMind" },
      { property: "og:description", content: "Your digital memory at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { data: memories = [] } = useQuery(memoriesQuery);
  const { data: documents = [] } = useQuery(documentsQuery);

  const docById = new Map(documents.map((doc) => [doc.id, doc]));
  const activities = memories.filter((memory) => !memory.date_unknown).length;
  const categories = new Set(memories.map((memory) => memory.category)).size;
  const chartData = monthlyActivity(memories);

  const stats = [
    { label: "Memories", value: memories.length, icon: Brain },
    { label: "Documents", value: documents.length, icon: FileText },
    { label: "Dated activities", value: activities, icon: Sparkles },
    { label: "Categories", value: categories, icon: Layers },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title={`${greeting()} 👋`}
        subtitle={user?.email ? `Your digital memory, ${user.email}` : "Your digital memory"}
        action={<UploadDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <stat.icon className="size-5 text-primary" />
            <p className="mt-4 font-display text-3xl font-semibold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Recent memories</h2>
          {memories.length === 0 ? (
            <div className="surface-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No memories yet. Upload a certificate, report or photo and ChronoMind will do the rest.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {memories.slice(0, 4).map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  document={memory.document_id ? docById.get(memory.document_id) : undefined}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-2">
          <div className="surface-card p-5">
            <h2 className="text-lg font-semibold">Activity overview</h2>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-card brand-gradient p-6">
            <h2 className="text-lg font-semibold text-primary-foreground">Ask My Memory</h2>
            <p className="mt-1 text-sm text-primary-foreground/80">
              "What did I work on in 2025?" — answered from your own records.
            </p>
            <Button asChild variant="secondary" className="mt-4 gap-2">
              <Link to="/ask">
                Open chat
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
