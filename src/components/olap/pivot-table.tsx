import {
  formatMeasureValue,
  getDimensionLabel,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type PivotTableProps = {
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

export function PivotTable({
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
}: PivotTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(xDimension)}</th>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(yDimension)}</th>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(zDimension)}</th>
            <th className="px-4 py-3 font-medium">{measure}</th>
            <th className="px-4 py-3 font-medium">Rows</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {cells.map((cell) => (
            <tr
              key={cell.id}
              className={cn(
                "cursor-pointer transition hover:bg-sky-50",
                activeCellId === cell.id && "bg-amber-50",
                hoveredCellId === cell.id && "bg-cyan-50 ring-1 ring-inset ring-cyan-300/60",
              )}
              onMouseEnter={() => onHoverCell(cell.id)}
              onMouseLeave={onLeaveCell}
              onClick={() => onSelectCell(cell.id)}
            >
              <td className="px-4 py-3 text-slate-900">{cell.xValue}</td>
              <td className="px-4 py-3 text-slate-600">{cell.yValue}</td>
              <td className="px-4 py-3 text-slate-600">{cell.zValue}</td>
              <td className="px-4 py-3 text-slate-900">{formatMeasureValue(cell.value, measure)}</td>
              <td className="px-4 py-3 text-slate-600">{cell.count}</td>
            </tr>
          ))}
          {cells.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                No aggregated cells match the current slice.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
