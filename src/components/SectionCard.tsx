// src/components/SectionCard.tsx
import { ReactNode } from "react";
import clsx from "clsx";
import * as ui from "./ui";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children: React.ReactNode;
  color?: string;
};

export default function SectionCard({
  title,
  subtitle,
  color,
  actionLabel,
  onAction,
  className,
  children,
}: Props) {
  return (
    <section className={clsx("h-full", ui.card, ui.cardPad, className)}>
      <header className={ui.cardHeader}>
        <div>
          <h3 className={ui.cardTitle}>{title}</h3>
          {subtitle && <p className={ui.cardSub}>{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} className={ui.btnGhost}>
            {actionLabel} ›
          </button>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}
