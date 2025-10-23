import { FormEvent, useState } from "react";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import MeditationTimer from "../pages/MeditationTimer";
import { Todo, Anniversary } from "../types";

export default function RoutinesPage({
  todos, addTodo, toggleTodo,
  anniversaries, addAnniv,
  onHome,
}: {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  anniversaries: Anniversary[];
  addAnniv: (title: string, date: string) => void;
  onHome: () => void;
}) {
  const [todoInput, setTodoInput] = useState("");
  const [annivTitle, setAnnivTitle] = useState("");
  const [annivDate, setAnnivDate] = useState("");

  return (
    <PageShell title="루틴 & 할 일" onHome={onHome}>
      <SectionCard title="명상(Meditation)" subtitle="3분 호흡으로 리셋" color="violet">
        <MeditationTimer minutes={3} />
      </SectionCard>

      <SectionCard title="할 일(Todos)" subtitle="오늘 집중할 3가지" color="amber">
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!todoInput.trim()) return;
            addTodo(todoInput.trim());
            setTodoInput("");
          }}
        >
          <input
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            placeholder="할 일을 입력하세요"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button className="rounded-xl bg-blue-500 px-3 py-2 text-white hover:bg-blue-600">추가</button>
        </form>

        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} className="size-4 accent-blue-500" />
              <span className={`text-sm ${t.done ? "line-through text-slate-400" : ""}`}>{t.text}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="기념일(Anniversaries)" subtitle="중요한 날 잊지 않기" color="rose">
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!annivTitle.trim() || !annivDate) return;
            addAnniv(annivTitle.trim(), annivDate);
            setAnnivTitle(""); setAnnivDate("");
          }}
        >
          <input
            value={annivTitle}
            onChange={(e) => setAnnivTitle(e.target.value)}
            placeholder="제목 (예: 부모님 결혼기념일)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="date"
            value={annivDate}
            onChange={(e) => setAnnivDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button className="rounded-xl bg-blue-500 px-3 py-2 text-white hover:bg-blue-600">추가</button>
        </form>

        <ul className="divide-y divide-slate-200 text-sm">
          {anniversaries.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span>{a.title}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600">{a.date}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}
