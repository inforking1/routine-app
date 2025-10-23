// src/pages/SettingsPage.tsx
import { useMemo, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import AuthCard from "../components/AuthCard";
import SectionCard from "../components/SectionCard";
import {
  APP_KEYS,
  backupToSession,
  restoreFromSessionBackup,
  removeKeys,
} from "../utils/storage";
import {
  buildBackupSnapshot,
  downloadJSON,
  validateBackupPayload,
  summarizeSnapshot,
} from "../utils/exportImport";

type Props = {
  onHome: () => void;
};

/** 안전하게 로컬스토리지 JSON 읽기 */
function readJSON<T = unknown>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** community_posts 안의 댓글을 평탄화(백업용 보조) */
function flattenCommentsFromCommunityPosts(posts: any[]): any[] {
  const out: any[] = [];
  for (const p of posts) {
    if (Array.isArray(p?.comments)) {
      for (const c of p.comments) out.push({ ...c, post_id: p.id });
    }
  }
  return out;
}

export default function SettingsPage({ onHome }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  // --- UI 상태 ---
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(APP_KEYS.map((k) => [k, false]))
  );
  const anySelected = useMemo(
    () => APP_KEYS.some((k) => selected[k]),
    [selected]
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [lastCounts, setLastCounts] =
    useState<ReturnType<typeof summarizeSnapshot> | null>(null);

  // --- 섹션별 초기화 ---
  const toggle = (k: string) =>
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));

  const clearSelected = () => {
    if (!anySelected) return;
    if (!confirm("선택한 항목의 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;

    const keys = APP_KEYS.filter((k) => selected[k]);
    removeKeys(keys);
    setNotice(`삭제 완료: ${keys.join(", ")}`);
    setTimeout(() => location.reload(), 300);
  };

  // --- 캐시 비우기(비파괴) ---
  const clearCache = () => {
    // 별도 캐시 키가 없다면 no-op. 프로젝트에서 캐시 키를 사용하면 여기서 제거하세요.
    setNotice("캐시 비우기 완료");
  };

  // --- 전체 초기화(고급) + Undo ---
  const fullReset = () => {
    if (!confirm("정말 전체 초기화할까요? 모든 데이터가 삭제됩니다.")) return;
    const token = prompt("계속하려면 DELETE 를 입력하세요");
    if (token !== "DELETE") return;

    backupToSession(); // Undo 백업
    localStorage.clear();
    setUndoVisible(true);
    setNotice("전체 초기화 완료. 10초 안에 되돌리기가 가능합니다.");
    setTimeout(() => {
      setUndoVisible(false);
      location.reload();
    }, 10000);
  };

  const undo = () => {
    const ok = restoreFromSessionBackup();
    if (ok) {
      setNotice("되돌리기 완료");
      setUndoVisible(false);
      setTimeout(() => location.reload(), 300);
    } else {
      setNotice("되돌릴 데이터가 없습니다.");
    }
  };

  // --- 통합 백업(전체 스냅샷) ---
  const handleDownloadBackup = () => {
    const snapshot = buildBackupSnapshot({
      getGoals: () => readJSON("goals", []),
      getTodos: () => readJSON("todos", []),
      getAnniversaries: () => readJSON("anniversaries", []),
      getBucket: () => readJSON("bucketList", []),
      getGratitude: () => readJSON("gratitudeList", []),
      getPosts: () => readJSON("community_posts", []),
      getComments: () => {
        const posts = readJSON<any[]>("community_posts", []);
        return flattenCommentsFromCommunityPosts(posts);
      },
      getContacts: () => readJSON("messages", []),
      getSettings: () => ({
        theme: readJSON("theme", null),
        meditationNote: readJSON("meditationNote", null),
      }),
    });

    const counts = summarizeSnapshot(snapshot);
    setLastCounts(counts);

    downloadJSON(
      `routine-backup-${new Date().toISOString().slice(0, 19)}.json`,
      snapshot
    );

    setNotice(
      `백업 완료: goals ${counts.goals}, todos ${counts.todos}, anniversaries ${counts.anniversaries}, bucket ${counts.bucket}, gratitude ${counts.gratitude}, posts ${counts.posts}, comments ${counts.comments}, contacts ${counts.contacts}, settings ${counts.settings}`
    );
  };

  // --- 통합 복원 ---
  const handleImportClick = () => fileRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!validateBackupPayload(payload)) {
        setNotice("올바른 백업 파일이 아닙니다.");
        e.target.value = "";
        return;
      }

      const d = payload.data || {};

      // 존재하는 섹션만 복원 (역매핑 주의)
      if (d.goals !== undefined) localStorage.setItem("goals", JSON.stringify(d.goals));
      if (d.todos !== undefined) localStorage.setItem("todos", JSON.stringify(d.todos));
      if (d.anniversaries !== undefined)
        localStorage.setItem("anniversaries", JSON.stringify(d.anniversaries));
      if (d.bucket !== undefined)
        localStorage.setItem("bucketList", JSON.stringify(d.bucket));
      if (d.gratitude !== undefined)
        localStorage.setItem("gratitudeList", JSON.stringify(d.gratitude));
      if (d.posts !== undefined)
        localStorage.setItem("community_posts", JSON.stringify(d.posts));
      if (d.comments !== undefined)
        localStorage.setItem("comments", JSON.stringify(d.comments));
      if (d.contacts !== undefined)
        localStorage.setItem("messages", JSON.stringify(d.contacts));
      if (d.settings !== undefined && typeof d.settings === "object") {
        const s = d.settings as { theme?: unknown; meditationNote?: unknown };
        if (s.theme !== undefined) localStorage.setItem("theme", JSON.stringify(s.theme));
        if (s.meditationNote !== undefined)
          localStorage.setItem("meditationNote", JSON.stringify(s.meditationNote));
      }

      const counts = summarizeSnapshot(payload);
      setLastCounts(counts);
      setNotice(
        `복원 완료: goals ${counts.goals}, todos ${counts.todos}, anniversaries ${counts.anniversaries}, bucket ${counts.bucket}, gratitude ${counts.gratitude}, posts ${counts.posts}, comments ${counts.comments}, contacts ${counts.contacts}, settings ${counts.settings} (새로고침됩니다)`
      );
      setTimeout(() => location.reload(), 400);
    } catch {
      setNotice("복원 실패: JSON 파싱 오류");
    } finally {
      e.target.value = ""; // 같은 파일 재선택 가능
    }
  };

  return (
    <PageShell title="설정 · 데이터 관리" onHome={onHome}>
      {/* 🔐 로그인 카드 */}
      <AuthCard />

      {/* 알림 배너 */}
      {notice && (
        <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {/* Undo 배너 */}
      {undoVisible && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <span>전체 초기화가 실행되었습니다. 10초 안에 되돌릴 수 있습니다.</span>
          <button
            onClick={undo}
            className="h-9 rounded-lg bg-rose-600 px-3 text-sm text-white hover:bg-rose-700"
          >
            되돌리기(Undo)
          </button>
        </div>
      )}

      {/* 섹션별 초기화 */}
      <SectionCard title="섹션별 초기화" subtitle="삭제할 데이터만 선택하세요" className="!h-auto !min-h-0 self-start p-3 md:p-4">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {APP_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={!!selected[k]}
                onChange={() => toggle(k)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span>{k}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={clearSelected}
            disabled={!anySelected}
            className={`h-10 rounded-xl px-4 text-sm text-white transition-colors ${
              anySelected ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400"
            }`}
          >
            선택 삭제
          </button>
          <button
            onClick={() =>
              setSelected(Object.fromEntries(APP_KEYS.map((k) => [k, false])) as any)
            }
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50"
          >
            선택 해제
          </button>
        </div>
      </SectionCard>

      {/* 백업 / 복원 */}
      <SectionCard title="백업 · 복원" subtitle="JSON 파일로 내보내기/불러오기 (전체 스냅샷)" className="!h-auto !min-h-0 self-start p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="h-10 rounded-xl bg-slate-800 px-4 text-sm text-white hover:opacity-95"
          >
            백업 파일 다운로드
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            hidden
          />
          <button onClick={handleImportClick} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50">
            복원 파일 불러오기
          </button>

          {lastCounts && (
            <span className="ml-2 text-xs text-slate-500">
              (미리보기) goals {lastCounts.goals}, todos {lastCounts.todos},
              anniversaries {lastCounts.anniversaries}, bucket {lastCounts.bucket},
              gratitude {lastCounts.gratitude}, posts {lastCounts.posts},
              comments {lastCounts.comments}, contacts {lastCounts.contacts},
              settings {lastCounts.settings}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          * 백업에는 설정/데이터(로컬 저장)가 포함됩니다. 다른 기기에서 복원 시 동일
          브라우저 계열을 권장합니다.
        </p>
      </SectionCard>

      {/* 캐시 비우기 */}
      <SectionCard title="캐시 비우기(비파괴)" subtitle="임시 데이터만 제거합니다" className="!h-auto !min-h-0 self-start p-3 md:p-4">
        <div className="flex gap-2">
          <button onClick={clearCache} className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50">
            캐시 비우기
          </button>
        </div>
      </SectionCard>

      {/* 전체 초기화(고급) */}
      <SectionCard title="전체 초기화(고급)" subtitle="모든 데이터를 삭제합니다" color="rose" className="!h-auto !min-h-0 self-start p-3 md:p-4">
        <p className="mb-3 text-sm text-rose-700">
          매우 위험한 작업입니다. 백업 후 진행하세요. 이중 확인 + 10초 Undo가 제공됩니다.
        </p>
        <button
          onClick={fullReset}
          className="h-10 rounded-xl border border-rose-400 bg-white px-4 text-sm text-rose-600 hover:bg-rose-50"
        >
          전체 초기화 실행
        </button>
      </SectionCard>
    </PageShell>
  );
}
