import { Fragment, useEffect, useMemo, useState } from "react";

import {
  createMeasureScale,
  type DatasetSchema,
  formatMeasureValue,
  getDimensionLabel,
  getMeasureLabel,
  getMeasureMagnitudeRatio,
  getMeasureSignLabel,
  getMeasureSignedRatio,
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
  const [selectedYValue, setSelectedYValue] = useState(() =>
    yValues.includes("Actual") ? "Actual" : (yValues[0] ?? ""),
  );
  const cellMap = useMemo(() => new Map(cells.map((cell) => [cell.id, cell])), [cells]);
  const measureScale = useMemo(() => createMeasureScale(cells.map((cell) => cell.value)), [cells]);
  const visibleYValues = selectedYValue ? [selectedYValue] : [];

  useEffect(() => {
    setSelectedYValue((current) => {
      if (current && yValues.includes(current)) {
        return current;
      }

      return yValues.includes("Actual") ? "Actual" : (yValues[0] ?? "");
    });
  }, [yValues]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span>X axis: {getDimensionLabel(schema, xDimension)}</span>
        <span>Y axis: {getDimensionLabel(schema, yDimension)}</span>
        <span>Z axis: {getDimensionLabel(schema, zDimension)}</span>
        <span>
          Intensity: {getMeasureLabel(schema, measure)}
          {measureScale.hasNegative ? " magnitude with signed color" : ""}
        </span>
      </div>
      {yValues.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {getDimensionLabel(schema, yDimension)} tabs
          </p>
          <div className="flex flex-wrap gap-2">
            {yValues.map((yValue) => (
              <button
                key={`tab-${yValue}`}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selectedYValue === yValue
                    ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-900",
                )}
                onClick={() => setSelectedYValue(yValue)}
              >
                {yValue}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-5">
        {visibleYValues.map((yValue) => (
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
                      const intensity = cell ? getMeasureMagnitudeRatio(cell.value, measureScale) : 0;
                      const signedRatio = cell ? getMeasureSignedRatio(cell.value, measureScale) : 0;
                      const backgroundColor = cell
                        ? signedRatio < 0
                          ? `rgba(248, 113, 113, ${0.12 + intensity * 0.42})`
                          : signedRatio > 0
                            ? `rgba(34, 211, 238, ${0.1 + intensity * 0.38})`
                            : "rgba(226, 232, 240, 0.94)"
                        : "rgba(241, 245, 249, 0.9)";

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
                          style={{ backgroundColor }}
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
                            {cell
                              ? `${getMeasureSignLabel(cell.value)} ${Math.round(intensity * 100)}%`
                              : "Empty"}
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
