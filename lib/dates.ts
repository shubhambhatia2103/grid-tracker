// Small date helpers. Months are keyed "YYYY-MM"; days are 1-based.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Single-letter weekday, Monday-first display like the paper journal (M T W T F S S).
const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"]; // JS getDay(): 0=Sun
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month0: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month0: m - 1 };
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function weekdayLetter(year: number, month0: number, day: number): string {
  return WEEKDAY_LETTER[new Date(year, month0, day).getDay()];
}

export function weekdayShort(year: number, month0: number, day: number): string {
  return WEEKDAY_SHORT[new Date(year, month0, day).getDay()];
}

export function isWeekend(year: number, month0: number, day: number): boolean {
  const d = new Date(year, month0, day).getDay();
  return d === 0 || d === 6;
}

export function monthTitle(key: string): string {
  const { year, month0 } = parseMonthKey(key);
  return `${MONTH_NAMES[month0]} ${year}`;
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month0 } = parseMonthKey(key);
  const d = new Date(year, month0 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth());
}

export function currentMonthKey(): string {
  const now = new Date();
  return monthKey(now.getFullYear(), now.getMonth());
}

export function isoDate(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
