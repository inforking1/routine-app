import { getSolarDateFromLunar } from "./lunar";

/** 
 * 'MM/DD' or 'YYYY-MM-DD' -> 'YYYY-MM-DD' normalization
 */
export function normalizeDateStr(raw: string): string {
    if (/^\d{2}\/\d{2}$/.test(raw)) {
        const [mm, dd] = raw.split("/").map((v) => parseInt(v, 10));
        const y = new Date().getFullYear();
        return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 
 * YYYY-MM-DD string to Date object (Local time 00:00:00)
 */
export function parseYMD(ymd: string): Date {
    const [y, m, dd] = ymd.split("-").map((v) => parseInt(v, 10));
    return new Date(y, (m || 1) - 1, dd || 1);
}

/** 
 * Calculate next occurrence date considering Solar/Lunar and recurrence
 */
export function getNextAnniversaryDate(
    ymd: string,
    type: 'solar' | 'lunar' | undefined,
    isRecurring: boolean | undefined,
    today: Date
): Date {
    const safeType = type ?? 'solar';
    const safeRecurring = isRecurring ?? true;
    const normalized = normalizeDateStr(ymd);
    const d = parseYMD(normalized);

    // 1. Non-recurring
    if (!safeRecurring) {
        if (safeType === 'solar') {
            return d;
        } else {
            const solarStr = getSolarDateFromLunar(normalized, d.getFullYear());
            return parseYMD(solarStr);
        }
    }

    // 2. Recurring
    const tY = today.getFullYear();
    const today0 = new Date(tY, today.getMonth(), today.getDate());

    if (safeType === 'solar') {
        const thisYear = new Date(tY, d.getMonth(), d.getDate());
        if (thisYear >= today0) return thisYear;
        return new Date(tY + 1, d.getMonth(), d.getDate());
    } else {
        // Lunar recurring
        // Try current year
        const thisYearSolarStr = getSolarDateFromLunar(normalized, tY);
        const thisYearSolar = parseYMD(thisYearSolarStr);
        if (thisYearSolar >= today0) return thisYearSolar;

        // Try next year
        const nextYearSolarStr = getSolarDateFromLunar(normalized, tY + 1);
        return parseYMD(nextYearSolarStr);
    }
}

/**
 * Calculate D-Day label (D-Day, D-5, D+3 etc.)
 * Compares targetDate with today (using local midnight)
 */
export function getDDayLabel(targetDate: Date | string): { label: string; fullLabel: string; type: 'today' | 'future' | 'past'; diffDays: number } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const target = typeof targetDate === 'string' ? parseYMD(targetDate) : targetDate;
    // Ensure target is midnight
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffTime = targetMidnight.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return { label: "D-Day", fullLabel: "D-Day", type: 'today', diffDays };
    } else if (diffDays > 0) {
        return { label: `D-${diffDays}`, fullLabel: `D-${diffDays}`, type: 'future', diffDays };
    } else {
        return { label: `D+${Math.abs(diffDays)}`, fullLabel: `지남 (${Math.abs(diffDays)}일 전)`, type: 'past', diffDays };
    }
}
