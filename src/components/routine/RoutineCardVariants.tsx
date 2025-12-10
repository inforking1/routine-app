import { useState } from "react";

export type RoutineItem = {
    id: string;
    text: string;
    isCompleted: boolean;
    timeOfDay?: "morning" | "afternoon" | "evening"; // For Stack View
    emoji?: string; // For Motivation View
};

type Props = {
    item: RoutineItem;
    onToggle: (id: string) => void;
    variant: "minimal" | "motivation" | "stack";
    animationType?: "scale" | "sparkle" | "fill";
};

/**
 * Version A: Minimal Light (미니멀 라이트형)
 * - 부드러운 파스텔 배경, 간결한 체크
 */
function MinimalCard({ item, onToggle }: { item: RoutineItem; onToggle: (id: string) => void }) {
    return (
        <div
            onClick={() => onToggle(item.id)}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all hover:bg-slate-50 ${item.isCompleted
                    ? "border-emerald-100 bg-emerald-50/50"
                    : "border-slate-100 bg-white"
                }`}
        >
            <span className={`text-base font-medium ${item.isCompleted ? "text-emerald-800 opacity-60 line-through" : "text-slate-700"}`}>
                {item.text}
            </span>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${item.isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                }`}>
                {item.isCompleted && <span className="text-xs">✔</span>}
            </div>
        </div>
    );
}

/**
 * Version B: Motivation (모티베이션 강조형)
 * - 이모지, 동기부여 문구(예시)
 */
function MotivationCard({ item, onToggle }: { item: RoutineItem; onToggle: (id: string) => void }) {
    return (
        <div
            onClick={() => onToggle(item.id)}
            className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all active:scale-[0.98] cursor-pointer ${item.isCompleted
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-indigo-100 bg-white hover:border-indigo-200"
                }`}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg">
                    {item.emoji || "✨"}
                </div>
                <div className="flex flex-col">
                    <span className={`text-base font-bold ${item.isCompleted ? "text-indigo-900 line-through opacity-50" : "text-slate-800"}`}>
                        {item.text}
                    </span>
                    {/* Motivation Text (Conditional) */}
                    {!item.isCompleted && (
                        <span className="text-xs font-medium text-indigo-500 group-hover:text-indigo-600">
                            오늘도 멋지게 해내볼까요? 🔥
                        </span>
                    )}
                    {item.isCompleted && (
                        <span className="text-xs font-bold text-indigo-600">
                            성공! 멋져요 🎉
                        </span>
                    )}
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-indigo-500/5 blur-xl"></div>
        </div>
    );
}

/**
 * Version C: Stack (카드묶음 스타일)
 * - 실제로는 리스트 아이템 형태지만 '카드 묶음' 컨셉의 디자인 적용
 * - 왼쪽 컬러 바(Color Bar)로 시간대 구분 느낌
 */
function StackCard({ item, onToggle }: { item: RoutineItem; onToggle: (id: string) => void }) {
    const timeColor =
        item.timeOfDay === "morning" ? "bg-orange-400" :
            item.timeOfDay === "afternoon" ? "bg-sky-400" :
                "bg-indigo-400"; // evening or default

    const timeLabel =
        item.timeOfDay === "morning" ? "아침" :
            item.timeOfDay === "afternoon" ? "오후" :
                "저녁";

    return (
        <div
            onClick={() => onToggle(item.id)}
            className={`relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border bg-white p-3 shadow-sm transition-transform hover:-translate-y-0.5 ${item.isCompleted ? "opacity-60 grayscale" : ""
                }`}
        >
            {/* Time Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${timeColor}`} />

            <div className="ml-2 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {timeLabel} ROUTINE
                </span>
                <span className="text-sm font-semibold text-slate-700">
                    {item.text}
                </span>
            </div>

            <div className="ml-auto">
                <div className={`h-5 w-5 rounded border-2 ${item.isCompleted ? "bg-slate-700 border-slate-700" : "border-slate-300"}`} />
            </div>
        </div>
    );
}

export default function RoutineCardVariant({ item, onToggle, variant }: Props) {
    if (variant === "motivation") {
        return <MotivationCard item={item} onToggle={onToggle} />;
    }
    if (variant === "stack") {
        return <StackCard item={item} onToggle={onToggle} />;
    }
    return <MinimalCard item={item} onToggle={onToggle} />;
}
