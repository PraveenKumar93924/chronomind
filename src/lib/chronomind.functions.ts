import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

type Extraction = {
  title?: string;
  description?: string;
  summary?: string;
  category?: string;
  organization?: string;
  location?: string;
  topics?: string[];
  start_date?: string | null;
  end_date?: string | null;
  date_unknown?: boolean;
  confidence?: number;
  extracted_text?: string;
};

function toDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

const EXTRACTION_PROMPT = `You are ChronoMind, an assistant that turns a person's personal document into one timeline memory.

Read the document and reply with ONLY a JSON object, no prose, using exactly these keys:
{
  "title": short event title (max 8 words),
  "description": 1-3 sentence description written in second person past tense,
  "summary": short summary of the whole document (max 60 words),
  "category": one of "Education","Career","Projects","Achievements","Certifications","Workshops","Courses","Activities","Documents","Other",
  "organization": organization or institution name, or null,
  "location": place, or null,
  "topics": array of up to 6 short topic/skill keywords,
  "start_date": "YYYY-MM-DD" or "YYYY-MM" or null,
  "end_date": "YYYY-MM-DD" or "YYYY-MM" or null,
  "date_unknown": true only when no reliable date exists in the document,
  "confidence": number between 0 and 1 for how confident you are overall,
  "extracted_text": the readable text you found in the document, trimmed to at most 4000 characters
}

Never invent a date. If no date is stated, set start_date and end_date to null and date_unknown to true.`;

export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        clientText: z.string().max(200000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { generateAiText, parseJsonReply } = await import("./ai.server");
    const supabase = context.supabase;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .single();
    if (docError || !doc) throw new Error("That document could not be found.");

    await supabase.from("documents").update({ status: "processing", error_message: null }).eq("id", doc.id);

    try {
      const mime = doc.mime_type ?? "";
      const parts: Array<Record<string, unknown>> = [{ type: "text", text: EXTRACTION_PROMPT }];
      let sentMedia = false;

      if (mime === "application/pdf" || IMAGE_TYPES.includes(mime)) {
        const { data: file, error: fileError } = await supabase.storage
          .from("documents")
          .download(doc.storage_path);
        if (fileError || !file) throw new Error("The uploaded file could not be read.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
        const base64 = btoa(binary);

        if (mime === "application/pdf") {
          parts.push({
            type: "file",
            data: base64,
            mediaType: "application/pdf",
            filename: doc.file_name,
          });
        } else {
          parts.push({ type: "image", image: base64, mediaType: mime });
        }
        sentMedia = true;
      }

      const clientText = data.clientText?.trim();
      if (clientText) {
        parts.push({
          type: "text",
          text: `File name: ${doc.file_name}\n\nDocument text:\n${clientText.slice(0, 120000)}`,
        });
      } else if (!sentMedia) {
        throw new Error("This file type could not be read. Try a PDF, image, Word file or text file.");
      } else {
        parts.push({ type: "text", text: `File name: ${doc.file_name}` });
      }

      const reply = await generateAiText([
        { role: "user", content: parts as never },
      ]);
      const extraction = parseJsonReply<Extraction>(reply);

      const startDate = extraction.date_unknown ? null : toDate(extraction.start_date);
      const endDate = extraction.date_unknown ? null : toDate(extraction.end_date);
      const dateUnknown = extraction.date_unknown === true || (!startDate && !endDate);
      const category = extraction.category ?? "Other";
      const title = (extraction.title ?? doc.file_name).slice(0, 160);

      await supabase
        .from("documents")
        .update({
          status: "processed",
          extracted_text: (extraction.extracted_text ?? clientText ?? "").slice(0, 20000),
          summary: extraction.summary ?? extraction.description ?? null,
          entities: {
            organization: extraction.organization ?? null,
            location: extraction.location ?? null,
            topics: extraction.topics ?? [],
            title,
          },
          confidence: extraction.confidence ?? null,
          detected_date: startDate,
          category,
        })
        .eq("id", doc.id);

      const { data: memory, error: memoryError } = await supabase
        .from("memories")
        .insert({
          user_id: context.userId,
          document_id: doc.id,
          title,
          description: extraction.description ?? extraction.summary ?? null,
          category,
          organization: extraction.organization ?? null,
          location: extraction.location ?? null,
          topics: extraction.topics ?? [],
          start_date: startDate,
          end_date: endDate,
          date_unknown: dateUnknown,
          confidence: extraction.confidence ?? null,
        })
        .select("*")
        .single();
      if (memoryError) throw new Error(memoryError.message);

      return { memory, dateUnknown };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed.";
      await supabase
        .from("documents")
        .update({ status: "failed", error_message: message.slice(0, 500) })
        .eq("id", doc.id);
      throw new Error(message);
    }
  });

export const askMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ question: z.string().min(2).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { generateAiText, parseJsonReply } = await import("./ai.server");
    const supabase = context.supabase;

    const [{ data: memories }, { data: documents }] = await Promise.all([
      supabase
        .from("memories")
        .select("id,title,description,category,organization,location,topics,start_date,end_date,date_unknown,document_id")
        .order("start_date", { ascending: false })
        .limit(300),
      supabase.from("documents").select("id,file_name,summary,category,detected_date").limit(300),
    ]);

    if (!memories?.length) {
      return {
        answer: "You have no memories yet. Upload a document and I will read it for you.",
        sources: [] as Array<{ id: string; file_name: string }>,
      };
    }

    const docById = new Map((documents ?? []).map((d) => [d.id, d]));
    const context_text = memories
      .map((m) => {
        const doc = m.document_id ? docById.get(m.document_id) : undefined;
        const when = m.date_unknown
          ? "Date unknown"
          : [m.start_date, m.end_date].filter(Boolean).join(" to ");
        return [
          `Memory id: ${m.id}`,
          `Title: ${m.title}`,
          `When: ${when}`,
          `Category: ${m.category}`,
          m.organization ? `Organization: ${m.organization}` : null,
          m.location ? `Place: ${m.location}` : null,
          m.topics?.length ? `Topics: ${m.topics.join(", ")}` : null,
          m.description ? `Details: ${m.description}` : null,
          doc ? `Source document id: ${doc.id} (${doc.file_name})` : null,
          doc?.summary ? `Document summary: ${doc.summary}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n---\n")
      .slice(0, 120000);

    const reply = await generateAiText([
      {
        role: "system",
        content:
          "You are ChronoMind, answering questions about the user's own personal history. Use ONLY the supplied records. If the records do not contain the answer, say so plainly. Address the user as 'you'. Reply with ONLY a JSON object: {\"answer\": string, \"source_document_ids\": string[]} where source_document_ids lists the source document ids you used.",
      },
      {
        role: "user",
        content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\nMy records:\n${context_text}\n\nMy question: ${data.question}`,
      },
    ]);

    const parsed = parseJsonReply<{ answer?: string; source_document_ids?: string[] }>(reply);
    const sources = (parsed.source_document_ids ?? [])
      .map((id) => docById.get(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({ id: d.id, file_name: d.file_name }));

    return {
      answer: parsed.answer ?? "I could not find an answer in your records.",
      sources,
    };
  });
