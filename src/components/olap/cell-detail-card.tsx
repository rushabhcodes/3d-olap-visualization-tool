import { Boxes } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dimensionOptions,
  formatMeasureValue,
  type DimensionKey,
  type PivotCell,
} from "@/data/mock-cube";

type CellDetailCardProps = {
  activeDimensions: string[];
  hoveredCell: PivotCell | null;
  activeCell: PivotCell | null;
  availableValues: Record<DimensionKey, string[]>;
};

export function CellDetailCard({
  activeDimensions,
  hoveredCell,
  activeCell,
  availableValues,
}: CellDetailCardProps) {
  return (
    <Card className="min-w-0 bg-white/85">
      <CardHeader className="space-y-2 p-4 pb-0">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-cyan-700" />
          <CardTitle className="text-base">Cell Detail</CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          Totals and member values for the current focused intersection.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3 p-4 pt-3 text-xs text-slate-600 sm:text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="font-medium text-slate-900">Coordinates</p>
          <div className="mt-3 space-y-2">
            {activeDimensions.length > 0 ? (
              activeDimensions.map((value) => (
                <div
                  key={value}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700"
                >
                  {value}
                </div>
              ))
            ) : (
              <p className="text-slate-500">Select a cube cell to see its coordinates.</p>
            )}
          </div>
          {hoveredCell && hoveredCell.id !== activeCell?.id ? (
            <p className="mt-3 text-xs text-cyan-700">
              Hover preview: {hoveredCell.xValue} / {hoveredCell.zValue}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Revenue</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              {formatMeasureValue(activeCell?.totals.Revenue ?? 0, "Revenue")}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Margin</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              {formatMeasureValue(activeCell?.totals.Margin ?? 0, "Margin")}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Units</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              {formatMeasureValue(activeCell?.totals.Units ?? 0, "Units")}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="font-medium text-slate-900">Contributing Fact Rows</p>
          <p className="mt-2 text-slate-500">
            {activeCell ? `${activeCell.count} row(s) contribute to this cell.` : "No active cell selected."}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="font-medium text-slate-900">Dimension Inventory</p>
          <div className="mt-3 grid gap-2">
            {dimensionOptions.map((dimension) => (
              <div key={dimension.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{dimension.label}</p>
                <p className="mt-1 text-sm text-slate-700">{availableValues[dimension.key].length} members</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
