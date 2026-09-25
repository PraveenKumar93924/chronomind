import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type MemoryRow = {
  id: string;
  document_id: string | null;
  title: string;
  description: string | null;
  category: string;
  organization: string | null;
  location: string | null;
  topics: string[];
  start_date: string | null;
  end_date: string | null;
  date_unknown: boolean;
  confidence: number | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  extracted_text: string | null;
  summary: string | null;
  entities: Record<string, unknown> | null;
  confidence: number | null;
  detected_date: string | null;
  category: string | null;
  created_at: string;
};

export const memoriesQuery = queryOptions({
  queryKey: ["memories"],
  queryFn: async (): Promise<MemoryRow[]> => {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as MemoryRow[];
  },
});

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async (): Promise<DocumentRow[]> => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocumentRow[];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
});

export async function documentSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function formatMemoryDate(memory: Pick<MemoryRow, "start_date" | "end_date" | "date_unknown">) {
  if (memory.date_unknown || !memory.start_date) return "Date unknown";
  const format = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const start = format(memory.start_date);
  if (!memory.end_date) return start;
  const end = format(memory.end_date);
  return start === end ? start : `${start} – ${end}`;
}
