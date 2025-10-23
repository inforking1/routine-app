// src/lib/testDb.ts
import { supabase } from "./supabaseClient";

export async function testDB() {
  const { data, error } = await supabase.from("todos").select("*").limit(3);
  if (error) {
    console.error("DB Error:", error.message);
    return { ok: false, error };
  }
  console.log("✅ DB 연결 성공", data);
  return { ok: true, data };
}
