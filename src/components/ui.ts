// src/components/ui.ts
// Centralized UI utility classes for consistent look & feel.
// Import with:  import * as ui from "./ui";
export const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400";

export const btn = `h-9 rounded-xl border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50 ${ring}`;
export const btnPrimary = `h-9 rounded-xl bg-emerald-600 px-4 text-sm text-white hover:bg-emerald-700 ${ring}`;
export const btnDanger = `h-9 rounded-xl border border-rose-300 bg-white px-4 text-sm text-rose-600 hover:bg-rose-50 ${ring}`;
export const btnGhost = `h-9 rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-50 ${ring}`;

export const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
export const cardPad = "p-3 md:p-4";
export const cardHeader = "mb-2 flex items-center justify-between gap-2";
export const cardTitle = "text-sm md:text-base font-semibold text-slate-900";
export const cardSub = "text-xs text-slate-500";
export const list = "divide-y divide-slate-100";
export const subtle = "text-xs text-slate-500";

export const input = `h-10 rounded-xl border border-slate-300 px-3 text-sm ${ring}`;
export const select = input;
