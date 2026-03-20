import { Layers3 } from "lucide-react";

import { PivotHeatmap } from "@/components/olap/pivot-heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatasetSchema, DimensionKey, Measure, PivotCell } from "@/data/mock-cube";

type PivotMatrixHeatmapCardProps = {
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

export function PivotMatrixHeatmapCard({
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
}: PivotMatrixHeatmapCardProps) {
  return (
    <Card className="bg-white/85">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-cyan-700" />
          <CardTitle>Pivot Matrix Heatmap</CardTitle>
        </div>
        <CardDescription>
          A faceted matrix view of the same 3-axis cube. Hover and click behavior is synchronized with the 3D cube and pivot table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PivotHeatmap
          schema={schema}
          cells={cells}
          xDimension={xDimension}
          yDimension={yDimension}
          zDimension={zDimension}
          xValues={xValues}
          yValues={yValues}
          zValues={zValues}
          measure={measure}
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
        />
      </CardContent>
    </Card>
  );
}
