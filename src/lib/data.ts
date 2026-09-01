import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type ScreeningCase = Database["public"]["Tables"]["screening_cases"]["Row"];
export type CaseWithPatient = ScreeningCase & { patients: Patient | null };

export async function listPatients(search = ""): Promise<Patient[]> {
  let query = supabase.from("patients").select("*").order("created_at", { ascending: false });
  const term = search.trim();
  if (term) {
    const safe = term.replace(/[%,]/g, "");
    query = query.or(
      `full_name.ilike.%${safe}%,patient_code.ilike.%${safe}%,district.ilike.%${safe}%,contact_number.ilike.%${safe}%`,
    );
  }
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCases(limit = 100): Promise<CaseWithPatient[]> {
  const { data, error } = await supabase
    .from("screening_cases")
    .select("*, patients(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CaseWithPatient[];
}

export async function listCasesForPatient(patientId: string): Promise<ScreeningCase[]> {
  const { data, error } = await supabase
    .from("screening_cases")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCase(id: string): Promise<CaseWithPatient | null> {
  const { data, error } = await supabase
    .from("screening_cases")
    .select("*, patients(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CaseWithPatient | null) ?? null;
}

/** Signed URL for a private lesion image, or null when there is no image. */
export async function getImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("lesion-images").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadLesionImage(file: File, patientId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("lesion-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}
