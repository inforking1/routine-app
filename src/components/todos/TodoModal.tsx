import { useRef, useEffect, useState } from "react";
import { type Todo } from "../../utils/dataSource";

type Props = {
    todo: Todo;
    onSave: (patch: Partial<Todo>) => void;
    onDelete: () => void;
    onClose: () => void;
};

// 태그 추천
const PRESET_TAGS = ["건강", "업무", "학습", "루틴", "약속"];

export default function TodoModal({ todo, onSave, onDelete, onClose }: Props) {
    const [text, setText] = useState(todo.text);
    const [priority, setPriority] = useState<"normal" | "high">(todo.priority || "normal");
    const [tags, setTags] = useState<string[]>(todo.tags || []);
    const [tagInput, setTagInput] = useState("");
    const [isRecurring, setIsRecurring] = useState(todo.is_recurring || false);
    const [recurringRule, setRecurringRule] = useState(todo.recurring_rule || "daily");
    const [notes, setNotes] = useState(todo.notes || "");
    const [due, setDue] = useState(todo.due || "");

    const modalRef = useRef<HTMLDivElement>(null);

    // Click outside close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleSave = () => {
        onSave({
            text,
            priority,
            tags,
            is_recurring: isRecurring,
            recurring_rule: isRecurring ? recurringRule : null,
            notes,
            due: due || null,
        });
        onClose();
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) {
            setTags([...tags, t]);
        }
        setTagInput("");
    };

    const removeTag = (t: string) => {
        setTags(tags.filter(tag => tag !== t));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <h2 className="mb-4 text-lg font-bold text-slate-800">할 일 수정</h2>

                <div className="space-y-4">
                    {/* 1. 제목 */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">할 일</label>
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full border-b border-slate-200 py-1 text-base outline-none focus:border-emerald-500"
                            autoFocus
                        />
                    </div>

                    {/* 2. 우선순위 & 날짜 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">우선순위</label>
                            <div className="flex gap-1 rounded bg-slate-100 p-1">
                                <button
                                    onClick={() => setPriority("normal")}
                                    className={`flex-1 rounded py-1 text-xs transition-colors ${priority === "normal" ? "bg-white shadow text-slate-700" : "text-slate-400"}`}
                                >
                                    보통
                                </button>
                                <button
                                    onClick={() => setPriority("high")}
                                    className={`flex-1 rounded py-1 text-xs transition-colors ${priority === "high" ? "bg-rose-50 text-rose-600 shadow" : "text-slate-400"}`}
                                >
                                    중요!
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">마감일</label>
                            <input
                                type="date"
                                value={due}
                                onChange={e => setDue(e.target.value)}
                                className="w-full rounded bg-slate-50 px-2 py-1.5 text-xs outline-none"
                            />
                        </div>
                    </div>

                    {/* 3. 태그 */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">태그</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {tags.map(t => (
                                <span key={t} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                    #{t}
                                    <button onClick={() => removeTag(t)} className="opacity-50 hover:opacity-100">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addTag()}
                                placeholder="태그 입력..."
                                className="flex-1 border-b border-slate-200 py-1 text-xs outline-none focus:border-emerald-500"
                            />
                            <button onClick={addTag} className="text-xs text-emerald-600 font-bold">추가</button>
                        </div>
                        <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                            {PRESET_TAGS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => !tags.includes(t) && setTags([...tags, t])}
                                    className="shrink-0 rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                                >
                                    +{t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 4. 반복 & 메모 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="rounded accent-emerald-500"
                            />
                            <span className="text-sm text-slate-700">반복 설정</span>
                        </label>
                        {isRecurring && (
                            <select
                                value={recurringRule}
                                onChange={e => setRecurringRule(e.target.value)}
                                className="w-full rounded bg-slate-50 px-2 py-1.5 text-sm outline-none"
                            >
                                <option value="daily">매일</option>
                                <option value="weekday">평일 (월~금)</option>
                                <option value="weekly">매주</option>
                            </select>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">메모</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="상세 내용을 입력하세요."
                                className="w-full rounded bg-slate-50 p-2 text-sm outline-none resize-none"
                            />
                        </div>
                    </div>

                </div>

                {/* Buttons */}
                <div className="mt-6 flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow hover:bg-emerald-600"
                    >
                        저장하기
                    </button>
                    <button
                        onClick={() => {
                            if (confirm("정말 삭제하시겠습니까?")) onDelete();
                        }}
                        className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                        삭제
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-xl px-2 py-3 text-sm text-slate-400 hover:text-slate-600"
                    >
                        취소
                    </button>
                </div>
            </div>
        </div>
    );
}
