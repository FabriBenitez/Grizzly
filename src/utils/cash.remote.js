import { supabase } from "../lib/supabase";

export async function fetchCashMovements() {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No pudimos cargar los movimientos de caja.");
  }

  return (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    label: row.label,
    amount: Number(row.amount),
    direction: row.direction,
    paymentMethod: row.payment_method,
    category: row.category,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function createCashMovement(payload) {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase
    .from("cash_movements")
    .insert([
      {
        type: payload.type,
        label: payload.label,
        amount: payload.amount,
        direction: payload.direction,
        payment_method: payload.paymentMethod,
        category: payload.category || null,
        reference: payload.reference || null,
        notes: payload.notes || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "No pudimos registrar el movimiento de caja.");
  }

  return {
    id: data.id,
    type: data.type,
    label: data.label,
    amount: Number(data.amount),
    direction: data.direction,
    paymentMethod: data.payment_method,
    category: data.category,
    reference: data.reference,
    notes: data.notes,
    createdAt: data.created_at,
  };
}
