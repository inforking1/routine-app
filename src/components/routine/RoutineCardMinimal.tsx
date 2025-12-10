// import React from "react";

export type RoutineItem = {
    id: string;
    label: string;
    isDone: boolean;
};

type Props = {
    title?: string;
    icon?: string;
    items?: RoutineItem[];
    className?: string;
    onToggle?: (id: string, nextValue: boolean) => void;
    onManage?: () => void;
};

export default function RoutineCardMinimal({
    title = "오늘의 루틴",
    icon = "🌱",
    items = [],
    className = "",
    onToggle,
    onManage,
}: Props) {
    return (
        <div className={`w-full rounded-[22px] bg-[#F5F7FF] shadow-sm px-5 py-6 transition-shadow hover:shadow-md ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[20px] leading-none">{icon}</span>
                    <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">{title}</h3>
                </div>
                {onManage && (
                    <button
                        onClick={onManage}
                        className="text-[12px] text-indigo-600 bg-white/70 border border-indigo-100 rounded-full px-3 py-[3px] shadow-sm hover:bg-white hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.97] transition-all"
                    >
                        관리
                    </button>
                )}
            </div>

            {/* Routine Items List */}
            <ul className="space-y-1">
                {items.length === 0 ? (
                    <li className="text-[14px] text-slate-500 py-2">아직 루틴이 없습니다. 아래에서 새 루틴을 추가하세요.</li>
                ) : (
                    items.map((item) => {
                        return (
                            <li
                                key={item.id}
                                className="flex items-center gap-2 py-1 cursor-pointer select-none group"
                                onClick={() => onToggle?.(item.id, !item.isDone)}
                            >
                                {/* Custom Checkbox UI */}
                                <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${item.isDone
                                        ? "border-emerald-500 bg-emerald-500"
                                        : "border-slate-300 bg-white group-hover:border-emerald-400"
                                        }`}
                                >
                                    {item.isDone && (
                                        <svg
                                            className="h-3.5 w-3.5 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                {/* Text */}
                                <span
                                    className={`text-[15px] leading-relaxed transition-colors ${item.isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}
