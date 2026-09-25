import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryCard } from "@/components/MemoryCard";
import { PageHeader } from "@/components/PageHeader";
import { UploadDialog } from "@/components/UploadDialog";
import { CATEGORIES } from "@/lib/categories";
import { documentsQuery, memoriesQuery, type MemoryRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — ChronoMind" },
      { name: "description", content: "Your automatic personal timeline, built from your documents." },
      { property: "og:title", content: "Timeline — ChronoMind" },
      { property: "og:description", content: "Every memory in order, by year, month and day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Timeline,
});

type View = "year" | "month" | "day";

function groupLabel(memory: MemoryRow, view: View) {
  if (!memory.start_date) return "Date unknown";
  const date = new Date(memory.start_date);
  if (view === "year") return String(date.getFullYear());
  if (view === "month")
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function Timeline() {
  const { data: memories = [] } = useQuery(memoriesQuery);
  const { data: documents = [] } = useQuery(documentsQuery);
  const [view, setView] = useState<View>("month");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const docById = useMemo(() => new Map(documents.map((doc) => [doc.id, doc])), [documents]);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = memories.filter((memory) => {
      if (category !== "all" && memory.category !== category) return false;
      if (!needle) return true;
      return [memory.title, memory.description, memory.organization, ...(memory.topics ?? [])]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });

    const map = new Map<string, MemoryRow[]>();
    for (const memory of filtered) {
      const key = memory.date_unknown || !memory.start_date ? "Date unknown" : groupLabel(memory, view);
      const list = map.get(key) ?? [];
      list.push(memory);
      map.set(key, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Date unknown") return 1;
      if (b === "Date unknown") return -1;
      return a < b ? 1 : -1;
    });
  }, [memories, search, category, view]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Timeline"
        subtitle="Built automatically from the dates found in your documents"
        action={<UploadDialog />}
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <TabsList>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your timeline..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          Your timeline is empty. Upload a document to start it.
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([label, items]) => (
            <section key={label}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-xl font-semibold">{label}</h2>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-4 border-l-2 border-border pl-6">
                {items.map((memory) => (
                  <div key={memory.id} className="relative">
                    <span className="brand-gradient absolute top-6 -left-[31px] size-3 rounded-full ring-4 ring-background" />
                    <MemoryCard
                      memory={memory}
                      document={memory.document_id ? docById.get(memory.document_id) : undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
