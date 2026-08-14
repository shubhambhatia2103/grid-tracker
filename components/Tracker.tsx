"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { METRICS, emptyMonth } from "@/lib/defaults";
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
import type { MetricConfig, MetricKey, MonthData, Store } from "@/lib/types";
import MetricOverlay from "./MetricOverlay";

const COL = 30; // keep in sync with --col in globals.css
const ROW = 30; // keep in sync with --row in globals.css

export default function Tracker() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [monthK, setMonthK] = useState<string>(currentMonthKey);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // Which Y-axis value is being edited / which metric is adding a value.
  const [editingAxis, setEditingAxis] = useState<{ key: MetricKey; val: number } | null>(null);
  const [addingAxis, setAddingAxis] = useState<MetricKey | null>(null);

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

  // Highlight today's column when the current month is on screen.
  const now = new Date();
  const todayDay =
    year === now.getFullYear() && month0 === now.getMonth() ? now.getDate() : -1;

  const blank = () => emptyMonth(store.template, store.sleepAxis, store.fastingAxis);
  const month: MonthData = store.months[monthK] ?? blank();

  // --- mutation helpers -------------------------------------------------
  const patchMonth = useCallback(
    (updater: (m: MonthData) => MonthData, syncTemplate = false) => {
      setStore((prev) => {
        const base =
          prev.months[monthK] ??
          emptyMonth(prev.template, prev.sleepAxis, prev.fastingAxis);
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

  // Update a Sleep/Fasting axis and remember it as the default for new months.
  const patchAxis = useCallback(
    (key: MetricKey, update: (m: MonthData) => MonthData) => {
      const field = key === "sleep" ? "sleepAxis" : "fastingAxis";
      setStore((prev) => {
        const base =
          prev.months[monthK] ??
          emptyMonth(prev.template, prev.sleepAxis, prev.fastingAxis);
        const next = update(base);
        return {
          ...prev,
          [field]: [...next[field]],
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

  // One mark per day: clicking a value sets it; clicking the same value clears it.
  const toggleMark = (key: MetricKey, day: number, value: number) =>
    patchMonth((m) => {
      const cur = { ...m[key] } as Record<number, number>;
      if (cur[day] === value) delete cur[day];
      else cur[day] = value;
      return { ...m, [key]: cur };
    });

  const setStartDay = (n: number) =>
    patchMonth((m) => ({ ...m, startDay: n }));

  const addAxisValue = (cfg: MetricConfig, raw: string) => {
    const nv = Number(raw);
    if (!Number.isFinite(nv)) return;
    patchAxis(cfg.key, (m) => {
      const field = cfg.key === "sleep" ? "sleepAxis" : "fastingAxis";
      const arr = m[field];
      if (arr.length >= cfg.maxValues || arr.includes(nv)) return m;
      return { ...m, [field]: [...arr, nv] };
    });
  };

  const editAxisValue = (cfg: MetricConfig, oldVal: number, raw: string) => {
    setEditingAxis(null);
    const nv = Number(raw);
    if (!Number.isFinite(nv) || nv === oldVal) return;
    patchAxis(cfg.key, (m) => {
      const field = cfg.key === "sleep" ? "sleepAxis" : "fastingAxis";
      const arr = m[field];
      if (arr.includes(nv)) return m; // avoid duplicate axis values
      const marks = { ...m[cfg.key] } as Record<number, number>;
      for (const d of Object.keys(marks)) {
        if (marks[Number(d)] === oldVal) marks[Number(d)] = nv;
      }
      return { ...m, [field]: arr.map((x) => (x === oldVal ? nv : x)), [cfg.key]: marks };
    });
  };

  const removeAxisValue = (cfg: MetricConfig, val: number) => {
    setEditingAxis(null);
    patchAxis(cfg.key, (m) => {
      const field = cfg.key === "sleep" ? "sleepAxis" : "fastingAxis";
      const arr = m[field];
      if (arr.length <= 1) return m; // keep at least one value
      const marks = { ...m[cfg.key] } as Record<number, number>;
      for (const d of Object.keys(marks)) {
        if (marks[Number(d)] === val) delete marks[Number(d)];
      }
      return { ...m, [field]: arr.filter((x) => x !== val), [cfg.key]: marks };
    });
  };

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

  // Y-axis values top-to-bottom for a metric.
  const axisFor = (cfg: MetricConfig): number[] => {
    const raw = cfg.editable
      ? cfg.key === "sleep"
        ? month.sleepAxis
        : month.fastingAxis
      : cfg.fixedValues ?? [];
    return [...raw].sort((a, b) => b - a);
  };

  const average = (marks: Record<number, number>): number | null => {
    const vs = Object.entries(marks)
      .filter(([d]) => Number(d) >= month.startDay)
      .map(([, v]) => v)
      .filter((v) => Number.isFinite(v));
    if (!vs.length) return null;
    return vs.reduce((a, b) => a + b, 0) / vs.length;
  };

  const fmtAvg = (key: MetricKey, avg: number | null, unit: string) => {
    if (avg === null) return "—";
    if (key === "mood") return `${avg > 0 ? "+" : ""}${avg.toFixed(1)}`;
    return `${avg.toFixed(1)}${unit}`;
  };

  const fmtVal = (key: MetricKey, v: number) =>
    key === "mood" ? (v > 0 ? `+${v}` : String(v)) : String(v);

  const boardStyle = {
    ["--days" as string]: String(days),
    ["--col" as string]: `${COL}px`,
  } as React.CSSProperties;

  const cellClass = (d: number, done: boolean) =>
    `habit-cell${done ? " done" : ""}${isWeekend(year, month0, d) ? " weekend" : ""}${
      d < month.startDay ? " pre" : ""
    }${d === todayDay ? " today" : ""}`;

  if (!ready) {
    return (
      <main className="wrap">
        <Header
          monthK={monthK}
          setMonthK={setMonthK}
          onExport={() => {}}
          startDay={1}
          days={31}
          onStartDay={() => {}}
        />
        <div className="loading">Loading…</div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <Header
        monthK={monthK}
        setMonthK={setMonthK}
        onExport={exportCsv}
        startDay={month.startDay}
        days={days}
        onStartDay={setStartDay}
      />

      <div className="board">
        <div className="board-inner" style={boardStyle}>
          {/* day numbers */}
          <div className="grid-row head-row">
            <div className="corner">Day</div>
            {dayList.map((d) => (
              <div
                key={d}
                title={d === todayDay ? "today" : undefined}
                className={`cell head-num${isWeekend(year, month0, d) ? " weekend" : ""}${
                  d < month.startDay ? " pre" : ""
                }${d === todayDay ? " today" : ""}`}
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
                className={`cell${isWeekend(year, month0, d) ? " weekend" : ""}${
                  d < month.startDay ? " pre" : ""
                }${d === todayDay ? " today" : ""}`}
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
                const pre = d < month.startDay;
                return (
                  <button
                    key={d}
                    className={cellClass(d, done)}
                    disabled={pre}
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
            const marks = month[cfg.key];
            const values = axisFor(cfg);
            const avg = average(marks);
            return (
              <div className="metric" key={cfg.key}>
                <div className="grid-row metric-header">
                  <div className="rowlabel metric-name">
                    <span className="name">{cfg.label}</span>
                    <span className="avg">Δ {fmtAvg(cfg.key, avg, cfg.unit)}</span>
                  </div>
                  <div className="headfill" />
                </div>

                {values.map((v) => (
                  <div className="grid-row val-row" key={v}>
                    <div className="rowlabel vlabel">
                      {editingAxis &&
                      editingAxis.key === cfg.key &&
                      editingAxis.val === v &&
                      cfg.editable ? (
                        <input
                          className="hname-input"
                          autoFocus
                          defaultValue={String(v)}
                          inputMode="numeric"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            if (raw === "") removeAxisValue(cfg, v);
                            else editAxisValue(cfg, v, raw);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") setEditingAxis(null);
                          }}
                        />
                      ) : (
                        <>
                          <span
                            className={`vnum${cfg.editable ? " editable" : ""}`}
                            title={cfg.editable ? "Click to edit value" : undefined}
                            onClick={
                              cfg.editable
                                ? () => setEditingAxis({ key: cfg.key, val: v })
                                : undefined
                            }
                          >
                            {fmtVal(cfg.key, v)}
                          </span>
                          {cfg.editable && values.length > 1 && (
                            <button
                              className="rmv"
                              title="Remove value"
                              onClick={() => removeAxisValue(cfg, v)}
                            >
                              ×
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {dayList.map((d) => {
                      const done = marks[d] === v;
                      const pre = d < month.startDay;
                      return (
                        <button
                          key={d}
                          className={cellClass(d, done)}
                          disabled={pre}
                          aria-pressed={done}
                          aria-label={`${cfg.label} ${fmtVal(cfg.key, v)}, day ${d}`}
                          onClick={() => toggleMark(cfg.key, d, v)}
                        >
                          {done ? "✕" : ""}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {cfg.editable && values.length < cfg.maxValues && (
                  <div className="grid-row">
                    <div className="add-habit addval">
                      {addingAxis === cfg.key ? (
                        <input
                          className="hname-input"
                          autoFocus
                          placeholder="hours…"
                          inputMode="numeric"
                          onBlur={(e) => {
                            addAxisValue(cfg, e.target.value);
                            setAddingAxis(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addAxisValue(cfg, e.currentTarget.value);
                              e.currentTarget.value = "";
                              setAddingAxis(null);
                            }
                            if (e.key === "Escape") setAddingAxis(null);
                          }}
                        />
                      ) : (
                        <button onClick={() => setAddingAxis(cfg.key)}>+ add value</button>
                      )}
                    </div>
                  </div>
                )}

                <MetricOverlay
                  marks={marks}
                  values={values}
                  days={days}
                  startDay={month.startDay}
                  col={COL}
                  row={ROW}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="hint">
        Click a cell to mark it. Habits toggle on/off; in Sleep / Mood / Fasting
        each day takes one mark and the line joins them. Click a habit name or a
        Y-axis value to edit it. Use <strong>start day</strong> to begin the
        month wherever you like. Everything saves in this browser only.
      </p>

      <Footer />
    </main>
  );
}

function Header({
  monthK,
  setMonthK,
  onExport,
  startDay,
  days,
  onStartDay,
}: {
  monthK: string;
  setMonthK: (k: string) => void;
  onExport: () => void;
  startDay: number;
  days: number;
  onStartDay: (n: number) => void;
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
        <label className="startctl">
          start day
          <select
            value={startDay}
            aria-label="Start tracking on day"
            onChange={(e) => onStartDay(Number(e.target.value))}
          >
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
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
