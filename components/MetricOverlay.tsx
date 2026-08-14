"use client";

// The trend line that connects a metric's marks, drawn over its value-row grid.
// A mark sits at the centre of its cell, so the line threads the crosses —
// exactly like the pen line in the paper journal. It only appears once two or
// more days are marked (a single mark just shows its cross).

export default function MetricOverlay({
  marks,
  values,
  days,
  startDay,
  col,
  row,
}: {
  /** day -> marked value */
  marks: Record<number, number>;
  /** Y-axis values, top to bottom, as displayed. */
  values: number[];
  days: number;
  startDay: number;
  col: number;
  row: number;
}) {
  const width = days * col;
  const height = values.length * row;

  const points: { day: number; x: number; y: number }[] = [];
  for (let d = startDay; d <= days; d++) {
    const v = marks[d];
    if (v === undefined) continue;
    const ri = values.indexOf(v);
    if (ri < 0) continue; // value no longer on the axis
    points.push({ day: d, x: (d - 0.5) * col, y: (ri + 0.5) * row });
  }

  // Break the line where days are skipped, so gaps aren't bridged.
  const segments: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  let prev = -99;
  for (const p of points) {
    if (p.day !== prev + 1 && run.length) {
      segments.push(run);
      run = [];
    }
    run.push({ x: p.x, y: p.y });
    prev = p.day;
  }
  if (run.length) segments.push(run);

  return (
    <svg
      className="metric-line"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
