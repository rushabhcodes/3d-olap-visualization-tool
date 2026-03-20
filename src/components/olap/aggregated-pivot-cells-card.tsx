import { TableProperties } from "lucide-react";

import { PivotTable } from "@/components/olap/pivot-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatasetSchema, DimensionKey, Measure, PivotCell } from "@/data/mock-cube";

type AggregatedPivotCellsCardProps = {
  schema: DatasetSchema;
  cells: PivotCell[];
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  measure: Measure;
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

export function AggregatedPivotCellsCard({
  schema,
  cells,
  xDimension,
  yDimension,
  zDimension,
  measure,
  activeCellId,
  hoveredCellId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
}: AggregatedPivotCellsCardProps) {
  return (
    <Card className="bg-white/85">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TableProperties className="h-5 w-5 text-cyan-700" />
          <CardTitle>Aggregated Pivot Cells</CardTitle>
        </div>
        <CardDescription>Tabular drill-down entry points for the current 3-axis pivot cube.</CardDescription>
      </CardHeader>
      <CardContent>
        <PivotTable
          schema={schema}
          cells={cells}
          xDimension={xDimension}
          yDimension={yDimension}
          zDimension={zDimension}
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
