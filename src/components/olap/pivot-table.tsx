import { Fragment } from "react";

import {
  type CubeFact,
  type DatasetSchema,
  formatMeasureValue,
  getDimensionLabel,
  getMeasureLabel,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type PivotTableProps = {
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

export function PivotTable({
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
}: PivotTableProps) {
  const expandedCellId = drilledCellId ?? activeCellId;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(schema, xDimension)}</th>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(schema, yDimension)}</th>
            <th className="px-4 py-3 font-medium">{getDimensionLabel(schema, zDimension)}</th>
            <th className="px-4 py-3 font-medium">{getMeasureLabel(schema, measure)}</th>
            <th className="px-4 py-3 font-medium">Rows</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {cells.map((cell) => {
            const expanded = expandedCellId === cell.id;
            const interactionEnabled = drilledCellId === cell.id;

            return (
              <Fragment key={cell.id}>
                <tr
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
                  <td className="px-4 py-3 text-slate-900">{formatMeasureValue(cell.value, measure, schema)}</td>
                  <td className="px-4 py-3 text-slate-600">{cell.count}</td>
                </tr>
                {expanded ? (
                  <tr className="bg-slate-50/80">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
                          {interactionEnabled
                            ? "Contributing fact rows for the drilled cell. Hover or click rows to stay synchronized with voxel selection."
                            : "Contributing fact rows for the selected aggregate cell."}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                {schema.dimensions.map((dimension) => (
                                  <th key={dimension.key} className="px-4 py-3 font-medium">
                                    {dimension.label}
                                  </th>
                                ))}
                                {schema.measures.map((measureOption) => (
                                  <th key={measureOption.key} className="px-4 py-3 font-medium">
                                    {measureOption.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {cell.facts.map((fact, index) => (
                                <FactRow
                                  key={`${cell.id}-fact-${index}`}
                                  fact={fact}
                                  factIndex={index}
                                  schema={schema}
                                  interactionEnabled={interactionEnabled}
                                  hoveredFactIndex={hoveredFactIndex}
                                  selectedFactIndex={selectedFactIndex}
                                  onHoverFact={onHoverFact}
                                  onLeaveFact={onLeaveFact}
                                  onSelectFact={onSelectFact}
                                  onActivateFact={(factIndex) => onActivateFact(cell.id, factIndex)}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
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

function FactRow({
  fact,
  factIndex,
  schema,
  interactionEnabled,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
  onActivateFact,
}: {
  fact: CubeFact;
  factIndex: number;
  schema: DatasetSchema;
  interactionEnabled: boolean;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
  onActivateFact: (factIndex: number) => void;
}) {
  return (
    <tr
      className={cn(
        "cursor-pointer transition hover:bg-sky-50",
        selectedFactIndex === factIndex && "bg-amber-50",
        hoveredFactIndex === factIndex && "bg-cyan-50 ring-1 ring-inset ring-cyan-300/60",
      )}
      onMouseEnter={() => {
        if (interactionEnabled) {
          onHoverFact(factIndex);
        }
      }}
      onMouseLeave={() => {
        if (interactionEnabled) {
          onLeaveFact();
        }
      }}
      onClick={() => {
        if (interactionEnabled) {
          onSelectFact(factIndex);
          return;
        }

        onActivateFact(factIndex);
      }}
    >
      {schema.dimensions.map((dimension, dimensionIndex) => (
        <td
          key={dimension.key}
          className={dimensionIndex === 0 ? "px-4 py-3 text-slate-700" : "px-4 py-3 text-slate-600"}
        >
          {String(fact[dimension.key] ?? "")}
        </td>
      ))}
      {schema.measures.map((measureOption) => (
        <td key={measureOption.key} className="px-4 py-3 text-slate-900">
          {formatMeasureValue(Number(fact[measureOption.key] ?? 0), measureOption.key, schema)}
        </td>
      ))}
    </tr>
  );
}
