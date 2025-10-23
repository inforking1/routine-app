// src/components/home/GoalsCard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Goal = {
  id: string;
  user_id: string;
  text: string;
  term: "short" | "mid" | "long";
  progress: number;
  created_at: string;
};

export default function GoalsCard() {
  const [rows, setRows] = useState<Goal[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("goals")
        .select("id,user_id,text,term,progress,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: true })
        .limit(5);
      setRows((data ?? []) as Goal[]);
    })();
  }, []);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">나의 목표(최근 5개)</h3>
      <ul className="text-sm space-y-1">
        {rows.length === 0 && <li className="text-slate-500">등록된 목표가 없습니다.</li>}
        {rows.map((g) => (
          <li key={g.id} className="flex items-center justify-between">
            <span className="truncate">{g.text}</span>
            <span className="text-[11px] text-slate-500">{g.progress}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
