import { Fragment } from "react";

import { type DimensionKey, type Measure, type PivotCell, formatMeasureValue } from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type PivotHeatmapProps = {
  cells: PivotCell[];
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  xValues: string[];
  zValues: string[];
  measure: Measure;
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

function getDimensionLabel(dimension: DimensionKey) {
  switch (dimension) {
    case "region":
      return "Region";
    case "productLine":
      return "Product Line";
    case "scenario":
      return "Scenario";
    case "month":
      return "Month";
    default:
      return dimension;
  }
}

export function PivotHeatmap({
  cells,
  xDimension,
  zDimension,
  xValues,
  zValues,
  measure,
  activeCellId,
  hoveredCellId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
}: PivotHeatmapProps) {
  const cellMap = new Map(cells.map((cell) => [cell.id, cell]));
  const maxValue = Math.max(...cells.map((cell) => cell.value), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span>X axis: {getDimensionLabel(xDimension)}</span>
        <span>Z axis: {getDimensionLabel(zDimension)}</span>
        <span>Intensity: {measure}</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max gap-2"
          style={{
            gridTemplateColumns: `180px repeat(${Math.max(xValues.length, 1)}, minmax(96px, 1fr))`,
          }}
        >
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {getDimensionLabel(zDimension)}
          </div>
          {xValues.map((xValue) => (
            <div
              key={`header-${xValue}`}
              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-400"
            >
              {xValue}
            </div>
          ))}
          {zValues.map((zValue) => (
            <Fragment key={zValue}>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {zValue}
              </div>
              {xValues.map((xValue) => {
                const cell = cellMap.get(`${xValue}:::${zValue}`);
                const active = cell?.id === activeCellId;
                const hovered = cell?.id === hoveredCellId;
                const intensity = cell ? cell.value / maxValue : 0;

                return (
                  <button
                    key={`${xValue}-${zValue}`}
                    type="button"
                    className={cn(
                      "group flex min-h-24 flex-col justify-between rounded-xl border px-3 py-3 text-left transition",
                      cell ? "border-slate-800 hover:-translate-y-0.5" : "cursor-default border-slate-900 opacity-60",
                      active && "border-amber-300/70 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]",
                      hovered && "border-cyan-300/70 shadow-[0_0_0_1px_rgba(34,211,238,0.3)]",
                    )}
                    disabled={!cell}
                    style={{
                      backgroundColor: cell
                        ? `rgba(34, 211, 238, ${0.14 + intensity * 0.6})`
                        : "rgba(15, 23, 42, 0.55)",
                    }}
                    onMouseEnter={() => {
                      if (cell) {
                        onHoverCell(cell.id);
                      }
                    }}
                    onMouseLeave={onLeaveCell}
                    onFocus={() => {
                      if (cell) {
                        onHoverCell(cell.id);
                      }
                    }}
                    onBlur={onLeaveCell}
                    onClick={() => {
                      if (cell) {
                        onSelectCell(cell.id);
                      }
                    }}
                  >
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-900/80">
                      {cell ? `${Math.round(intensity * 100)}%` : "Empty"}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {cell ? formatMeasureValue(cell.value, measure) : "-"}
                      </p>
                      <p className="text-xs text-slate-950/80">{cell ? `${cell.count} contributing row(s)` : ""}</p>
                    </div>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
