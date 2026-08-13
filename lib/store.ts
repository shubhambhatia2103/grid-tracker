// localStorage-backed persistence. No network, no accounts — the browser is the database.

import { DEFAULT_TEMPLATE, emptyMonth } from "./defaults";
import type { MonthData, Store } from "./types";

const KEY = "grid-tracker:v1";

export function emptyStore(): Store {
  return { version: 1, template: [...DEFAULT_TEMPLATE], months: {} };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || parsed.version !== 1) return emptyStore();
    if (!parsed.template) parsed.template = [...DEFAULT_TEMPLATE];
    if (!parsed.months) parsed.months = {};
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked (private mode) — fail quietly.
  }
}

/** Return the month, creating it from the template if it doesn't exist yet. */
export function getMonth(store: Store, key: string): { store: Store; month: MonthData } {
  if (store.months[key]) return { store, month: store.months[key] };
  const month = emptyMonth(store.template);
  const next: Store = { ...store, months: { ...store.months, [key]: month } };
  return { store: next, month };
}
