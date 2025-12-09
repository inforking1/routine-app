// src/pages/TodosPage.tsx
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import AuthCard from "../components/AuthCard";
import useAuth from "../hooks/useAuth";
import { supabase, sb } from "../lib/supabaseClient";
import { createSource, type Todo } from "../utils/dataSource";

// 날짜 유틸
function daysBetweenToday(iso?: string | null) {
  if (!iso) return null;
  const today = new Date();
  const base = new Date(iso + "T00:00:00");
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = base.getTime();
  const diff = Math.round((b - t) / (1000 * 60 * 60 * 24));
  return diff;
}
function ddBadge(iso?: string | null) {
  const diff = daysBetweenToday(iso);
  if (diff === null) return null;
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff < 0) return `D+${Math.abs(diff)}`;
  return `D-${diff}`;
}

export default function TodosPage({ onHome }: { onHome?: () => void }) {
  const { user } = useAuth();

  // 입력 상태
  const [input, setInput] = useState("");
  const [due, setDue] = useState<string | "">("");
  const inputRef = useRef<HTMLInputElement>(null);

  // UI 상태
  const [hideCompleted, setHideCompleted] = useState(false);
  const [focusTop3, setFocusTop3] = useState(false);

  // DB 데이터
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  // 데이터 소스 핸들 (memoize로 재생성 방지)
  const src = useMemo(() => (user ? createSource(user.id) : null), [user?.id]);

  // 최초 로드 & 사용자 변경 시 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user || !src) {
        // 로그인 전엔 로딩 멈추고 비움
        if (alive) {
          setLoading(false);
          setTodos([]);
        }
        return;
      }
      setLoading(true);
      try {
        const rows = await src.listTodos(); // DB에서 전체 조회
        if (!alive) return;
        // pinned 우선 + order 오름차순
        const sorted = rows
          .slice()
          .sort((a, b) => {
            if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
            return (a.order ?? 0) - (b.order ?? 0);
          });
        setTodos(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, src]);

  // 파생 목록
  const shown = useMemo(() => {
    let list = [...todos];
    if (hideCompleted) list = list.filter((t) => !t.done);

    list.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    if (focusTop3) {
      const pinned = list.filter((t) => t.pinned);
      const rest = list.filter((t) => !t.pinned);
      return [...pinned, ...rest].slice(0, 3);
    }
    return list;
  }, [todos, hideCompleted, focusTop3]);

  const nextOrder = (list: Todo[]) =>
    list.reduce((m, t) => Math.max(m, t.order ?? -1), -1) + 1;

  // ---- Handlers (DB 반영) ----
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !src) return;
    const text = input.trim();
    if (!text) return;

    const optimistic: Todo = {
      id: "tmp_" + Date.now(),
      user_id: user.id,
      text,
      done: false,
      due: due || null,
      pinned: false,
      order: nextOrder(todos),
      created_at: new Date().toISOString(),
    };
    setTodos((prev) => [...prev, optimistic]);
    setInput("");
    setDue("");
    inputRef.current?.focus();

    try {
      const payload = {
        text,
        due: due || null,
        order: (optimistic.order ?? 0) as number, // number 보장
        done: false,
        pinned: false,
        // 🔴 user_id는 절대 넣지 마세요. addTodo 타입에서 omit 되어 있음.
      } satisfies Parameters<typeof src.addTodo>[0];

      const created = await src.addTodo(payload);

      // tmp 치환
      setTodos((prev) => prev.map((t) => (t.id === optimistic.id ? created : t)));
    } catch {
      // 실패 롤백
      setTodos((prev) => prev.filter((t) => t.id !== optimistic.id));
      alert("추가에 실패했습니다.");
    }
  };

  const updateTodo = async (id: string, patch: Partial<Todo>) => {
    if (!src) return;
    const before = todos;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await src.updateTodo(id, {
        text: patch.text,
        done: patch.done,
        due: patch.due ?? null,
        pinned: patch.pinned,
        order: typeof patch.order === "number" ? patch.order : undefined,
      });
    } catch {
      setTodos(before);
      alert("저장에 실패했습니다.");
    }
  };

  const toggle = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    await updateTodo(id, { done: !target.done });
  };

  const pinToggle = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    await updateTodo(id, { pinned: !target.pinned });
  };

  const updateText = async (id: string, text: string) => {
    await updateTodo(id, { text });
  };

  const updateDue = async (id: string, date: string | null) => {
    await updateTodo(id, { due: date });
  };

  const remove = async (id: string) => {
    if (!src) return;
    const before = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await supabase.from("todos").delete().eq("id", id);
    } catch {
      setTodos(before);
      alert("삭제에 실패했습니다.");
    }
  };

  // 드래그 앤 드롭(보이는 리스트 순서를 전체 order로 반영)
  const onDrop = async (overId: string, draggingId: string | null) => {
    if (!src || !draggingId || draggingId === overId) return;

    const ids = shown.map((t) => t.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1) return;

    const newIds = [...ids];
    const [moved] = newIds.splice(from, 1);
    newIds.splice(to, 0, moved);

    // 화면 보이는 항목들 재배열 + 나머지 유지
    const rest = todos
      .filter((t) => !newIds.includes(t.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((t) => t.id);

    const finalIds = [...newIds, ...rest];
    const orderMap = new Map<string, number>();
    finalIds.forEach((id, idx) => orderMap.set(id, idx));

    const before = todos;
    const next = before.map((t) => ({ ...t, order: orderMap.get(t.id) ?? t.order }));
    setTodos(next);

    try {
      await Promise.all(
        next.map((t) => sb.from("todos").update({ order: t.order }).eq("id", t.id))
      );
    } catch {
      setTodos(before);
      alert("순서 저장에 실패했습니다.");
    }
  };

  const clearCompleted = async () => {
    if (!src || !user) return;
    const before = todos;
    const remain = before.filter((t) => !t.done);
    setTodos(remain);
    try {
      await supabase.from("todos").delete().eq("user_id", user.id).eq("done", true);
    } catch {
      setTodos(before);
      alert("완료 항목 삭제에 실패했습니다.");
    }
  };

  // ---- Render ----
  if (!user) {
    return (
      <PageShell title="할 일" onHome={onHome}>
        <SectionCard
          title="로그인이 필요합니다"
          subtitle="로그인 후 개인 Todo를 저장/불러옵니다"
        >
          <AuthCard />
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell title="할 일" onHome={onHome}>
      <SectionCard
        title="할 일(Todos)"
        subtitle="오늘 집중할 것들 관리 (드래그로 순서 변경 가능)"
      >
        {/* 입력 */}
        <form
          className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]"
          onSubmit={handleAdd}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="할 일을 입력하세요 (예: 5시에 미희 미팅)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
          >
            추가
          </button>
        </form>

        {/* 퀵 프리셋 */}
        <div className="mb-3 flex flex-wrap gap-2">
          {["물 2L", "20분 걷기", "영양제 챙기기", "스트레칭 5분"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setInput((s) => (s ? s : p))}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              + {p}
            </button>
          ))}
        </div>

        {/* 툴바 */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="accent-blue-500"
            />
            완료 숨기기
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={focusTop3}
              onChange={(e) => setFocusTop3(e.target.checked)}
              className="accent-amber-500"
            />
            집중 모드 (Top3)
          </label>

          <div className="ml-auto">
            <button
              type="button"
              onClick={clearCompleted}
              className="text-xs text-slate-500 hover:text-red-600 underline"
            >
              완료한 항목 모두 삭제
            </button>
          </div>
        </div>

        {/* 리스트 */}
        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-500">표시할 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((t) => (
              <TodoItem
                key={t.id}
                todo={t}
                onToggleItem={() => toggle(t.id)}
                onRemove={() => remove(t.id)}
                onPin={() => pinToggle(t.id)}
                onUpdateText={(text) => updateText(t.id, text)}
                onUpdateDue={(date) => updateDue(t.id, date)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", t.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(t.id, e.dataTransfer.getData("text/plain"))}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}

// ---- TodoItem ----
function TodoItem({
  todo,
  onToggleItem,
  onRemove,
  onPin,
  onUpdateText,
  onUpdateDue,
  ...dragProps
}: {
  todo: Todo;
  onToggleItem: () => void;
  onRemove: () => void;
  onPin: () => void;
  onUpdateText: (text: string) => void;
  onUpdateDue: (date: string | null) => void;
} & React.LiHTMLAttributes<HTMLLIElement>) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const [date, setDate] = useState(todo.due || "");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const badge = ddBadge(todo.due);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== todo.text) onUpdateText(trimmed);
    if ((date || null) !== (todo.due || null)) onUpdateDue(date || null);
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setText(todo.text);
      setDate(todo.due || "");
      setEditing(false);
    }
  };

  return (
    <li
      {...dragProps}
      className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-slate-200"
    >
      <div className="cursor-grab select-none pr-1 text-slate-300 group-hover:text-slate-400">
        ⋮⋮
      </div>

      <input
        type="checkbox"
        checked={todo.done}
        onChange={onToggleItem}
        className="size-4 accent-blue-500"
      />

      <div className="flex-1">
        {editing ? (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              ref={editRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={save}
                className="rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setText(todo.text);
                  setDate(todo.due || "");
                  setEditing(false);
                }}
                className="rounded-md bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm ${todo.done ? "line-through text-slate-400" : "text-slate-800"}`}
            >
              {todo.text}
            </span>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${badge === "오늘"
                  ? "bg-red-100 text-red-600"
                  : badge === "내일"
                    ? "bg-amber-100 text-amber-700"
                    : badge.startsWith("D-")
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                title={todo.due || undefined}
              >
                {badge}
              </span>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <>
          <button
            onClick={onPin}
            className={`rounded-md px-2 py-1 text-xs ${todo.pinned
              ? "text-amber-600 hover:bg-amber-50"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
          >
            📌
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            수정
          </button>
          <button
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
        </>
      )}
    </li>
  );
}
