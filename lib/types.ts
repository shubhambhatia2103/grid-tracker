// Shared data model for the tracker.
// Everything lives in the browser; a "month" is the unit that gets tracked.

export type MetricKey = "sleep" | "mood" | "fasting";

export interface MonthData {
  /** Ordered list of habit names shown as rows. */
  habits: string[];
  /** habit name -> day number (1..n) -> done? */
  cells: Record<string, Record<number, boolean>>;
  /** First day the tracker is "on"; earlier columns are left out. Default 1. */
  startDay: number;
  /** User-defined Y-axis hour values for Sleep (up to 3). */
  sleepAxis: number[];
  /** User-defined Y-axis hour values for Fasting (up to 4). */
  fastingAxis: number[];
  /** day number -> the marked hours value (one of sleepAxis) */
  sleep: Record<number, number>;
  /** day number -> the marked mood value, from -2 to +2 */
  mood: Record<number, number>;
  /** day number -> the marked hours value (one of fastingAxis) */
  fasting: Record<number, number>;
}

export interface Store {
  version: 1;
  /** Default habit list new months are seeded from. */
  template: string[];
  /** Default Sleep Y-axis new months are seeded from. */
  sleepAxis: number[];
  /** Default Fasting Y-axis new months are seeded from. */
  fastingAxis: number[];
  /** "YYYY-MM" -> data for that month */
  months: Record<string, MonthData>;
}

export interface MetricConfig {
  key: MetricKey;
  label: string;
  /** Unit suffix shown next to the average, e.g. "h". */
  unit: string;
  /** Whether the user can edit/add the Y-axis values (Sleep, Fasting). */
  editable: boolean;
  /** Most Y-axis values allowed. */
  maxValues: number;
  /** Fixed Y-axis values for non-editable metrics (Mood). */
  fixedValues?: number[];
}
