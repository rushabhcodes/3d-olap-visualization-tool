import { Boxes } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DatasetSchema,
  formatMeasureValue,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";

type CellDetailCardProps = {
  schema: DatasetSchema;
  selectedMeasure: Measure;
  activeDimensions: string[];
  hoveredCell: PivotCell | null;
  activeCell: PivotCell | null;
  availableValues: Record<DimensionKey, string[]>;
};

export function CellDetailCard({
  schema,
  selectedMeasure,
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
              Hover preview: {hoveredCell.xValue} / {hoveredCell.yValue} / {hoveredCell.zValue}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(schema.measures.length, 2)}, minmax(0, 1fr))` }}>
          {schema.measures.map((measureOption) => (
            <div key={measureOption.key} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">{measureOption.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
                {formatMeasureValue(activeCell?.totals[measureOption.key] ?? 0, measureOption.key, schema)}
              </p>
            </div>
          ))}
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
            {schema.dimensions.map((dimension) => (
              <div key={dimension.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{dimension.label}</p>
                <p className="mt-1 text-sm text-slate-700">{availableValues[dimension.key].length} members</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="font-medium text-slate-900">Primary Metric</p>
          <p className="mt-2 text-slate-500">
            The cube height and aggregate intensity currently follow {schema.measures.find((measure) => measure.key === selectedMeasure)?.label ?? selectedMeasure}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
