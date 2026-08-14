import type { MetricConfig, MonthData } from "./types";

// The starter habit list — taken from the original paper journal.
// Fully editable in the app; this is only the seed for a brand-new tracker.
export const DEFAULT_TEMPLATE: string[] = [
  "Creatine",
  "Exercise",
  "Protein",
  "Reading",
  "Pushup 50+",
  "No Smoking",
  "Calorie Deficit",
  "Build / Create",
  "Guilty Pleasure",
];

// Default Y-axis hour values (top to bottom). Editable in the app.
export const DEFAULT_SLEEP_AXIS: number[] = [8, 6, 4];
export const DEFAULT_FASTING_AXIS: number[] = [18, 16, 14, 12];
// Mood is a fixed scale, high to low.
export const MOOD_VALUES: number[] = [2, 1, 0, -1, -2];

export const METRICS: MetricConfig[] = [
  { key: "sleep", label: "Sleep", unit: "h", editable: true, maxValues: 3 },
  { key: "mood", label: "Mood", unit: "", editable: false, maxValues: 5, fixedValues: MOOD_VALUES },
  { key: "fasting", label: "Fasting", unit: "h", editable: true, maxValues: 4 },
];

export function emptyMonth(
  template: string[],
  sleepAxis: number[],
  fastingAxis: number[],
): MonthData {
  const cells: Record<string, Record<number, boolean>> = {};
  for (const habit of template) cells[habit] = {};
  return {
    habits: [...template],
    cells,
    startDay: 1,
    sleepAxis: [...sleepAxis],
    fastingAxis: [...fastingAxis],
    sleep: {},
    mood: {},
    fasting: {},
  };
}
