import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRole } from "../hooks/useRole";
import { Navigate } from "react-router-dom";

/** Types **/
type VerifyMode = "auto" | "soft" | "hard";
type Template = {
  id: string; title: string; details: string | null;
  category: "daily"|"habit"|"event"|"oneoff";
  base_points: number; verify_mode: VerifyMode;
  cooldown_sec: number; max_per_day: number;
  created_at: string; created_by: string | null;
};
type AssignmentRow = {
  id: string; template_id: string; template_title: string;
  user_id: string; user_email: string;
  due_date: string | null; status: string; points: number;
  created_at: string; updated_at: string;
};
type SubmissionRow = {
  id: string; assignment_id: string; template_title: string;
  user_id: string; user_email: string; note: string | null;
  evidence_url: string | null; review_status: "pending"|"approved"|"rejected";
  submitted_at: string;
};

type Tab = "templates" | "assign" | "review";

export default function AdminMissionsPage() {
  const { role, isAdmin } = useRole();
  const [tab, setTab] = useState<Tab>("templates");
  const [toast, setToast] = useState("");

  if (role === "loading") return <div className="p-6 text-slate-500">확인 중…</div>;
  if (!isAdmin) return <Navigate to="/404" replace />;

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mission Console</h1>
        <div className="inline-flex rounded-xl border p-1">
          {(["templates","assign","review"] as Tab[]).map(t=>(
            <button key={t}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab===t ? "bg-slate-900 text-white":"hover:bg-slate-100"}`}
              onClick={()=>setTab(t)}
            >
              {t==="templates"?"템플릿":t==="assign"?"할당": "검수"}
            </button>
          ))}
        </div>
      </div>

      {tab==="templates" && <TemplatesPanel setToast={setToast} />}
      {tab==="assign" && <AssignPanel setToast={setToast} />}
      {tab==="review" && <ReviewPanel setToast={setToast} />}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-white px-4 py-2 shadow">
          {toast}
        </div>
      )}
    </div>
  );
}

/** 템플릿 탭 **/
function TemplatesPanel({ setToast }: { setToast: (s:string)=>void }) {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "", details: "", category: "oneoff",
    base_points: 10, verify_mode: "soft" as VerifyMode,
    cooldown_sec: 0, max_per_day: 1,
  });
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mission_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { setToast(error.message); return; }
    setList((data ?? []) as Template[]);
  }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter(t => (t.title?.toLowerCase().includes(qq) || t.category?.includes(qq)));
  }, [list, q]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!form.title.trim()) { setToast("제목을 입력하세요"); return; }
      const payload = {
        title: form.title.trim(),
        details: form.details.trim() || null,
        category: form.category as Template["category"],
        base_points: Math.max(0, Number(form.base_points)||0),
        verify_mode: form.verify_mode,
        cooldown_sec: Math.max(0, Number(form.cooldown_sec)||0),
        max_per_day: Math.max(1, Number(form.max_per_day)||1),
      };
      const { error } = await supabase.from("mission_templates").insert(payload);
      if (error) throw error;
      setToast("템플릿 생성 완료");
      setForm({ title:"", details:"", category:"oneoff", base_points:10, verify_mode:"soft", cooldown_sec:0, max_per_day:1 });
      load();
    } catch (e:any) { setToast(e.message ?? "생성 실패"); }
  }

  async function onDelete(id: string) {
    if (!confirm("정말 삭제할까요?")) return;
    const { error } = await supabase.from("mission_templates").delete().eq("id", id);
    if (error) { setToast(error.message); return; }
    setToast("삭제 완료");
    setList(prev=>prev.filter(x=>x.id!==id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="rounded-2xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input className="md:col-span-2 rounded-xl border px-3 py-2" placeholder="템플릿 제목"
            value={form.title} onChange={e=>setForm(s=>({...s, title:e.target.value}))}/>
          <select className="rounded-xl border px-3 py-2"
            value={form.category} onChange={e=>setForm(s=>({...s, category:e.target.value}))}>
            <option value="oneoff">oneoff</option><option value="daily">daily</option>
            <option value="habit">habit</option><option value="event">event</option>
          </select>
          <select className="rounded-xl border px-3 py-2"
            value={form.verify_mode} onChange={e=>setForm(s=>({...s, verify_mode: e.target.value as VerifyMode}))}>
            <option value="soft">soft</option><option value="auto">auto</option><option value="hard">hard</option>
          </select>
          <input type="number" min={0} className="rounded-xl border px-3 py-2"
            value={form.base_points} onChange={e=>setForm(s=>({...s, base_points:Number(e.target.value)}))} placeholder="기본 포인트"/>
          <input type="number" min={0} className="rounded-xl border px-3 py-2"
            value={form.cooldown_sec} onChange={e=>setForm(s=>({...s, cooldown_sec:Number(e.target.value)}))} placeholder="쿨다운(초)"/>
          <input type="number" min={1} className="rounded-xl border px-3 py-2"
            value={form.max_per_day} onChange={e=>setForm(s=>({...s, max_per_day:Number(e.target.value)}))} placeholder="일 최대"/>
        </div>
        <textarea className="w-full rounded-xl border px-3 py-2" rows={2}
          placeholder="설명(선택)" value={form.details}
          onChange={e=>setForm(s=>({...s, details:e.target.value}))}/>
        <button type="submit" className="rounded-xl bg-slate-900 text-white px-4 py-2">템플릿 만들기</button>
      </form>

      <div className="flex items-center gap-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="템플릿 검색"
          className="w-full md:w-72 rounded-xl border px-3 py-2 text-sm"/>
      </div>

      <div className="rounded-2xl border divide-y">
        <div className="grid grid-cols-12 px-3 py-2 text-xs text-slate-500">
          <div className="col-span-4">제목</div>
          <div className="col-span-2">카테고리</div>
          <div className="col-span-2">포인트</div>
          <div className="col-span-3">검수</div>
          <div className="col-span-1 text-right">삭제</div>
        </div>
        {loading ? <div className="p-4 text-slate-500">불러오는 중…</div> :
          filtered.length===0 ? <div className="p-4 text-slate-500">템플릿 없음</div> :
          filtered.map(t=>(
            <div key={t.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
              <div className="col-span-4 truncate">{t.title}</div>
              <div className="col-span-2">{t.category}</div>
              <div className="col-span-2">{t.base_points}p</div>
              <div className="col-span-3">{t.verify_mode} · cool {t.cooldown_sec}s · max {t.max_per_day}/day</div>
              <div className="col-span-1 text-right">
                <button className="rounded-lg border px-2 py-1 text-red-600" onClick={()=>onDelete(t.id)}>삭제</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/** 할당 탭 **/
function AssignPanel({ setToast }: { setToast: (s:string)=>void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [list, setList] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateId, setTemplateId] = useState("");
  const [email, setEmail] = useState("");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState<number | "">("");

  async function loadAll() {
    setLoading(true);
    const [t, a] = await Promise.all([
      supabase.from("mission_templates").select("*").order("created_at",{ascending:false}),
      supabase.rpc("admin_list_assignments")
    ]);
    setLoading(false);
    if (t.error) setToast(t.error.message); else setTemplates((t.data ?? []) as Template[]);
    if (a.error) setToast(a.error.message); else setList((a.data ?? []) as AssignmentRow[]);
  }
  useEffect(()=>{ loadAll(); }, []);

  function basePointsOf(id: string) {
    return templates.find(t=>t.id===id)?.base_points ?? 0;
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!templateId) { setToast("템플릿을 선택하세요"); return; }
      if (!email.trim()) { setToast("이메일을 입력하세요"); return; }
      // 이메일 → user_id
      const { data: uid, error: e1 } = await supabase.rpc("admin_get_user_id_by_email", { target_email: email.trim() });
      if (e1) throw e1;
      if (!uid) throw new Error("해당 이메일의 사용자를 찾을 수 없습니다.");

      const p = (points==="" || points==null) ? basePointsOf(templateId) : Math.max(0, Number(points)||0);
      const insert = {
        template_id: templateId,
        user_id: uid as string,
        due_date: due || null,
        points: p,
        status: "assigned"
      };
      const { error } = await supabase.from("mission_assignments").insert(insert);
      if (error) throw error;
      setToast("할당 완료");
      setTemplateId(""); setEmail(""); setDue(""); setPoints("");
      const { data } = await supabase.rpc("admin_list_assignments");
      setList((data ?? []) as AssignmentRow[]);
    } catch (e:any) { setToast(e.message ?? "할당 실패"); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onAssign} className="rounded-2xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select className="md:col-span-2 rounded-xl border px-3 py-2"
            value={templateId} onChange={e=>setTemplateId(e.target.value)}>
            <option value="">템플릿 선택</option>
            {templates.map(t=> <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input className="md:col-span-2 rounded-xl border px-3 py-2"
            placeholder="사용자 이메일" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input type="date" className="rounded-xl border px-3 py-2" value={due} onChange={e=>setDue(e.target.value)}/>
          <input type="number" min={0} className="rounded-xl border px-3 py-2"
            placeholder={`포인트(기본 ${templateId?basePointsOf(templateId):0})`}
            value={points as any} onChange={e=>setPoints(e.target.value===""?"":Number(e.target.value))}/>
        </div>
        <button type="submit" className="rounded-xl bg-slate-900 text-white px-4 py-2">미션 할당</button>
      </form>

      <div className="rounded-2xl border divide-y">
        <div className="grid grid-cols-12 px-3 py-2 text-xs text-slate-500">
          <div className="col-span-4">템플릿</div>
          <div className="col-span-3">유저</div>
          <div className="col-span-2">마감/상태</div>
          <div className="col-span-2">포인트</div>
          <div className="col-span-1 text-right">ID</div>
        </div>
        {loading ? <div className="p-4 text-slate-500">불러오는 중…</div> :
          list.length===0 ? <div className="p-4 text-slate-500">할당 내역 없음</div> :
          list.map(a=>(
            <div key={a.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
              <div className="col-span-4 truncate">{a.template_title}</div>
              <div className="col-span-3 truncate">{a.user_email}</div>
              <div className="col-span-2 text-slate-600">
                {a.due_date ?? "-"} / {a.status}
              </div>
              <div className="col-span-2">{a.points}p</div>
              <div className="col-span-1 text-right text-xs truncate">{a.id.slice(0,6)}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/** 검수 탭 **/
function ReviewPanel({ setToast }: { setToast: (s:string)=>void }) {
  const [list, setList] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending"|"approved"|"rejected"|"all">("pending");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_submissions");
    setLoading(false);
    if (error) { setToast(error.message); return; }
    setList((data ?? []) as SubmissionRow[]);
  }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    if (filter==="all") return list;
    return list.filter(s=>s.review_status===filter);
  }, [list, filter]);

  async function review(id: string, decision: "approved"|"rejected") {
    try {
      const { error } = await supabase
        .from("mission_submissions")
        .update({ review_status: decision, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setToast(decision==="approved" ? "승인 완료 (+포인트 지급)" : "반려 처리");
      load();
    } catch (e:any) { setToast(e.message ?? "처리 실패"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["pending","approved","rejected","all"] as const).map(k=>(
          <button key={k}
            className={`rounded-lg border px-3 py-1 text-sm ${filter===k ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
            onClick={()=>setFilter(k)}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border divide-y">
        <div className="grid grid-cols-12 px-3 py-2 text-xs text-slate-500">
          <div className="col-span-3">템플릿</div>
          <div className="col-span-3">유저</div>
          <div className="col-span-3">메모/증빙</div>
          <div className="col-span-2">상태/제출시각</div>
          <div className="col-span-1 text-right">처리</div>
        </div>
        {loading ? <div className="p-4 text-slate-500">불러오는 중…</div> :
          filtered.length===0 ? <div className="p-4 text-slate-500">제출 없음</div> :
          filtered.map(s=>(
            <div key={s.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
              <div className="col-span-3 truncate">{s.template_title}</div>
              <div className="col-span-3 truncate">{s.user_email}</div>
              <div className="col-span-3">
                {s.note ? <div className="truncate">{s.note}</div> : <span className="text-slate-400">-</span>}
                {s.evidence_url && (
                  <a className="text-xs underline" href={s.evidence_url} target="_blank" rel="noreferrer">증빙 보기</a>
                )}
              </div>
              <div className="col-span-2 text-slate-600">
                {s.review_status} <br/>
                <span className="text-xs">{new Date(s.submitted_at).toLocaleString()}</span>
              </div>
              <div className="col-span-1 text-right space-x-2">
                <button className="rounded-lg border px-2 py-1"
                        onClick={()=>review(s.id, "approved")}>승인</button>
                <button className="rounded-lg border px-2 py-1 text-red-600"
                        onClick={()=>review(s.id, "rejected")}>반려</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
