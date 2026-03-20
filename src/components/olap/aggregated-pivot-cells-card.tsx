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
  drilledCellId: string | null;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
  onActivateFact: (cellId: string, factIndex: number) => void;
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
  drilledCellId,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
  onActivateFact,
}: AggregatedPivotCellsCardProps) {
  return (
    <Card className="bg-white/85">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TableProperties className="h-5 w-5 text-cyan-700" />
          <CardTitle>Pivot Explorer</CardTitle>
        </div>
        <CardDescription>Aggregate cells and their contributing fact rows in one expandable table.</CardDescription>
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
          drilledCellId={drilledCellId}
          hoveredFactIndex={hoveredFactIndex}
          selectedFactIndex={selectedFactIndex}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
          onHoverFact={onHoverFact}
          onLeaveFact={onLeaveFact}
          onSelectFact={onSelectFact}
          onActivateFact={onActivateFact}
        />
      </CardContent>
    </Card>
  );
}
