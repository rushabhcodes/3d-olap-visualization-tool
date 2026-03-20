import { type DimensionKey, type Measure, type PivotCell, formatMeasureValue } from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type PivotTableProps = {
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

function getDimensionLabel(dimension: DimensionKey) {
  switch (dimension) {
    case "region":
      return "Region";
    case "productLine":
      return "Product Line";
    case "scenario":
      return "Scenario";
    case "month":
      return "Month";
    default:
      return dimension;
  }
}

export function PivotTable({
  cells,
  xDimension,
  zDimension,
  measure,
  activeCellId,
  hoveredCellId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
}: PivotTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/90 text-slate-300">
          <tr>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(xDimension)}</th>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(zDimension)}</th>
            <th className="px-4 py-3 font-medium">{measure}</th>
            <th className="px-4 py-3 font-medium">Rows</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/80">
          {cells.map((cell) => (
            <tr
              key={cell.id}
              className={cn(
                "cursor-pointer transition hover:bg-slate-900/80",
                activeCellId === cell.id && "bg-cyan-500/10",
                hoveredCellId === cell.id && "bg-cyan-400/15 ring-1 ring-inset ring-cyan-400/40",
              )}
              onMouseEnter={() => onHoverCell(cell.id)}
              onMouseLeave={onLeaveCell}
              onClick={() => onSelectCell(cell.id)}
            >
              <td className="px-4 py-3 text-slate-100">{cell.xValue}</td>
              <td className="px-4 py-3 text-slate-300">{cell.zValue}</td>
              <td className="px-4 py-3 text-slate-100">{formatMeasureValue(cell.value, measure)}</td>
              <td className="px-4 py-3 text-slate-300">{cell.count}</td>
            </tr>
          ))}
          {cells.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                No aggregated cells match the current slice.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
