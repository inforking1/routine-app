// src/components/SectionCard.tsx
import type { ReactNode } from "react";
import clsx from "clsx";

type SectionColor = "white" | "blue" | "green" | "emerald" | "yellow" | "purple" | "rose" | "indigo" | "orange" | "sky" | "slate";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  rightContent?: ReactNode;
  color?: SectionColor; // Theme color
  className?: string; // Extra spacing or width
  children: ReactNode;
};

export default function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  rightContent,
  color = "white",
  className,
  children,
}: Props) {
  // 색상 테마 매핑 (Tailwind Classes)
  const colorStyles: Record<SectionColor, string> = {
    white: "bg-white border-slate-200",
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    emerald: "bg-emerald-50 border-emerald-100",
    yellow: "bg-yellow-50 border-yellow-100",
    purple: "bg-purple-50 border-purple-100",
    rose: "bg-rose-50 border-rose-100",
    indigo: "bg-indigo-50 border-indigo-100",
    orange: "bg-orange-50 border-orange-100",
    sky: "bg-sky-50 border-sky-100",
    slate: "bg-slate-50 border-slate-200",
  };

  const themeClass = colorStyles[color];

  return (
    <section
      className={clsx(
        "flex flex-col rounded-xl border p-4 md:p-5 shadow-sm transition-shadow hover:shadow-md",
        themeClass,
        className
      )}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex flex-col gap-1 mr-4">
          {/* 타이틀 크기 확대 & 볼드 & 상단 여백(여기선 padding 개념으로 처리됨) */}
          <h3 className="mt-1 text-xl font-bold text-slate-800 tracking-tight">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium opacity-80">{subtitle}</p>}
        </div>

        {/* 오른쪽 컨텐츠 (버튼 등) 또는 액션 버튼 */}
        <div className="flex items-center gap-2">
          {rightContent}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-black/5 hover:text-slate-900 transition-colors"
            >
              {actionLabel} ›
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 text-slate-700">
        {children}
      </div>
    </section>
  );
}
