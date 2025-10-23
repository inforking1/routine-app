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

const nicknameKey = "nickname";
function getNickname() {
  return localStorage.getItem(nicknameKey) || "";
}
function setNickname(v: string) {
  localStorage.setItem(nicknameKey, v);
}
function displayTitleOf(p: ServerPost) {
  return (p.title?.trim() || p.content.split("\n")[0] || "제목 없음").slice(0, 120);
}

export default function CommunityPage({ onHome }: { onHome: () => void }) {
  const [author, setAuthor] = useState(getNickname());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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
      if (alive) setUserId(data.user?.id ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
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
        const { rows, more } = await fetchPosts({ search: query, page, pageSize: PAGE_SIZE });
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
  }, [query, page]);

  useEffect(() => setPage(0), [query]);

  const total = useMemo(() => list.length, [list]);

  const handleSaveNickname = (v: string) => {
    setAuthor(v);
    setNickname(v);
  };

  async function handleAdd() {
    const a = (author || "익명").trim();
    const t = title.trim();
    const c = content.trim();
    if (!c) return;
    try {
      setBusy(true);
      const inserted = await createPost({ author: a, title: t, content: c, userId });
      setList((prev) => [{ ...inserted, comments: [] }, ...prev]);
      setTitle("");
      setContent("");
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
      await sb.from("posts").delete().eq("id", id);
      setList((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
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
    <PageShell title="명상" onHome={onHome}>
      {/* 글쓰기 */}
      <SectionCard title="글 쓰기" subtitle="가벼운 생각/기록을 나눠보세요">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-44 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="닉네임 (선택)"
            value={author}
            onChange={(e) => handleSaveNickname(e.target.value)}
          />
        </div>

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
                        <b className="text-slate-700">{p.author || "익명"}</b> ·{" "}
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLike(p.id)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                          title="좋아요"
                        >
                          👍 {p.likes ?? 0}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="rounded-xl border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="mb-1 text-base font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">
                      {t}
                    </h3>

                    {/* 내용 */}
                    <p className="whitespace-pre-wrap leading-relaxed">{rest}</p>

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
async function fetchPosts(opts: { search?: string; page: number; pageSize: number }) {
  const { search, page, pageSize } = opts;

  let query = supabase
    .from("posts")
    .select("*, comments(*)", { count: "exact" })
    .order("created_at", { ascending: false });

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
  title,
  content,
  userId,
}: {
  author: string;
  title: string;
  content: string;
  userId: string | null;
}) {
  const device_id = getDeviceId();
  const safeTitle = title.trim() || content.split("\n")[0].slice(0, 120) || "";
  const { data, error } = await sb
    .from("posts")
    .insert([{ device_id, user_id: userId, author, title: safeTitle || null, content }])
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
  const [name, setName] = useState(getNickname());
  const [text, setText] = useState("");

  const handle = () => {
    if (!text.trim()) return;
    onAdd(name, text);
    setNickname(name);
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
