export function getNextOccurrence(dateStr: string, base = new Date()) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const candidate = new Date(today.getFullYear(), m - 1, d);
  return candidate >= today ? candidate : new Date(today.getFullYear() + 1, m - 1, d);
}

export function dDay(next: Date, base = new Date()) {
  const ms = next.getTime() - new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round(ms / 86400000);
}

export function dBadge(n: number) {
  if (n <= 7) return "🟥";
  if (n <= 14) return "🟧";
  if (n <= 30) return "🟡";
  return "";
}
