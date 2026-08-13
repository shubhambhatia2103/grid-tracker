// Shared data model for the tracker.
// Everything lives in the browser; a "month" is the unit that gets tracked.

export type MetricKey = "sleep" | "mood" | "fasting";

export interface MonthData {
  /** Ordered list of habit names shown as rows. */
  habits: string[];
  /** habit name -> day number (1..n) -> done? */
  cells: Record<string, Record<number, boolean>>;
  /** day number -> hours slept */
  sleep: Record<number, number>;
  /** day number -> mood, from -2 to +2 */
  mood: Record<number, number>;
  /** day number -> fasting hours */
  fasting: Record<number, number>;
}

export interface Store {
  version: 1;
  /** Default habit list new months are seeded from. */
  template: string[];
  /** "YYYY-MM" -> data for that month */
  months: Record<string, MonthData>;
}

export interface MetricConfig {
  key: MetricKey;
  label: string;
  /** Fixed y-axis domain, or null to auto-fit around the data. */
  domain: [number, number] | null;
  step: number;
  min: number;
  max: number;
  /** Unit suffix shown next to the average, e.g. "h". */
  unit: string;
}
