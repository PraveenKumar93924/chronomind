import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, ExternalLink, FileText, Loader2, Search, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { UploadDialog } from "@/components/UploadDialog";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/chronomind.functions";
import {
  documentSignedUrl,
  documentsQuery,
  memoriesQuery,
  type DocumentRow,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — ChronoMind" },
      { name: "description", content: "Every file you uploaded, with what the AI understood from it." },
      { property: "og:title", content: "Documents — ChronoMind" },
      { property: "og:description", content: "Extracted text, summaries and detected details per file." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Documents,
});

function statusBadge(status: string) {
  if (status === "processed")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="size-3 text-success" /> Processed
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <TriangleAlert className="size-3" /> Failed
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="size-3 animate-spin" /> Processing
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="size-3" /> Pending
    </Badge>
  );
}

function Documents() {
  const queryClient = useQueryClient();
  const { data: documents = [] } = useQuery(documentsQuery);
  const { data: memories = [] } = useQuery(memoriesQuery);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      [doc.file_name, doc.summary, doc.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [documents, search]);

  const relatedMemories = selected
    ? memories.filter((memory) => memory.document_id === selected.id)
    : [];
  const entities = (selected?.entities ?? {}) as {
    organization?: string | null;
    location?: string | null;
    topics?: string[];
  };

  async function openOriginal(doc: DocumentRow) {
    try {
      window.open(await documentSignedUrl(doc.storage_path), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the file.");
    }
  }

  async function retry(doc: DocumentRow) {
    setBusy(true);
    try {
      await processDocument({ data: { documentId: doc.id } });
      toast.success("Document processed");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Processing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: DocumentRow) {
    setBusy(true);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    await supabase.storage.from("documents").remove([doc.storage_path]);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Document deleted");
    setSelected(null);
    await queryClient.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} files uploaded`}
        action={<UploadDialog />}
      />

      <div className="relative mb-6">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search documents..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          No documents yet. Upload your first record.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelected(doc)}
              className="surface-card flex w-full items-center gap-4 p-4 text-left transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <FileText className="size-4 text-accent-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{doc.file_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[doc.category, doc.detected_date ? new Date(doc.detected_date).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null]
                    .filter(Boolean)
                    .join(" • ") || "Details pending"}
                </span>
              </span>
              {statusBadge(doc.status)}
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{selected.file_name}</DialogTitle>
                <DialogDescription>
                  {statusBadge(selected.status)}
                  {selected.confidence != null && (
                    <span className="ml-2 text-xs">
                      AI confidence: {Math.round(Number(selected.confidence) * 100)}%
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {selected.error_message && (
                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  {selected.error_message}
                </p>
              )}

              {selected.summary && (
                <section>
                  <h3 className="text-sm font-semibold">Summary</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.summary}</p>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold">Detected details</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.detected_date && (
                    <Badge variant="outline">
                      {new Date(selected.detected_date).toLocaleDateString()}
                    </Badge>
                  )}
                  {entities.organization && <Badge variant="outline">{entities.organization}</Badge>}
                  {entities.location && <Badge variant="outline">{entities.location}</Badge>}
                  {(entities.topics ?? []).map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                  {!selected.detected_date && !entities.organization && !(entities.topics ?? []).length && (
                    <span className="text-sm text-muted-foreground">Nothing detected yet.</span>
                  )}
                </div>
              </section>

              {relatedMemories.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold">Memories from this document</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {relatedMemories.map((memory) => (
                      <li key={memory.id}>• {memory.title}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selected.extracted_text && (
                <section>
                  <h3 className="text-sm font-semibold">Extracted text</h3>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                    {selected.extracted_text}
                  </pre>
                </section>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" className="gap-2" onClick={() => openOriginal(selected)}>
                  <ExternalLink className="size-4" />
                  Open original
                </Button>
                {selected.status !== "processed" && (
                  <Button variant="secondary" disabled={busy} onClick={() => retry(selected)}>
                    {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Read it again
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => remove(selected)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
