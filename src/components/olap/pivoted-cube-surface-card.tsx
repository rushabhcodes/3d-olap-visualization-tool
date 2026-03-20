import { CubeScene } from "@/components/olap/cube-scene";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDimensionLabel, type DimensionKey, type Measure, type PivotCell } from "@/data/mock-cube";

type PivotedCubeSurfaceCardProps = {
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  appliedSlices: string[];
  cells: PivotCell[];
  measure: Measure;
  xValues: string[];
  yValues: string[];
  zValues: string[];
  activeCellId: string | null;
  hoveredCellId: string | null;
  drilledCellId: string | null;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
  onToggleDrillCell: (id: string) => void;
  onBackToAggregate: () => void;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
};

export function PivotedCubeSurfaceCard({
  xDimension,
  yDimension,
  zDimension,
  appliedSlices,
  cells,
  measure,
  xValues,
  yValues,
  zValues,
  activeCellId,
  hoveredCellId,
  drilledCellId,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
  onToggleDrillCell,
  onBackToAggregate,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
}: PivotedCubeSurfaceCardProps) {
  return (
    <Card className="bg-white/85">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Pivoted Cube Surface</CardTitle>
          <CardDescription>
            Click a cube block to drill it open, inspect the contributing voxels, and keep the same pivot cell in sync across the workspace.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-slate-200 text-slate-700">
            X: {getDimensionLabel(xDimension)}
          </Badge>
          <Badge variant="outline" className="border-slate-200 text-slate-700">
            Y: {getDimensionLabel(yDimension)}
          </Badge>
          <Badge variant="outline" className="border-slate-200 text-slate-700">
            Z: {getDimensionLabel(zDimension)}
          </Badge>
          {appliedSlices.length === 0 ? (
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              No slices
            </Badge>
          ) : (
            appliedSlices.map((slice) => (
              <Badge key={slice} variant="outline" className="border-slate-200 text-slate-700">
                {slice}
              </Badge>
            ))
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CubeScene
          cells={cells}
          measure={measure}
          xDimension={xDimension}
          yDimension={yDimension}
          zDimension={zDimension}
          xValues={xValues}
          yValues={yValues}
          zValues={zValues}
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          drilledCellId={drilledCellId}
          hoveredFactIndex={hoveredFactIndex}
          selectedFactIndex={selectedFactIndex}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
          onToggleDrillCell={onToggleDrillCell}
          onBackToAggregate={onBackToAggregate}
          onHoverFact={onHoverFact}
          onLeaveFact={onLeaveFact}
          onSelectFact={onSelectFact}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Drill Path</p>
            <p className="mt-2 text-sm text-slate-600">
              Click any block once to focus it and open the cube so its contributing fact rows appear as interior voxels. Press Esc to return to the aggregate view.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Cross-Highlight</p>
            <p className="mt-2 text-sm text-slate-600">
              Aggregate highlights stay synchronized with the heatmap and pivot table while drilled fact rows stay synchronized with the row table.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Pinned Fact</p>
            <p className="mt-2 text-sm text-slate-600">
              Click an interior voxel to pin compact metadata, then use the arrow keys to move to spatial neighbors instead of stepping by raw row order.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
