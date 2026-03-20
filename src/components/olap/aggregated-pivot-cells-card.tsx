import { TableProperties } from "lucide-react";

import { PivotTable } from "@/components/olap/pivot-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DimensionKey, Measure, PivotCell } from "@/data/mock-cube";

type AggregatedPivotCellsCardProps = {
  cells: PivotCell[];
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  measure: Measure;
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

export function AggregatedPivotCellsCard({
  cells,
  xDimension,
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
        <CardDescription>Tabular drill-down entry points for the current pivot surface.</CardDescription>
      </CardHeader>
      <CardContent>
        <PivotTable
          cells={cells}
          xDimension={xDimension}
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
