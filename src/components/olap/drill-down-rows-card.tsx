import { TableProperties } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMeasureValue, measureOptions, type CubeFact, type PivotCell } from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type DrillDownRowsCardProps = {
  activeCell: PivotCell | null;
  drilledCell: PivotCell | null;
  drillFacts: CubeFact[];
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
};

export function DrillDownRowsCard({
  activeCell,
  drilledCell,
  drillFacts,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
}: DrillDownRowsCardProps) {
  const interactionEnabled = drilledCell !== null;

  return (
    <Card className="bg-white/85">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TableProperties className="h-5 w-5 text-cyan-700" />
          <CardTitle>Drill-Down Rows</CardTitle>
        </div>
        <CardDescription>
          {drilledCell
            ? "Raw facts currently contributing to the drilled cube cell. Hover or click rows to stay synchronized with voxel selection."
            : activeCell
              ? "Raw facts currently contributing to the focused cube cell."
            : "Preview of the visible fact slice. Select a cell to narrow this table."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Scenario</th>
                {measureOptions.map((measureOption) => (
                  <th key={measureOption.key} className="px-4 py-3 font-medium">
                    {measureOption.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {drillFacts.map((fact, index) => (
                <tr
                  key={`${fact.month}-${fact.region}-${fact.productLine}-${fact.scenario}-${index}`}
                  className={cn(
                    interactionEnabled && "cursor-pointer transition hover:bg-sky-50",
                    selectedFactIndex === index && "bg-amber-50",
                    hoveredFactIndex === index && "bg-cyan-50 ring-1 ring-inset ring-cyan-300/60",
                  )}
                  onMouseEnter={() => {
                    if (interactionEnabled) {
                      onHoverFact(index);
                    }
                  }}
                  onMouseLeave={() => {
                    if (interactionEnabled) {
                      onLeaveFact();
                    }
                  }}
                  onClick={() => {
                    if (interactionEnabled) {
                      onSelectFact(index);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-slate-700">{fact.month}</td>
                  <td className="px-4 py-3 text-slate-600">{fact.region}</td>
                  <td className="px-4 py-3 text-slate-600">{fact.productLine}</td>
                  <td className="px-4 py-3 text-slate-600">{fact.scenario}</td>
                  {measureOptions.map((measureOption) => (
                    <td key={measureOption.key} className="px-4 py-3 text-slate-900">
                      {formatMeasureValue(fact[measureOption.factKey], measureOption.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {drillFacts.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    No rows match the current slice.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
