import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES, UPLOAD_STAGES, uploadAndProcess } from "@/lib/upload";
import { useAuth } from "@/hooks/useAuth";

export function UploadDialog({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !user) return;
    setBusy(true);
    setDone(false);
    try {
      for (const file of Array.from(files)) {
        setCurrentFile(file.name);
        setStage(0);
        try {
          const result = await uploadAndProcess(file, user.id, setStage);
          if (result.dateUnknown) {
            toast.warning(`Saved "${result.memoryTitle}" — no reliable date found. You can add one.`);
          } else {
            toast.success(`Memory created: ${result.memoryTitle}`);
          }
        } catch (error) {
          toast.error(
            `${file.name}: ${error instanceof Error ? error.message : "could not be processed."}`,
          );
        }
      }
      setDone(true);
      await queryClient.invalidateQueries();
    } finally {
      setBusy(false);
      setStage(-1);
      setCurrentFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) setDone(false);
      }}
    >
      <DialogTrigger asChild>
        {compact ? (
          <Button size="icon" aria-label="Upload documents">
            <Upload className="size-4" />
          </Button>
        ) : (
          <Button size="lg" className="gap-2">
            <Upload className="size-4" />
            Upload documents
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            PDFs, photos, scans, Word files or notes. ChronoMind reads them and creates your memories.
          </DialogDescription>
        </DialogHeader>

        {!busy && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "border-border",
            )}
          >
            <Upload className="mx-auto size-6 text-primary" />
            <p className="mt-3 text-sm font-medium">Drag files here</p>
            <p className="mt-1 text-xs text-muted-foreground">or</p>
            <Button className="mt-3" variant="outline" onClick={() => inputRef.current?.click()}>
              Choose files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            {done && (
              <p className="mt-4 text-sm font-medium text-success">
                Done — your timeline has been updated.
              </p>
            )}
          </div>
        )}

        {busy && (
          <div className="space-y-4">
            <p className="truncate text-sm font-medium">{currentFile}</p>
            <Progress value={((stage + 1) / UPLOAD_STAGES.length) * 100} />
            <ul className="space-y-2">
              {UPLOAD_STAGES.map((label, index) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    index < stage
                      ? "text-muted-foreground"
                      : index === stage
                        ? "font-medium text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {index < stage ? (
                    <Check className="size-4 text-success" />
                  ) : index === stage ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-4" />
                  )}
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
