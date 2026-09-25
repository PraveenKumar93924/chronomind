import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/chronomind.functions";

export const UPLOAD_STAGES = [
  "Uploading...",
  "Reading document...",
  "Understanding content...",
  "Extracting events...",
  "Creating memory...",
  "Adding to timeline...",
] as const;

export const ACCEPTED_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.txt,.md,.csv,application/pdf,image/*";

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".rtf"];

async function extractClientText(file: File): Promise<string | undefined> {
  const name = file.name.toLowerCase();

  if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext)) || file.type.startsWith("text/")) {
    return (await file.text()).slice(0, 120000);
  }

  if (name.endsWith(".docx")) {
    // @ts-expect-error - browser build has no bundled types
    const mammoth = await import("mammoth/mammoth.browser.js");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return String(result.value ?? "").slice(0, 120000);
  }

  if (name.endsWith(".doc")) {
    throw new Error("Old .doc files can't be read. Please save it as .docx or PDF and try again.");
  }

  return undefined;
}

export type UploadResult = { documentId: string; dateUnknown: boolean; memoryTitle: string };

export async function uploadAndProcess(
  file: File,
  userId: string,
  onStage: (stageIndex: number) => void,
): Promise<UploadResult> {
  onStage(0);
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !doc) throw new Error(insertError?.message ?? "Upload failed.");

  onStage(1);
  const clientText = await extractClientText(file);

  onStage(2);
  const stageTimers = [
    window.setTimeout(() => onStage(3), 2500),
    window.setTimeout(() => onStage(4), 6000),
  ];

  try {
    const result = await processDocument({ data: { documentId: doc.id, clientText } });
    onStage(5);
    return {
      documentId: doc.id,
      dateUnknown: result.dateUnknown,
      memoryTitle: result.memory?.title ?? file.name,
    };
  } finally {
    stageTimers.forEach((timer) => window.clearTimeout(timer));
  }
}
