"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { METRICS } from "@/lib/defaults";
import {
  currentMonthKey,
  daysInMonth,
  isWeekend,
  monthTitle,
  parseMonthKey,
  shiftMonth,
  weekdayLetter,
} from "@/lib/dates";
import { emptyStore, loadStore, saveStore } from "@/lib/store";
import { downloadCsv, monthToCsv } from "@/lib/csv";
import type { MetricKey, MonthData, Store } from "@/lib/types";
import { emptyMonth } from "@/lib/defaults";
import Sparkline from "./Sparkline";

const COL = 30; // keep in sync with --col in globals.css

export default function Tracker() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [monthK, setMonthK] = useState<string>(currentMonthKey);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);

  // Load once on the client (localStorage isn't available during prerender).
  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);

  // Persist on every change, once loaded.
  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  const { year, month0 } = parseMonthKey(monthK);
  const days = daysInMonth(year, month0);
  const dayList = useMemo(
    () => Array.from({ length: days }, (_, i) => i + 1),
    [days],
  );

  const month: MonthData = store.months[monthK] ?? emptyMonth(store.template);

  // --- mutation helpers -------------------------------------------------
  const patchMonth = useCallback(
    (updater: (m: MonthData) => MonthData, syncTemplate = false) => {
      setStore((prev) => {
        const base = prev.months[monthK] ?? emptyMonth(prev.template);
        const next = updater(base);
        return {
          ...prev,
          template: syncTemplate ? [...next.habits] : prev.template,
          months: { ...prev.months, [monthK]: next },
        };
      });
    },
    [monthK],
  );

  const toggleCell = (habit: string, day: number) =>
    patchMonth((m) => {
      const row = { ...(m.cells[habit] ?? {}) };
      if (row[day]) delete row[day];
      else row[day] = true;
      return { ...m, cells: { ...m.cells, [habit]: row } };
    });

  const setMetric = (key: MetricKey, day: number, raw: string) =>
    patchMonth((m) => {
      const next = { ...m[key] } as Record<number, number>;
      if (raw === "") delete next[day];
      else {
        const v = Number(raw);
        if (Number.isFinite(v)) next[day] = v;
      }
      return { ...m, [key]: next };
    });

  const addHabit = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    patchMonth((m) => {
      if (m.habits.includes(clean)) return m;
      return {
        ...m,
        habits: [...m.habits, clean],
        cells: { ...m.cells, [clean]: {} },
      };
    }, true);
  };

  const removeHabit = (name: string) =>
    patchMonth((m) => {
      const cells = { ...m.cells };
      delete cells[name];
      return { ...m, habits: m.habits.filter((h) => h !== name), cells };
    }, true);

  const renameHabit = (index: number, raw: string) => {
    const next = raw.trim();
    setEditing(null);
    patchMonth((m) => {
      const old = m.habits[index];
      if (!old) return m;
      if (!next) {
        // empty rename removes the habit
        const cells = { ...m.cells };
        delete cells[old];
        return { ...m, habits: m.habits.filter((_, i) => i !== index), cells };
      }
      if (next === old || m.habits.includes(next)) return m;
      const habits = [...m.habits];
      habits[index] = next;
      const cells = { ...m.cells };
      cells[next] = cells[old] ?? {};
      delete cells[old];
      return { ...m, habits, cells };
    }, true);
  };

  const exportCsv = () => {
    downloadCsv(`grid-tracker-${monthK}.csv`, monthToCsv(monthK, month));
  };

  const average = (values: Record<number, number>): number | null => {
    const vs = Object.values(values).filter((v) => Number.isFinite(v));
    if (!vs.length) return null;
    return vs.reduce((a, b) => a + b, 0) / vs.length;
  };

  const fmtAvg = (key: MetricKey, avg: number | null, unit: string) => {
    if (avg === null) return "—";
    if (key === "mood") return `${avg > 0 ? "+" : ""}${avg.toFixed(1)}`;
    return `${avg.toFixed(1)}${unit}`;
  };

  const boardStyle = {
    // expose column count + width to CSS grid and SVG alignment
    ["--days" as string]: String(days),
    ["--col" as string]: `${COL}px`,
  } as React.CSSProperties;

  if (!ready) {
    return (
      <main className="wrap">
        <Header monthK={monthK} setMonthK={setMonthK} onExport={() => {}} />
        <div className="loading">Loading…</div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Header monthK={monthK} setMonthK={setMonthK} onExport={exportCsv} />

      <div className="board">
        <div className="board-inner" style={boardStyle}>
          {/* day numbers */}
          <div className="grid-row head-row">
            <div className="corner">Day</div>
            {dayList.map((d) => (
              <div
                key={d}
                className={`cell head-num${isWeekend(year, month0, d) ? " weekend" : ""}`}
              >
                {d}
              </div>
            ))}
          </div>
          {/* weekday letters */}
          <div className="grid-row head-row dow">
            <div className="corner" style={{ color: "var(--muted)" }}>
              Habit
            </div>
            {dayList.map((d) => (
              <div
                key={d}
                className={`cell${isWeekend(year, month0, d) ? " weekend" : ""}`}
              >
                {weekdayLetter(year, month0, d)}
              </div>
            ))}
          </div>

          {/* habit rows */}
          {month.habits.map((habit, idx) => (
            <div className="grid-row" key={habit}>
              <div className="rowlabel editable">
                {editing === idx ? (
                  <input
                    className="hname-input"
                    autoFocus
                    defaultValue={habit}
                    onBlur={(e) => renameHabit(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                ) : (
                  <>
                    <span
                      className="hname"
                      title="Click to rename"
                      onClick={() => setEditing(idx)}
                    >
                      {habit}
                    </span>
                    <button
                      className="rmv"
                      title="Remove habit"
                      onClick={() => removeHabit(habit)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {dayList.map((d) => {
                const done = !!month.cells[habit]?.[d];
                return (
                  <button
                    key={d}
                    className={`habit-cell${done ? " done" : ""}${
                      isWeekend(year, month0, d) ? " weekend" : ""
                    }`}
                    aria-pressed={done}
                    aria-label={`${habit}, day ${d}`}
                    onClick={() => toggleCell(habit, d)}
                  >
                    {done ? "✕" : ""}
                  </button>
                );
              })}
            </div>
          ))}

          {/* add habit */}
          <div className="grid-row">
            <div className="add-habit">
              {adding ? (
                <input
                  ref={addInputRef}
                  className="hname-input"
                  autoFocus
                  placeholder="Habit name…"
                  onBlur={(e) => {
                    addHabit(e.target.value);
                    setAdding(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addHabit(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                    if (e.key === "Escape") setAdding(false);
                  }}
                />
              ) : (
                <button onClick={() => setAdding(true)}>+ add habit</button>
              )}
            </div>
          </div>

          {/* metric sections: sleep / mood / fasting */}
          {METRICS.map((cfg) => {
            const values = month[cfg.key];
            const avg = average(values);
            return (
              <div className="metric" key={cfg.key}>
                <div className="metric-chart-row">
                  <div className="metric-label">
                    <span className="name">{cfg.label}</span>
                    <span className="avg">
                      avg {fmtAvg(cfg.key, avg, cfg.unit)}
                    </span>
                  </div>
                  <div className="metric-svg-holder">
                    <Sparkline
                      values={values}
                      days={days}
                      col={COL}
                      config={cfg}
                    />
                  </div>
                </div>
                <div className="grid-row metric-input-row">
                  <div className="rowlabel" style={{ color: "var(--muted)", fontSize: 11 }}>
                    per day
                  </div>
                  {dayList.map((d) => (
                    <input
                      key={d}
                      className={`mcell${isWeekend(year, month0, d) ? " weekend" : ""}`}
                      type="number"
                      inputMode="decimal"
                      step={cfg.step}
                      min={cfg.min}
                      max={cfg.max}
                      value={values[d] ?? ""}
                      aria-label={`${cfg.label}, day ${d}`}
                      onChange={(e) => setMetric(cfg.key, d, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="hint">
        Click a cell to mark a habit done. Click a habit name to rename it, or
        add your own. Type numbers in the Sleep / Mood / Fasting rows. Mood runs
        −2 to +2. Everything saves in this browser only.
      </p>

      <Footer />
    </main>
  );
}

function Header({
  monthK,
  setMonthK,
  onExport,
}: {
  monthK: string;
  setMonthK: (k: string) => void;
  onExport: () => void;
}) {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">
            grid<span className="dot">.</span>tracker
          </div>
        </div>
        <span className="pill">local &amp; private · no account</span>
      </div>
      <p className="tagline">
        Habits, sleep, mood &amp; fasting — one grid, one month at a glance.
      </p>

      <div className="monthbar">
        <button
          className="navbtn"
          aria-label="Previous month"
          onClick={() => setMonthK(shiftMonth(monthK, -1))}
        >
          ‹
        </button>
        <span className="month-title">{monthTitle(monthK)}</span>
        <button
          className="navbtn"
          aria-label="Next month"
          onClick={() => setMonthK(shiftMonth(monthK, 1))}
        >
          ›
        </button>
        <button className="today-link" onClick={() => setMonthK(currentMonthKey())}>
          today
        </button>
        <span className="spacer" />
        <button className="action primary" onClick={onExport}>
          Export CSV
        </button>
      </div>
    </>
  );
}

function Footer() {
  return (
    <div className="foot">
      <strong>Export &amp; move it anywhere.</strong> The CSV opens straight in
      Excel and imports into Notion as a database (New table → Import → CSV).
      One row per day, one column per habit.
      <br />
      Open source · your data never leaves your browser ·{" "}
      <a href="https://shubhambhatia.in" target="_blank" rel="noreferrer">
        shubhambhatia.in
      </a>
    </div>
  );
}
