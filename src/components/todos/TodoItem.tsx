import { type Todo } from "../../utils/dataSource";

type Props = {
    todo: Todo;
    onToggle: () => void;
    onClickBody: () => void; // 상세 모달 열기
    // Drag props passed from parent
    isDragging?: boolean;
    dragHandleProps?: any;
};

// 날짜 유틸
function ddBadge(iso?: string | null) {
    if (!iso) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);

    const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 0) return { label: "오늘", color: "bg-red-100 text-red-600" };
    if (diff === 1) return { label: "내일", color: "bg-amber-100 text-amber-700" };
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: "bg-slate-100 text-slate-500" };
    return { label: `D-${diff}`, color: "bg-blue-100 text-blue-700" };
}

export default function TodoItem({ todo, onToggle, onClickBody, isDragging, dragHandleProps, ...rest }: Props & React.LiHTMLAttributes<HTMLLIElement>) {
    const badge = ddBadge(todo.due);
    const isToday = badge?.label === "오늘";

    return (
        <li
            {...rest}
            className={`group flex items-center gap-2 rounded-xl border p-3 hover:border-emerald-300 transition-all bg-white shadow-sm ${todo.done ? "opacity-60 bg-slate-50" : ""
                } ${isDragging ? "ring-2 ring-emerald-400 z-10" : "border-slate-100"}`}
        >
            {/* 1. Drag Handle & Checkbox */}
            <div className="flex items-center gap-2 shrink-0">
                <div
                    className="cursor-grab select-none px-1 text-slate-300 hover:text-slate-400 text-lg leading-none"
                    {...dragHandleProps}
                >
                    ⋮⋮
                </div>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={onToggle}
                        className="peer size-5 appearance-none rounded-md border-2 border-slate-300 checked:border-emerald-500 checked:bg-emerald-500 transition-colors cursor-pointer"
                    />
                    {/* Custom Check Icon (Hidden by default, shown when checked) */}
                    <svg
                        className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-white w-3.5 h-3.5 transition-opacity duration-200"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            {/* 2. Content (Click to edit) */}
            <div className="min-w-0 flex-1 cursor-pointer py-1" onClick={onClickBody}>
                {/* Top Line: Tags + Priority + recurring */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {todo.priority === "high" && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                            중요
                        </span>
                    )}
                    {todo.is_recurring && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            🔁 {todo.recurring_rule === "weekday" ? "평일" : todo.recurring_rule === "weekly" ? "매주" : "매일"}
                        </span>
                    )}
                    {todo.tags.map(t => (
                        <span key={t} className="text-[10px] text-slate-400">#{t}</span>
                    ))}
                    {badge && !todo.done && !isToday && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${badge.color}`}>
                            {badge.label}
                        </span>
                    )}
                </div>

                {/* Main Text */}
                <div className="flex items-center gap-1.5">
                    {isToday && !todo.done && (
                        <span className="text-rose-500 font-bold text-xs shrink-0">[오늘]</span>
                    )}
                    <span
                        className={`truncate text-sm font-medium transition-colors ${todo.done ? "line-through text-slate-400" : "text-slate-700"
                            }`}
                    >
                        {todo.text}
                    </span>
                    {/* Notes Indicator */}
                    {todo.notes && (
                        <span className="text-xs text-slate-300" title="메모 있음">
                            📝
                        </span>
                    )}
                </div>
            </div>

            {/* 3. Actions (Simplified) */}
            {/* 핀은 중요도와 겹칠 수 있으나, 일단 유지하거나 중요도로 대체 가능. 현재는 그냥 둠 */}
            {!todo.done && (
                <button
                    className="shrink-0 p-2 text-slate-300 hover:text-slate-500"
                    onClick={onClickBody} // 수정으로 진입
                >
                    🖌️
                </button>
            )}
        </li>
    );
}
