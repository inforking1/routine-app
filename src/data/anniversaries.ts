import { supabase } from "../lib/supabase";
import type { Anniv } from "../types/tables";

export async function getMyAnniversaries(): Promise<Anniv[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("로그인이 필요합니다.");
  const { data, error } = await supabase
    .from("anniversaries")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("pinned", { ascending: false })
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Anniv[];
}

export async function addAnniversary(input: {
  title: string;
  date: string;
  note?: string;
}): Promise<Anniv> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("로그인이 필요합니다.");
  const payload = {
    user_id: auth.user.id,
    title: input.title.trim(),
    date: input.date,
    note: (input.note ?? "").trim() || null,
    pinned: false,
  };
  const { data, error } = await supabase
    .from("anniversaries")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Anniv;
}

export async function togglePin(id: string, pinned: boolean) {
  const { error } = await supabase
    .from("anniversaries")
    .update({ pinned })
    .eq("id", id);
  if (error) throw error;
}

export async function removeAnniversary(id: string) {
  const { error } = await supabase.from("anniversaries").delete().eq("id", id);
  if (error) throw error;
}
