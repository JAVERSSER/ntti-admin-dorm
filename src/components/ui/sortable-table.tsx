"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "./cn";

export type SortValue = string | number | boolean | null | undefined;

export type SortColumn = {
  label: ReactNode;
  /** Leave out for columns that cannot be sorted, such as Actions. */
  sortable?: boolean;
  /** Classes for the header and the cells of this column (e.g. text-right). */
  className?: string;
  /** Classes for the cells only. */
  cellClassName?: string;
};

export type SortRow = {
  key: string;
  /** One cell per column, already rendered. */
  cells: ReactNode[];
  /** One value per column, used for sorting; ignored for columns that are not sortable. */
  values: SortValue[];
};

/** Narrowest a column can be dragged, in pixels. */
const MIN_WIDTH = 56;

// "A2" before "A10"; Khmer and Latin names sort the way people expect.
const collator = new Intl.Collator(["km", "en"], { numeric: true, sensitivity: "base" });
const isEmpty = (v: SortValue) => v == null || v === "";

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(b) - Number(a); // true first
  return collator.compare(String(a), String(b));
}

/**
 * A table whose column headers sort the rows when clicked (ascending, descending,
 * then back to the original order) and whose columns can be resized by dragging the
 * edge of a header. The table always stays the width of its box: widening a column
 * takes the space from the column to its right. Double-click an edge to reset the widths.
 * Widths are not saved: reloading the page shows the default widths again.
 */
export function SortableTable({ columns, rows }: { columns: SortColumn[]; rows: SortRow[] }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  /** Column widths in percent after the user drags an edge; null = automatic widths. */
  const [widths, setWidths] = useState<number[] | null>(null);
  const headRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    return rows
      .map((r, i) => ({ r, i }))
      .sort((x, y) => {
        const a = x.r.values[sort.col];
        const b = y.r.values[sort.col];
        // Empty values stay at the bottom in both directions.
        if (isEmpty(a) || isEmpty(b)) return isEmpty(a) === isEmpty(b) ? x.i - y.i : isEmpty(a) ? 1 : -1;
        return compare(a, b) * sort.dir || x.i - y.i;
      })
      .map((x) => x.r);
  }, [rows, sort]);

  function toggle(col: number) {
    setSort((s) => (s?.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));
  }

  function startResize(col: number, e: ReactPointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    e.stopPropagation();
    const total = tableRef.current?.getBoundingClientRect().width ?? 0;
    if (!total) return;
    // Work in percentages of the table, so the widths fit any screen size.
    const start =
      widths ??
      (() => {
        const px = headRefs.current.map((th) => th?.getBoundingClientRect().width ?? 0);
        const sum = px.reduce((a, b) => a + b, 0) || 1;
        return px.map((w) => (w / sum) * 100);
      })();
    const minPct = (MIN_WIDTH / total) * 100;
    const pair = start[col] + start[col + 1];
    const startX = e.clientX;
    const move = (ev: PointerEvent) => {
      const delta = ((ev.clientX - startX) / total) * 100;
      // Only this column and its right-hand neighbour change, so the total stays 100%.
      const left = Math.min(Math.max(start[col] + delta, minPct), pair - minPct);
      setWidths(start.map((w, i) => (i === col ? left : i === col + 1 ? pair - left : w)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function resetWidths() {
    setWidths(null);
  }

  const fixed = widths !== null;

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className={cn("divide-y divide-slate-200 text-sm", fixed ? "w-full table-fixed" : "min-w-full")}
        // On small screens the table may still scroll rather than squeeze columns below their minimum.
        style={fixed ? { minWidth: columns.length * MIN_WIDTH } : undefined}
      >
        {fixed && (
          <colgroup>
            {widths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
          </colgroup>
        )}
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c, i) => {
              const active = sort?.col === i;
              const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
              const label = c.sortable ? (
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 uppercase tracking-wide hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500",
                    active && "text-slate-900",
                  )}
                  title="Sort"
                >
                  <span className="truncate">{c.label}</span>
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", !active && "opacity-40")} aria-hidden />
                </button>
              ) : (
                <span className="truncate">{c.label}</span>
              );
              return (
                <th
                  key={i}
                  ref={(el) => {
                    headRefs.current[i] = el;
                  }}
                  scope="col"
                  aria-sort={c.sortable ? (active ? (sort.dir === 1 ? "ascending" : "descending") : "none") : undefined}
                  className={cn(
                    "relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap",
                    fixed && "overflow-hidden",
                    c.className,
                  )}
                >
                  {label}
                  {i < columns.length - 1 && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Drag to resize · double-click to reset"
                      onPointerDown={(e) => startResize(i, e)}
                      onDoubleClick={resetWidths}
                      className="group absolute inset-y-0 right-0 z-10 flex w-2 cursor-col-resize touch-none justify-center"
                    >
                      <span className="my-2 w-px bg-slate-200 group-hover:w-0.5 group-hover:bg-blue-500" />
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {sorted.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50/70">
              {r.cells.map((cell, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-4 py-3 text-slate-700 whitespace-nowrap",
                    fixed && "overflow-hidden text-ellipsis",
                    columns[i]?.className,
                    columns[i]?.cellClassName,
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
