import { useState } from "react";
import { AlertTriangle, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditMemoryDialog } from "@/components/EditMemoryDialog";
import { categoryEmoji } from "@/lib/categories";
import { documentSignedUrl, formatMemoryDate, type DocumentRow, type MemoryRow } from "@/lib/queries";

export function MemoryCard({
  memory,
  document,
}: {
  memory: MemoryRow;
  document?: DocumentRow | undefined;
}) {
  const [editing, setEditing] = useState(false);

  async function openSource() {
    if (!document) return;
    try {
      const url = await documentSignedUrl(document.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the file.");
    }
  }

  return (
    <div className="surface-card p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg">
              {categoryEmoji(memory.category)}
            </span>
            <h3 className="truncate text-base font-semibold">{memory.title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatMemoryDate(memory)}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Edit memory" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>

      {memory.description && <p className="mt-3 text-sm text-foreground/80">{memory.description}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{memory.category}</Badge>
        {memory.organization && <Badge variant="outline">{memory.organization}</Badge>}
        {(memory.topics ?? []).slice(0, 4).map((topic) => (
          <Badge key={topic} variant="outline">
            {topic}
          </Badge>
        ))}
      </div>

      {memory.date_unknown && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-accent px-3 py-2">
          <p className="flex items-center gap-2 text-xs text-accent-foreground">
            <AlertTriangle className="size-3.5" />
            Date could not be confidently detected.
          </p>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Add date
          </Button>
        </div>
      )}

      {document && (
        <button
          type="button"
          onClick={openSource}
          className="mt-4 flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <FileText className="size-3.5" />
          {document.file_name}
        </button>
      )}

      {editing && <EditMemoryDialog memory={memory} open={editing} onOpenChange={setEditing} />}
    </div>
  );
}
