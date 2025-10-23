// src/pages/RoleManagementPage.tsx
import { useEffect, useMemo, useState } from "react";
import { isOperator, fetchUserRoleList, grantUserRole, revokeUserRole, type UserRoleRow } from "../utils/dataSource";

type RoleManagementPageProps = { onHome?: () => void }; // App.tsx에서 onHome 넘기는 패턴 유지
const ALL_ROLES = ["user", "operator", "admin"] as const;

export default function RoleManagementPage({ onHome }: RoleManagementPageProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ALL_ROLES)[number]>("operator");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const ok = await isOperator();
      setAllowed(ok);
      if (ok) {
        setLoading(true);
        try {
          const list = await fetchUserRoleList();
          setRows(list);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter(r => r.email?.toLowerCase().includes(s));
  }, [rows, q]);

  if (allowed === null) return <div className="p-6">로딩 중…</div>;
  if (!allowed)
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto border rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2">접근 불가</h1>
          <p className="text-sm text-slate-600">운영자만 접근할 수 있는 페이지입니다.</p>
          <div className="mt-4">
            <button onClick={onHome} className="px-3 py-2 rounded-xl border">홈으로</button>
          </div>
        </div>
      </div>
    );

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await fetchUserRoleList();
      setRows(list);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!email.trim()) return;
    await grantUserRole(email.trim(), role);
    setEmail("");
    await refresh();
  };

  const handleRevoke = async (em: string, r: string) => {
    await revokeUserRole(em, r);
    await refresh();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <button onClick={onHome} className="px-3 py-2 rounded-xl border">홈으로</button>
      </div>

      {/* 부여 폼 */}
      <div className="border rounded-2xl p-4 mb-6 grid gap-3 md:grid-cols-[1fr_180px_120px]">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일(정확히)"
          className="border rounded-xl px-3 py-2"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="border rounded-xl px-3 py-2">
          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={handleGrant} className="rounded-xl px-3 py-2 border">역할 부여</button>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2 mb-3">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="이메일 검색" className="border rounded-xl px-3 py-2 w-full md:w-80"/>
        <button onClick={refresh} className="rounded-xl px-3 py-2 border">{loading ? "새로고침…" : "새로고침"}</button>
      </div>

      {/* 리스트 */}
      <div className="border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] bg-slate-50 px-4 py-2 text-sm font-semibold">
          <div>이메일</div>
          <div>역할</div>
        </div>
        {filtered.map(r => (
          <div key={r.user_id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr] px-4 py-3 border-t">
            <div className="truncate">{r.email}</div>
            <div className="flex flex-wrap gap-2">
              {(r.roles ?? []).length === 0 && <span className="text-slate-400">없음</span>}
              {(r.roles ?? []).map(role => (
                <span key={role} className="inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm">
                  {role}
                  <button
                    onClick={() => handleRevoke(r.email, role)}
                    className="text-slate-500 hover:text-black"
                    title="역할 제거"
                  >✕</button>
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-slate-500 border-t">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
