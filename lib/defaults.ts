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

export const METRICS: MetricConfig[] = [
  { key: "sleep", label: "Sleep", domain: null, min: 0, max: 14, step: 0.5, unit: "h" },
  { key: "mood", label: "Mood", domain: [-2, 2], min: -2, max: 2, step: 1, unit: "" },
  { key: "fasting", label: "Fasting", domain: null, min: 0, max: 24, step: 1, unit: "h" },
];

export function emptyMonth(template: string[]): MonthData {
  const cells: Record<string, Record<number, boolean>> = {};
  for (const habit of template) cells[habit] = {};
  return { habits: [...template], cells, sleep: {}, mood: {}, fasting: {} };
}
