const WD = "日月火水木金土";

export function toISODate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** 2026年9月3日(木) — 概要書2-1「曜日も表示」 */
export function jpDate(d: Date | string | null | undefined, withWeekday = true): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  if (Number.isNaN(date.getTime())) return "";
  const base = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return withWeekday ? `${base}(${WD.charAt(date.getDay())})` : base;
}

/** 26/09/03 — 一覧表示用 */
export function shortDate(d: Date | string | null | undefined): string {
  const iso = toISODate(d);
  return iso ? iso.slice(2).replace(/-/g, "/") : "";
}

export function jpDateRange(from: Date | string, to: Date | string | null | undefined): string {
  const a = jpDate(from);
  const b = to ? jpDate(to) : "";
  return b && b !== a ? `${a} 〜 ${b}` : a;
}

/** HH:mm 同士の差。日跨ぎは翌日として扱う（B-12） */
export function minutesBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const p = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  let d = p(end) - p(start);
  if (d < 0) d += 1440;
  return d;
}

export function formatMinutes(m: number): string {
  return `${Math.floor(m / 60)}時間${String(m % 60).padStart(2, "0")}分`;
}
