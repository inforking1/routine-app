// src/pages/CommunityPage.tsx
import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import { supabase, sb } from "../lib/supabaseClient";
import { getDeviceId } from "../lib/device";

type ServerPost = {
  id: number;
  user_id: string | null;
  device_id: string | null;
  author: string | null;
  title: string | null;
  content: string;
  likes: number;
  created_at: string;
  display_name?: string | null;
  is_anonymous?: boolean | null;
};
type ServerComment = {
  id: number;
  post_id: number;
  user_id: string | null;
  device_id: string | null;
  author: string | null;
  content: string;
  created_at: string;
};

const getDisplayName = (user: any) => {
  if (!user) return "익명";
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "익명";
};
function displayTitleOf(p: ServerPost) {
  return (p.title?.trim() || p.content.split("\n")[0] || "제목 없음").slice(0, 120);
}

const DAILY_QUESTIONS = [
  "오늘 나를 가장 뿌듯하게 만든 일은 무엇인가요?",
  "이번 주에 꼭 이루고 싶은 작은 목표가 있다면?",
  "오늘 하루, 나에게 해주고 싶은 칭찬 한마디는?",
  "최근에 읽은 글귀 중 기억에 남는 것이 있나요?",
  "내일의 나를 위해 오늘 미리 준비해둔 것이 있다면?",
];

const AI_COMMENTS = [
  "오늘의 기록 멋져요! 작은 실천이 큰 변화를 만듭니다.",
  "꾸준함이 재능보다 낫다고 하죠. 오늘도 한 걸음 나아가셨네요! 🌱",
  "스스로를 믿고 나아가는 모습이 정말 아름다워요.",
  "잠시 쉬어가도 괜찮아요. 중요한 건 멈추지 않는 마음이니까요.",
  "오늘 하루도 수고 많으셨어요. 편안한 밤 되시길 응원해요 🌙",
];

export default function CommunityPage({ onHome }: { onHome: () => void }) {
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [todayQuestion, setTodayQuestion] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setTodayQuestion(DAILY_QUESTIONS[Math.floor(Math.random() * DAILY_QUESTIONS.length)]);
  }, []);

  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Array<ServerPost & { comments: ServerComment[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (alive) {
        setUserId(data.user?.id ?? null);
        setAuthor(getDisplayName(data.user));

        // Check Admin
        if (data.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", data.user.id)
            .single();
          setIsAdmin(profile?.is_admin ?? false);
        }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthor(getDisplayName(session?.user));

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        setIsAdmin(profile?.is_admin ?? false);
      } else {
        setIsAdmin(false);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      alive = false;
    };
  }, []);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { rows, more } = await fetchPosts({
          search: query,
          page,
          pageSize: PAGE_SIZE,
          userId,
          onlyMine: viewMode === "my"
        });
        if (!alive) return;
        if (page === 0) setList(rows);
        else setList((prev) => [...prev, ...rows]);
        setHasMore(more);
        setError(null);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "로드 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [query, page, viewMode, userId]);

  useEffect(() => setPage(0), [query, viewMode]);

  const total = useMemo(() => list.length, [list]);

  // Removed handleSaveNickname

  async function handleAdd() {
    const rawAuthor = (author || "익명").trim();
    const t = title.trim();
    const c = content.trim();
    if (!c) return;
    try {
      setBusy(true);
      // Ensure we have the latest user ID
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id ?? null;

      const displayName = isAnonymous ? "익명" : rawAuthor;

      const inserted = await createPost({
        author: displayName, // Backward compatibility
        display_name: displayName,
        is_anonymous: isAnonymous,
        title: t,
        content: c,
        userId: currentUserId
      });
      setList((prev) => [{ ...inserted, comments: [] }, ...prev]);
      setTitle("");
      setContent("");
      setIsAnonymous(false);
    } catch (e: any) {
      alert(e?.message ?? "등록 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("이 글을 삭제하시겠어요?")) return;
    try {
      setBusy(true);
      // count: 'exact' or 'estimated' to check rows affected
      const { error, count } = await sb.from("posts").delete({ count: "exact" }).eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error("삭제 권한이 없거나 이미 삭제된 글입니다.");

      setList((prev) => prev.filter((p) => p.id !== id));
      alert("삭제되었습니다."); // User feedback
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
      // Refresh list to sync state if failure happened
      setPage(0);
      setQuery((q) => q + " "); // minimal hack to trigger refetch, or just call fetch
      // actually, just triggering refetch is better. But minimal impact:
      window.location.reload();
      alert(e?.message ?? "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleLike(id: number) {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
    const rpcTry = await sb.rpc("inc_likes", { p_post_id: id });
    if (rpcTry.error) {
      const target = list.find((p) => p.id === id);
      const next = (target?.likes ?? 0) + 1;
      const { error } = await sb.from("posts").update({ likes: next }).eq("id", id);
      if (error) {
        setList((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 1) - 1 } : p)));
        alert("좋아요 실패: " + error.message);
      }
    }
  }

  async function handleAddComment(postId: number, who: string, text: string) {
    const t = text.trim();
    if (!t) return;
    try {
      const device_id = getDeviceId();
      const { data, error } = await sb
        .from("comments")
        .insert([
          {
            post_id: postId,
            device_id,
            user_id: userId,
            author: who || "익명",
            content: t,
          },
        ])
        .select("*")
        .single();
      if (error) throw error;
      setList((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments || []), data as ServerComment] } : p
        )
      );
    } catch (e: any) {
      alert(e?.message ?? "댓글 실패");
    }
  }

  return (
    <PageShell title="함께 성장하는 공간" onHome={onHome}>
      {/* 글쓰기 */}
      <SectionCard title="글 쓰기" subtitle="오늘의 생각, 성취, 고민을 가볍게 남겨보세요. 작은 기록이 내일의 루틴을 이어줍니다.">

        {/* Daily Question Prompt */}
        <div className="mb-4 rounded-xl bg-indigo-50 p-4 border border-indigo-100">
          <p className="text-xs font-bold text-indigo-500 mb-1">💡 오늘의 질문</p>
          <p className="text-sm text-indigo-800 font-medium">"{todayQuestion}"</p>
        </div>

        {/* Community Guidelines */}
        <div className="mb-4 rounded-xl bg-orange-50 p-3 border border-orange-100 text-xs text-orange-800 leading-relaxed">
          <b>서로를 존중하는 기록 공간입니다.</b><br />
          익명을 선택하더라도 욕설, 비방, 광고성 글은 관리자에 의해 삭제될 수 있으며,
          서비스 운영을 위해 작성 기록은 내부적으로 관리됩니다.
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <span>👤</span>
              {author || "로그인 필요"}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-600">익명으로 올리기</span>
          </label>
        </div>

        {isAnonymous && (
          <p className="mb-3 text-xs text-rose-500 ml-1 font-medium">
            * 익명이라도 커뮤니티 운영 기준을 위반하는 글은 삭제될 수 있습니다.
          </p>
        )}

        <input
          className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="제목을 입력하세요"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full min-h-[140px] rounded-2xl border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            등록
          </button>
          <button
            onClick={() => {
              setTitle("");
              setContent("");
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      </SectionCard>

      {/* 최근 글 + 검색 */}
      <SectionCard title="최근 글" subtitle={`${total}개 게시글`}>
        {/* View Mode Filter */}
        <div className="mb-4 flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "all"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            전체 글
          </button>
          <button
            onClick={() => setViewMode("my")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "my"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            내 글만
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            className="w-56 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="제목·내용·작성자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => setQuery("")}
              title="검색 초기화"
            >
              지우기
            </button>
          )}
        </div>

        {loading && page === 0 ? (
          <p className="text-sm text-slate-500">불러오는 중…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">에러: {error}</p>
        ) : (
          <>
            <ul className="space-y-4">
              {list.map((p) => {
                const t = displayTitleOf(p);
                const rest = p.content.startsWith(t) ? p.content.slice(t.length).trim() : p.content;

                return (
                  <li key={p.id} className="rounded-2xl border border-slate-300 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        {p.is_anonymous ? (
                          <b className="text-slate-700">
                            익명 {userId && p.user_id === userId ? <span className="text-xs font-normal text-slate-400">(나)</span> : ""}
                          </b>
                        ) : (
                          <b className="text-slate-700">{p.display_name || p.author || "익명"}</b>
                        )}
                        {" "}·{" "}
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLike(p.id)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="응원하기"
                        >
                          👏 응원 {p.likes ?? 0}
                        </button>
                        {userId && (p.user_id === userId || isAdmin) && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className={`rounded-xl border px-3 py-1.5 text-sm ${p.user_id === userId
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50" // My post
                              : "border-slate-800 text-slate-800 bg-slate-100 hover:bg-slate-200" // Admin Force Delete
                              }`}
                            title={p.user_id === userId ? "삭제" : "관리자 삭제"}
                          >
                            {p.user_id === userId ? "삭제" : "관리자 삭제"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="mb-2 text-base font-semibold text-slate-800">
                      {t}
                    </h3>

                    {/* 내용 */}
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-600 mb-4">{rest}</p>

                    {/* AI Auto Comment Placeholder (Dummy) */}
                    <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 flex items-start gap-2 border border-slate-100">
                      <span>🤖</span>
                      <span>{AI_COMMENTS[p.id % AI_COMMENTS.length]}</span>
                    </div>

                    {/* 댓글 */}
                    <CommentsBox
                      postId={p.id}
                      comments={p.comments ?? []}
                      onAdd={(name, text) => handleAddComment(p.id, name, text)}
                    />
                  </li>
                );
              })}
              {list.length === 0 && (
                <li className="text-sm text-slate-500">표시할 게시글이 없습니다.</li>
              )}
            </ul>

            {/* 더 보기 / 로더 */}
            <div className="mt-4 flex items-center justify-center">
              {loading && page > 0 ? (
                <span className="text-sm text-slate-500">더 불러오는 중…</span>
              ) : hasMore ? (
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setPage((p) => p + 1)}
                >
                  더 보기
                </button>
              ) : (
                <span className="text-xs text-slate-400">마지막 페이지입니다.</span>
              )}
            </div>
          </>
        )}
      </SectionCard>
    </PageShell>
  );
}

// ---- 서버 API -------------------------------------------------------------
async function fetchPosts(opts: {
  search?: string;
  page: number;
  pageSize: number;
  userId?: string | null;
  onlyMine?: boolean;
}) {
  const { search, page, pageSize, userId, onlyMine } = opts;

  let query = supabase
    .from("posts")
    .select("*, comments(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (onlyMine && userId) {
    query = query.eq("user_id", userId);
  }

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`title.ilike.${q},content.ilike.${q},author.ilike.${q}`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as Array<ServerPost & { comments: ServerComment[] }>;
  const more = typeof count === "number" ? to + 1 < count : rows.length === pageSize;

  return { rows, more };
}

async function createPost({
  author,
  display_name,
  is_anonymous,
  title,
  content,
  userId,
}: {
  author: string;
  display_name: string;
  is_anonymous: boolean;
  title: string;
  content: string;
  userId: string | null;
}) {
  const device_id = getDeviceId();
  const safeTitle = title.trim() || content.split("\n")[0].slice(0, 120) || "";
  const { data, error } = await sb
    .from("posts")
    .insert([{
      device_id,
      user_id: userId,
      author, // Legacy / Fallback
      display_name,
      is_anonymous,
      title: safeTitle || null,
      content
    }])
    .select("*, comments(*)")
    .single();
  if (error) throw error;
  return data as ServerPost & { comments: ServerComment[] };
}

// ---- 댓글 입력 박스 -------------------------------------------------------
function CommentsBox({
  comments,
  onAdd,
}: {
  postId: number;
  comments: ServerComment[];
  onAdd: (author: string, text: string) => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  const handle = () => {
    if (!text.trim()) return;
    onAdd(name, text);
    setText("");
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-sm font-medium">댓글 {comments.length}</div>

      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-2 text-sm">
            <div className="mb-1 text-xs text-slate-500">
              <b className="text-slate-700">{c.author || "익명"}</b> ·{" "}
              {new Date(c.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap">{c.content}</div>
          </li>
        ))}
        {comments.length === 0 && <li className="text-xs text-slate-500">아직 댓글이 없습니다.</li>}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-44 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="닉네임 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="댓글을 입력하세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
        />
        <button
          onClick={handle}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          등록
        </button>
      </div>
    </div>
  );
}
