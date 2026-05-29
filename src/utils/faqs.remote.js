import { supabase } from "../lib/supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }
  return supabase;
}

export async function fetchFaqs({ includeInactive = false } = {}) {
  const client = requireSupabase();
  let query = client.from("faqs").select("*").order("sort_order", { ascending: true });
  
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(error.message || "No pudimos cargar las preguntas frecuentes.");
  }
  
  return data || [];
}

export async function saveFaq(draft) {
  const client = requireSupabase();
  const payload = {
    id: draft.id || undefined,
    question: draft.question.trim(),
    answer: draft.answer.trim(),
    is_active: Boolean(draft.is_active),
    sort_order: Number(draft.sort_order || 1),
  };

  const { error } = await client.from("faqs").upsert(payload);
  
  if (error) {
    throw new Error(error.message || "No pudimos guardar la pregunta frecuente.");
  }
}

export async function deleteFaq(id) {
  const client = requireSupabase();
  if (!id) return;

  const { error } = await client.from("faqs").delete().eq("id", id);
  
  if (error) {
    throw new Error(error.message || "No pudimos eliminar la pregunta frecuente.");
  }
}
