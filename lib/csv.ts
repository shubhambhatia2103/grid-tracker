// CSV export. One row per day, one column per habit + the three metrics.
// Opens directly in Excel and imports natively into Notion as a database.

import { daysInMonth, isoDate, parseMonthKey, weekdayShort } from "./dates";
import type { MonthData } from "./types";

function escape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function monthToCsv(key: string, month: MonthData): string {
  const { year, month0 } = parseMonthKey(key);
  const n = daysInMonth(year, month0);

  const header = ["Date", "Day", ...month.habits, "Sleep", "Mood", "Fasting"];
  const rows: string[] = [header.map(escape).join(",")];

  for (let day = 1; day <= n; day++) {
    const cols: string[] = [
      isoDate(year, month0, day),
      weekdayShort(year, month0, day),
    ];
    for (const habit of month.habits) {
      cols.push(month.cells[habit]?.[day] ? "X" : "");
    }
    const val = (v: number | undefined) => (v === undefined ? "" : String(v));
    cols.push(val(month.sleep[day]), val(month.mood[day]), val(month.fasting[day]));
    rows.push(cols.map(escape).join(","));
  }

  return rows.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend a BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
