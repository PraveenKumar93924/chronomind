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
import { MemoryCard } from "@/components/MemoryCard";
import { PageHeader } from "@/components/PageHeader";
import { UploadDialog } from "@/components/UploadDialog";
import { CATEGORIES } from "@/lib/categories";
import { documentsQuery, memoriesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({
    meta: [
      { title: "My Memories — ChronoMind" },
      { name: "description", content: "Every memory ChronoMind created from your documents." },
      { property: "og:title", content: "My Memories — ChronoMind" },
      { property: "og:description", content: "Browse, search and correct your memories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Memories,
});

function Memories() {
  const { data: memories = [] } = useQuery(memoriesQuery);
  const { data: documents = [] } = useQuery(documentsQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const docById = useMemo(() => new Map(documents.map((doc) => [doc.id, doc])), [documents]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return memories.filter((memory) => {
      if (category !== "all" && memory.category !== category) return false;
      if (!needle) return true;
      return [memory.title, memory.description, memory.organization, ...(memory.topics ?? [])]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [memories, search, category]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="My Memories"
        subtitle={`${memories.length} memories created from your documents`}
        action={<UploadDialog />}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search memories..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
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

      {filtered.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          No memories match this view yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              document={memory.document_id ? docById.get(memory.document_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
