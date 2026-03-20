import { Fragment } from "react";

import {
  type DatasetSchema,
  formatMeasureValue,
  getDimensionLabel,
  getMeasureLabel,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type PivotHeatmapProps = {
  schema: DatasetSchema;
  cells: PivotCell[];
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  xValues: string[];
  yValues: string[];
  zValues: string[];
  measure: Measure;
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

export function PivotHeatmap({
  schema,
  cells,
  xDimension,
  yDimension,
  zDimension,
  xValues,
  yValues,
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
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span>X axis: {getDimensionLabel(schema, xDimension)}</span>
        <span>Y axis: {getDimensionLabel(schema, yDimension)}</span>
        <span>Z axis: {getDimensionLabel(schema, zDimension)}</span>
        <span>Intensity: {getMeasureLabel(schema, measure)}</span>
      </div>
      <div className="space-y-5">
        {yValues.map((yValue) => (
            <div key={yValue} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">{getDimensionLabel(schema, yDimension)}:</span>
                <span>{yValue}</span>
              </div>
            <div className="overflow-x-auto">
              <div
                className="grid min-w-max gap-2"
                style={{
                  gridTemplateColumns: `180px repeat(${Math.max(xValues.length, 1)}, minmax(96px, 1fr))`,
                }}
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  {getDimensionLabel(schema, zDimension)}
                </div>
                {xValues.map((xValue) => (
                  <div
                    key={`${yValue}-header-${xValue}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-500"
                  >
                    {xValue}
                  </div>
                ))}
                {zValues.map((zValue) => (
                  <Fragment key={`${yValue}-${zValue}`}>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      {zValue}
                    </div>
                    {xValues.map((xValue) => {
                      const cell = cellMap.get(`${xValue}:::${yValue}:::${zValue}`);
                      const active = cell?.id === activeCellId;
                      const hovered = cell?.id === hoveredCellId;
                      const intensity = cell ? cell.value / maxValue : 0;

                      return (
                        <button
                          key={`${xValue}-${yValue}-${zValue}`}
                          type="button"
                          className={cn(
                            "group flex min-h-24 flex-col justify-between rounded-xl border px-3 py-3 text-left transition",
                            cell ? "border-slate-200 hover:-translate-y-0.5" : "cursor-default border-slate-200 opacity-60",
                            active && "border-amber-300/80 shadow-[0_0_0_1px_rgba(252,211,77,0.3)]",
                            hovered && "border-cyan-300/80 shadow-[0_0_0_1px_rgba(34,211,238,0.28)]",
                          )}
                          disabled={!cell}
                          style={{
                            backgroundColor: cell
                              ? `rgba(34, 211, 238, ${0.1 + intensity * 0.38})`
                              : "rgba(241, 245, 249, 0.9)",
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
                          <span className="text-xs uppercase tracking-[0.12em] text-slate-700">
                            {cell ? `${Math.round(intensity * 100)}%` : "Empty"}
                          </span>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {cell ? formatMeasureValue(cell.value, measure, schema) : "-"}
                            </p>
                            <p className="text-xs text-slate-600">{cell ? `${cell.count} contributing row(s)` : ""}</p>
                          </div>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
