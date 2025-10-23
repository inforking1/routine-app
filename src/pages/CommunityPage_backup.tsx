import { useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import type { Post } from "../types";

type Props = {
  posts: Post[]; // Post에 title?: string 만 추가해주세요.
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onHome: () => void;
};

// 내부에서 안전하게 쓰기 위한 확장 타입(기존 데이터 호환)
type PostEx = Post & { title?: string };

export default function CommunityPage({ posts, setPosts, onHome }: Props) {
  const [author, setAuthor] = useState(localStorage.getItem("nickname") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 검색어 상태
  const [query, setQuery] = useState("");

  const saveNickname = (name: string) => {
    setAuthor(name);
    localStorage.setItem("nickname", name);
  };

  const addPost = () => {
    const a = (author || "익명").trim();
    const t = title.trim();
    const c = content.trim();
    if (!c) return; // 내용은 필수
    const safeTitle = t || c.split("\n")[0].slice(0, 60) || "제목 없음";

    const newPost: PostEx = {
      id: Date.now(),
      author: a,
      title: safeTitle,
      content: c,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: [],
    };

    // 기존 글은 그대로 보존하면서 맨 앞에 추가
    setPosts((prev) => [newPost as Post, ...prev]);
    setTitle("");
    setContent("");
  };

  const removePost = (id: number) => {
    if (!confirm("이 글을 삭제하시겠어요?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p))
    );
  };

  const addComment = (postId: number, who: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: Date.now(),
                  author: (who || "익명").trim(),
                  content: t,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : p
      )
    );
  };

  // 검색 필터(제목/내용/작성자)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts as PostEx[];
    return (posts as PostEx[]).filter((p) => {
      const title = (p.title || p.content?.split("\n")[0] || "").toLowerCase();
      const content = (p.content || "").toLowerCase();
      const author = (p.author || "").toLowerCase();
      return title.includes(q) || content.includes(q) || author.includes(q);
    });
  }, [posts, query]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">커뮤니티</h2>
        <button
          onClick={onHome}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          ← 홈으로
        </button>
      </div>

      {/* 글쓰기 */}
      <SectionCard title="글 쓰기" subtitle="가벼운 생각/기록을 나눠보세요">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-44 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="닉네임 (선택)"
            value={author}
            onChange={(e) => saveNickname(e.target.value)}
          />
          <span className="text-xs text-slate-500">
            닉네임은 기기에 저장됩니다.
          </span>
        </div>

        {/* 제목 입력 */}
        <input
          className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />

        {/* 내용 입력 */}
        <textarea
          className="w-full min-h-[140px] rounded-lg border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={addPost}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
            title="등록"
          >
            등록
          </button>
          <button
            onClick={() => {
              setTitle("");
              setContent("");
            }}
            className="rounded-lg border px-4 py-2"
            title="취소"
          >
            취소
          </button>
        </div>
      </SectionCard>

      {/* 최근 글 + 검색 */}
      <SectionCard title="최근 글" subtitle={`${filtered.length}개 게시글`}>
        {/* 상단 검색 툴바 (기존 extra 대체) */}
        <div className="mb-3 flex items-center justify-end gap-2">
          <input
            className="w-56 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="제목·내용·작성자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={() => setQuery("")}
              title="검색 초기화"
            >
              지우기
            </button>
          )}
        </div>

        <ul className="space-y-4">
          {filtered.map((p) => {
            const displayTitle =
              (p as PostEx).title?.trim() ||
              p.content?.split("\n")[0]?.slice(0, 60) ||
              "제목 없음";
            const restContent = p.content?.startsWith(displayTitle)
              ? p.content.slice(displayTitle.length).trim()
              : p.content;

            return (
              <li key={p.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    <b className="text-slate-700">{p.author || "익명"}</b> ·{" "}
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLike(p.id)}
                      className="rounded border px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      title="좋아요"
                    >
                      👍 {p.likes}
                    </button>
                    <button
                      onClick={() => removePost(p.id)}
                      className="rounded border px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      title="삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 제목 */}
                <h3 className="mb-1 text-base font-semibold text-emerald-700 hover:underline hover:text-emerald-800 transition-colors">
                  {displayTitle}
                </h3>

                {/* 내용 */}
                <p className="whitespace-pre-wrap leading-relaxed">
                  {restContent}
                </p>

                {/* 댓글 */}
                <CommentsBox
                  postId={p.id}
                  comments={p.comments}
                  onAdd={(name, text) => addComment(p.id, name, text)}
                />
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="text-sm text-slate-500">검색 결과가 없습니다.</li>
          )}
        </ul>
      </SectionCard>
    </div>
  );
}

function CommentsBox({
  postId,
  comments,
  onAdd,
}: {
  postId: number;
  comments: Post["comments"];
  onAdd: (author: string, text: string) => void;
}) {
  const [name, setName] = useState(localStorage.getItem("nickname") || "");
  const [text, setText] = useState("");

  const handleAdd = () => {
    onAdd(name, text);
    setText("");
  };

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
      <div className="mb-2 text-sm font-medium">댓글 {comments.length}</div>

      <ul className="space-y-2">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded border bg-white p-2 text-sm dark:bg-slate-900"
          >
            <div className="mb-1 text-xs text-slate-500">
              <b className="text-slate-700">{c.author || "익명"}</b> ·{" "}
              {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap">{c.content}</div>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-xs text-slate-500">아직 댓글이 없습니다.</li>
        )}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-44 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="닉네임 (선택)"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            localStorage.setItem("nickname", e.target.value);
          }}
        />
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="댓글을 입력하세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-slate-800 px-4 py-2 text-white dark:bg-slate-700"
        >
          등록
        </button>
      </div>
    </div>
  );
}
