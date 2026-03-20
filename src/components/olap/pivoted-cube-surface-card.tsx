import { CubeScene } from "@/components/olap/cube-scene";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dimensionOptions, type DimensionKey, type Measure, type PivotCell } from "@/data/mock-cube";

function getDimensionLabel(dimension: DimensionKey) {
  return dimensionOptions.find((option) => option.key === dimension)?.label ?? dimension;
}

type PivotedCubeSurfaceCardProps = {
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  appliedSlices: string[];
  cells: PivotCell[];
  measure: Measure;
  xValues: string[];
  zValues: string[];
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

export function PivotedCubeSurfaceCard({
  xDimension,
  zDimension,
  appliedSlices,
  cells,
  measure,
  xValues,
  zValues,
  activeCellId,
  hoveredCellId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
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
          zDimension={zDimension}
          xValues={xValues}
          zValues={zValues}
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Drill Path</p>
            <p className="mt-2 text-sm text-slate-600">
              Click any block once to focus it and open the cube so its contributing fact rows appear as interior voxels.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Cross-Highlight</p>
            <p className="mt-2 text-sm text-slate-600">
              The cube, heatmap, and pivot table still share hover and selection state while the 3D view adds a separate drill camera.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Interior Detail</p>
            <p className="mt-2 text-sm text-slate-600">
              Open cells expose the month and scenario mix that feeds the selected aggregate, then the drill-down table shows the exact rows.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
