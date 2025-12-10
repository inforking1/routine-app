// src/components/SectionCard.tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export type SectionColor =
  | "white"
  | "blue"
  | "green"
  | "emerald"
  | "yellow"
  | "purple"
  | "rose"
  | "indigo"
  | "orange"
  | "sky"
  | "slate";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: SectionColor;
  className?: string; // Additional custom classes
  children: ReactNode;
};

export default function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  color = "slate",
  className,
  children,
}: Props) {
  // 색상 테마 매핑 (Tailwind Classes) - Reset to simple container as requested.
  // We rely on 'className' prop passed from parent for specific background colors.
  // Keeping this map for backward compatibility or default fallback.
  const unifiedStyle = "";

  const colorStyles: Record<SectionColor, string> = {
    white: unifiedStyle,
    blue: unifiedStyle,
    green: unifiedStyle,
    emerald: unifiedStyle,
    yellow: unifiedStyle,
    purple: unifiedStyle,
    rose: unifiedStyle,
    indigo: unifiedStyle,
    orange: unifiedStyle,
    sky: unifiedStyle,
    slate: unifiedStyle,
  };

  const themeClass = colorStyles[color] || "";

  return (
    <section
      className={clsx(
        "flex flex-col rounded-[22px] px-5 py-6 shadow-sm transition-shadow hover:shadow-md",
        themeClass,
        className
      )}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex flex-col gap-1 mr-4">
          {/* 타이틀 크기 확대 & 볼드 & 상단 여백 (Pixel-perfect [1]) */}
          <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">
            {title}
          </h3>
          {subtitle && <p className="text-[13px] text-slate-600 font-medium">{subtitle}</p>}
        </div>

        {/* 오른쪽 컨텐츠 (버튼 등) 또는 액션 버튼 - [3] Final Polish Style */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="shrink-0 rounded-full border border-indigo-100 bg-white/70 px-3 py-[3px] text-[13px] font-medium text-indigo-600 shadow-sm hover:bg-white hover:text-indigo-700 transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </header>

      {/* 본문 컨텐츠 */}
      <div className="flex-1">{children}</div>
    </section>
  );
}
