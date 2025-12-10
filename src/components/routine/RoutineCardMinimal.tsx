import { useState } from "react";

type Props = {
    title?: string;
    icon?: string;
    items?: string[];
    className?: string; // Additional styling flexibility
};

export default function RoutineCardMinimal({
    title = "오늘의 루틴",
    icon = "🌱",
    items = ["물 한 잔 마시기", "10분 걷기", "오늘의 감사 1개 적기"],
    className = "",
}: Props) {
    // Local state for UI interaction demo
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const toggleCheck = (index: number) => {
        setCheckedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    return (
        <div className={`w-full rounded-[22px] bg-[#F5F7FF] shadow-sm px-5 py-6 md:hover:shadow-md md:hover:-translate-y-[2px] md:transition-transform md:duration-150 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-[20px] leading-none">{icon}</span>
                <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">{title}</h3>
            </div>

            {/* Routine Items List */}
            <ul className="space-y-1">
                {items.map((item, index) => {
                    const isChecked = checkedItems[index] || false;
                    return (
                        <li
                            key={index}
                            className="flex items-center gap-2 py-1 cursor-pointer select-none group"
                            onClick={() => toggleCheck(index)}
                        >
                            {/* Custom Checkbox UI */}
                            <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isChecked
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-slate-300 bg-white group-hover:border-emerald-400"
                                    }`}
                            >
                                {isChecked && (
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
                                className={`text-[15px] leading-relaxed transition-colors ${isChecked ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"
                                    }`}
                            >
                                {item}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
