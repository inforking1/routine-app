import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import AuthCard from "../components/AuthCard";
import TodoFilter from "../components/todos/TodoFilter";
import TodoItem from "../components/todos/TodoItem";
import TodoModal from "../components/todos/TodoModal";
import useAuth from "../hooks/useAuth";
import { supabase, sb } from "../lib/supabaseClient";
import {
  createSource,
  type Todo,
} from "../utils/dataSource";

const daysBetweenToday = (d?: string | null) => {
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Parse YYYY-MM-DD manually to ensure it treats it as local date 00:00
  const [y, m, day] = d.split('-').map(Number);
  const target = new Date(y, m - 1, day);

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// Sample Data
const SAMPLE_TODOS: Todo[] = [
  {
    id: 'sample-1',
    user_id: 'sample',
    text: '물 한 잔 마시기 (예시)',
    done: false,
    due: new Date().toISOString().split('T')[0],
    pinned: false,
    order: 0,
    created_at: new Date().toISOString(),
    priority: "normal",
    tags: [],
    is_recurring: false,
    recurring_rule: null,
    notes: "",
    goal_id: null,
  },
  {
    id: 'sample-2',
    user_id: 'sample',
    text: '5분 스트레칭 하기 (예시)',
    done: false,
    due: new Date().toISOString().split('T')[0],
    pinned: false,
    order: 1,
    created_at: new Date().toISOString(),
    priority: "normal",
    tags: [],
    is_recurring: false,
    recurring_rule: null,
    notes: "",
    goal_id: null,
  }
];

export default function TodosPage({ onHome }: { onHome?: () => void }) {
  const { user } = useAuth();

  // Input State
  const [input, setInput] = useState("");
  const [due, setDue] = useState<string | "">("");
  const inputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [viewMode, setViewMode] = useState<"today" | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [focusTop3, setFocusTop3] = useState(false);
  const [showRecos, setShowRecos] = useState(false); // Default collapsed in single view
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"manual" | "priority" | "due">("manual");

  // Modal State
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  // DB Data
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmpty = todos.length === 0;

  // Data Source
  const src = useMemo(() => (user ? createSource(user.id) : null), [user?.id]);

  // Load Data
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user || !src) {
        if (alive) {
          setLoading(false);
          setTodos([]);
        }
        return;
      }
      setLoading(true);
      try {
        const rows = await src.listTodos();
        if (!alive) return;
        setTodos(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id, src]);

  // Derived: Filtered List
  const { displayedTodos, groupedTodos, allTags, todayCompletedCount } = useMemo(() => {
    // 🚀 If empty, use Sample or Empty Array based on logic
    // But filters might confuse things. If empty, strictly show samples for "Today" view or simplify.
    // The requirement says "If todo list is empty... show samples".
    // We should bypass filters if it's the onboarding state (items.length === 0).

    if (todos.length === 0) {
      // Return samples only for 'today' view or generally?
      // Requirement says "Samples...". Layout assumes list.
      // Let's just return samples as displayedTodos.
      return {
        displayedTodos: SAMPLE_TODOS,
        groupedTodos: [{ key: 'today', label: '오늘', items: SAMPLE_TODOS }],
        allTags: [],
        todayCompletedCount: 0
      };
    }

    let list = [...todos];

    // 0. Collect all tags
    const tagsSet = new Set<string>();
    list.forEach(t => t.tags?.forEach(tag => tagsSet.add(tag)));
    const allTags = Array.from(tagsSet);

    // 1. Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.text.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // 2. Tag Filter
    if (filterTag) {
      list = list.filter(t => t.tags?.includes(filterTag));
    }

    // 3. Hide Completed
    if (hideCompleted) {
      list = list.filter(t => !t.done);
    }

    // 4. View Mode: "Today" Logic
    if (viewMode === "today" && !search) {
      const todayStr = new Date().toISOString().split("T")[0];
      list = list.filter(t => {
        if (!t.due) return false; // Hide backlog/no-date items
        return t.due <= todayStr; // Show past & today
      });
    }

    // 5. Sort
    list.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;

      if (sortBy === "priority") {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      } else if (sortBy === "due") {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      } else {
        return (a.order ?? 0) - (b.order ?? 0);
      }
    });

    // 6. Focus Top 3
    if (focusTop3 && viewMode === "today") {
      list = list.slice(0, 3);
    }

    // 7. Grouping
    let grouped = null;
    if (viewMode === "all") {
      const groups: Record<string, Todo[]> = {};
      const order = ["overdue", "today", "tomorrow", "future", "nodate"];

      list.forEach(t => {
        const diff = daysBetweenToday(t.due);
        let key = "nodate";
        if (diff !== null) {
          if (diff < 0) key = "overdue";
          else if (diff === 0) key = "today";
          else if (diff === 1) key = "tomorrow";
          else key = "future";
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      grouped = order.map(k => ({
        key: k,
        label: k === "overdue" ? "밀린 할 일" :
          k === "today" ? "오늘" :
            k === "tomorrow" ? "내일" :
              k === "future" ? "나중" : "기한 없음",
        items: groups[k] || []
      })).filter(g => g.items.length > 0);
    }

    const todayCompletedCount = todos.filter(t => t.done).length;

    return { displayedTodos: list, groupedTodos: grouped, allTags, todayCompletedCount };
  }, [todos, search, filterTag, hideCompleted, sortBy, focusTop3, viewMode]);

  const nextOrder = (list: Todo[]) =>
    list.reduce((m, t) => Math.max(m, t.order ?? -1), -1) + 1;

  // ---- Handlers ----
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !src || isSubmitting) return;
    const text = input.trim();
    if (!text) return;

    setIsSubmitting(true);

    const optimistic: Todo = {
      id: "tmp_" + Date.now(),
      user_id: user.id,
      text,
      done: false,
      due: due || null,
      pinned: false,
      order: nextOrder(todos),
      created_at: new Date().toISOString(),
      priority: "normal",
      tags: [],
      is_recurring: false,
      recurring_rule: null,
      notes: "",
      goal_id: null,
    };

    setTodos(prev => [...prev, optimistic]);
    setInput("");
    setDue("");

    try {
      const created = await src.addTodo({
        text,
        due: due || null,
        order: optimistic.order,
        done: false,
        pinned: false,
        priority: "normal",
        tags: [],
        is_recurring: false,
        recurring_rule: null,
        notes: "",
        goal_id: null,
      });
      setTodos(prev => prev.map(t => t.id === optimistic.id ? created : t));
    } catch {
      setTodos(prev => prev.filter(t => t.id !== optimistic.id));
      alert("추가 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTodo = async (id: string, patch: Partial<Todo>) => {
    if (id.startsWith('sample-')) return; // 샘플 수정 불가
    if (!src) return;
    const before = todos;
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

    try {
      await src.updateTodo(id, patch);
    } catch {
      setTodos(before);
      alert("수정 실패");
    }
  };

  const onDrop = async (overId: string, draggingId: string | null) => {
    if (!src || !draggingId || draggingId === overId || sortBy !== 'manual' || viewMode !== 'today') return;
    if (draggingId.startsWith('sample-') || overId.startsWith('sample-')) return; // 샘플 드래그 불가

    const ids = displayedTodos.map((t) => t.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1) return;

    const newIds = [...ids];
    const [moved] = newIds.splice(from, 1);
    newIds.splice(to, 0, moved);

    const rest = todos
      .filter((t) => !newIds.includes(t.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((t) => t.id);

    const finalIds = [...newIds, ...rest];
    const orderMap = new Map<string, number>();
    finalIds.forEach((id, idx) => orderMap.set(id, idx));

    const next = todos.map((t) => ({ ...t, order: orderMap.get(t.id) ?? t.order }));
    setTodos(next);

    try {
      await Promise.all(
        next.map(t => sb.from("todos").update({ order: t.order }).eq("id", t.id))
      );
    } catch {
      alert("순서 저장 실패");
    }
  };

  const clearCompleted = async () => {
    if (!confirm("완료된 항목을 모두 삭제하시겠습니까?")) return;
    if (!src || !user) return;
    const before = todos;
    setTodos(prev => prev.filter(t => !t.done));
    try {
      await supabase.from("todos").delete().eq("user_id", user.id).eq("done", true);
    } catch {
      setTodos(before);
      alert("삭제 실패");
    }
  };

  if (!user) {
    return (
      <PageShell title="할 일" onHome={onHome}>
        <SectionCard title="로그인이 필요합니다" subtitle="로그인 후 이용해주세요."><AuthCard /></SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell title="할 일" onHome={onHome}>

      {/* 🚀 Onboarding Guide Card */}
      {isEmpty && (
        <div className="mb-4 rounded-[22px] bg-[#F3F5FE] p-6 shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <span className="text-3xl">📝</span>
            <div>
              <h3 className="text-[18px] font-semibold text-slate-900 mb-1">오늘 이렇게 시작해보세요</h3>
              <p className="text-[14px] text-slate-700 leading-relaxed">
                작은 성취가 모여 큰 변화를 만듭니다.<br />
                오늘 꼭 하고 싶은 <strong>한 가지 일</strong>을 적어볼까요?
              </p>
            </div>
          </div>
        </div>
      )}

      <SectionCard
        title="할 일(Todos)"
        subtitle="오늘 해야 할 일을 관리하세요."
        className="bg-[#F5F7FF] md:hover:shadow-md md:hover:-translate-y-[2px] md:transition-transform md:duration-150"
        rightContent={
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            <button
              onClick={() => setViewMode("today")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${viewMode === "today" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              오늘 할 일
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${viewMode === "all" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              전체 보기
            </button>
          </div>
        }
      >
        {/* 1. Summary Widget */}
        <div className="mb-4 flex items-center justify-between rounded-[16px] bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-sm border border-emerald-100">
          <span className="text-sm font-semibold text-emerald-800">
            오늘의 성취 🎉
          </span>
          <span className="text-sm font-bold text-emerald-600">
            {todayCompletedCount}개 완료
          </span>
        </div>

        {/* 2. Input Form */}
        <form className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]" onSubmit={handleAdd}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isEmpty ? "예) 오늘 꼭 하고 싶은 한 가지를 적어보세요" : "할 일을 입력하세요..."}
            className="w-full rounded-[16px] border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="rounded-[16px] border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-emerald-500 px-4 py-2 text-white font-bold hover:bg-emerald-600 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "..." : "추가"}
          </button>
        </form>

        {/* 3. Recommended Routines (Collapsible) */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowRecos(!showRecos)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            {showRecos ? "🔽 추천 루틴 접기" : "▶️ 추천 루틴 펼치기"}
          </button>
          {showRecos && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
              {["물 2L 마시기", "20분 걷기", "영양제 먹기", "스트레칭 5분", "독서 10분"].map(p => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
                >
                  + {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Filters & Controls */}
        <TodoFilter
          search={search} setSearch={setSearch}
          filterTag={filterTag} setFilterTag={setFilterTag}
          sortBy={sortBy} setSortBy={setSortBy}
          allTags={allTags}
        />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={e => setHideCompleted(e.target.checked)}
                className="accent-slate-500"
              />
              완료 숨기기
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={focusTop3}
                onChange={e => setFocusTop3(e.target.checked)}
                className="accent-emerald-500"
                disabled={viewMode === 'all'}
              />
              <span className={focusTop3 && viewMode !== 'all' ? "text-emerald-700 font-bold" : ""}>집중 모드 (Top 3)</span>
            </label>
          </div>
        </div>

        {/* 5. List */}
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : viewMode === "today" ? (
          // Today Single List
          <>
            {displayedTodos.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <span className="text-3xl block mb-2">{search || filterTag ? "🔍" : "🌱"}</span>
                <p className="text-slate-500 text-sm font-medium">
                  {search || filterTag
                    ? "조건에 맞는 할 일이 없습니다."
                    : "오늘 한 가지 작은 할 일을 추가해볼까요?"}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {displayedTodos.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => updateTodo(todo.id, { done: !todo.done })}
                    onClickBody={() => {
                      if (todo.user_id !== 'sample') setSelectedTodo(todo);
                    }}
                    isDragging={false}
                    // Drop Targets
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(todo.id, e.dataTransfer.getData("text/plain"))}
                    // Drag Source
                    dragHandleProps={{
                      draggable: todo.user_id !== 'sample',
                      onDragStart: (e: any) => {
                        if (sortBy !== 'manual' || viewMode !== 'today' || todo.user_id === 'sample') return;
                        e.dataTransfer.setData("text/plain", todo.id);
                      }
                    }}
                  />
                ))}
              </ul>
            )}
          </>
        ) : (
          // All View Grouped List
          <div className="space-y-6">
            {displayedTodos.length === 0 && (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-slate-500 text-sm">표시할 내용이 없습니다.</p>
              </div>
            )}
            {groupedTodos?.map(group => (
              <div key={group.key}>
                <h3 className="mb-2 px-1 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  {group.label}
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[10px] text-slate-400">{group.items.length}</span>
                </h3>
                <ul className="space-y-2">
                  {group.items.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => updateTodo(todo.id, { done: !todo.done })}
                      onClickBody={() => {
                        if (todo.user_id !== 'sample') setSelectedTodo(todo);
                      }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 6. Delete Completed (Bottom Action) */}
        {todos.some(t => t.done) && (
          <div className="mt-8 flex justify-center border-t border-slate-100 pt-6">
            <button
              onClick={clearCompleted}
              className="rounded-full border border-rose-100 bg-rose-50 px-5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors"
            >
              🗑️ 완료된 항목 모두 삭제하기
            </button>
          </div>
        )}
      </SectionCard>

      {/* Modal */}
      {selectedTodo && (
        <TodoModal
          todo={selectedTodo}
          onSave={(patch) => updateTodo(selectedTodo.id, patch)}
          onDelete={() => {
            if (!src) return;
            const id = selectedTodo.id;
            const before = todos;
            setTodos(prev => prev.filter(t => t.id !== id));
            src.removeTodo(id).catch(() => {
              setTodos(before);
              alert("삭제 실패");
            });
            setSelectedTodo(null);
          }}
          onClose={() => setSelectedTodo(null)}
        />
      )}
    </PageShell>
  );
}
