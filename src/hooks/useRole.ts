import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRole() {
  const [role, setRole] = useState<"operator"|"admin"|"none"|"loading">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setRole("none"); return; }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (error) { setRole("none"); return; }
      setRole((data?.role as any) ?? "none");
    })();
    return () => { alive = false; };
  }, []);

  return { role, isAdmin: role==="admin" || role==="operator", isOperator: role==="operator" };
}
