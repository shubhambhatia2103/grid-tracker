"use client";

import type { MetricConfig } from "@/lib/types";

const HEIGHT = 62;
const PAD_Y = 8;

export default function Sparkline({
  values,
  days,
  col,
  config,
}: {
  values: Record<number, number>;
  days: number;
  col: number;
  config: MetricConfig;
}) {
  const width = days * col;

  // Work out the y-axis domain: fixed if configured, else fit around the data.
  const present = Object.entries(values)
    .map(([d, v]) => ({ day: Number(d), v }))
    .filter((p) => Number.isFinite(p.v))
    .sort((a, b) => a.day - b.day);

  let lo: number;
  let hi: number;
  if (config.domain) {
    [lo, hi] = config.domain;
  } else if (present.length) {
    const vals = present.map((p) => p.v);
    lo = Math.min(...vals);
    hi = Math.max(...vals);
    const pad = Math.max(1, (hi - lo) * 0.2);
    lo -= pad;
    hi += pad;
  } else {
    [lo, hi] = [config.min, config.max];
  }
  if (hi === lo) hi = lo + 1;

  const x = (day: number) => (day - 0.5) * col;
  const y = (v: number) =>
    PAD_Y + (HEIGHT - 2 * PAD_Y) * (1 - (v - lo) / (hi - lo));

  // Break the line at gaps so missing days don't get connected across.
  const segments: { day: number; v: number }[][] = [];
  let run: { day: number; v: number }[] = [];
  let prevDay = -99;
  for (const p of present) {
    if (p.day !== prevDay + 1 && run.length) {
      segments.push(run);
      run = [];
    }
    run.push(p);
    prevDay = p.day;
  }
  if (run.length) segments.push(run);

  const midV = config.domain
    ? (lo + hi) / 2
    : present.length
      ? present.reduce((s, p) => s + p.v, 0) / present.length
      : (lo + hi) / 2;

  return (
    <svg
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* faint mid reference line */}
      <line
        x1={0}
        x2={width}
        y1={y(midV)}
        y2={y(midV)}
        stroke="var(--line-strong)"
        strokeDasharray="2 3"
        strokeWidth={1}
      />
      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map((p) => `${x(p.day)},${y(p.v)}`).join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {present.map((p) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.v)} r={2.2} fill="var(--ink)" />
      ))}
    </svg>
  );
}
