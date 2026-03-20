import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Boxes, Layers3, Sparkles } from "lucide-react";

import { AggregatedPivotCellsCard } from "@/components/olap/aggregated-pivot-cells-card";
import { CellDetailCard } from "@/components/olap/cell-detail-card";
import { DrillDownRowsCard } from "@/components/olap/drill-down-rows-card";
import { FilterPanel } from "@/components/olap/filter-panel";
import { PivotMatrixHeatmapCard } from "@/components/olap/pivot-matrix-heatmap-card";
import { PivotedCubeSurfaceCard } from "@/components/olap/pivoted-cube-surface-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  buildPivotCells,
  builtInDatasets,
  createEmptyFilters,
  type CsvColumnMapping,
  defaultBuiltInDatasetId,
  type DatasetSchema,
  type DimensionKey,
  formatMeasureValue,
  getBuiltInDataset,
  getCubeFieldOptions,
  getDimensionLabel,
  getDimensionValue,
  getMeasureLabel,
  getUniqueDimensionValues,
  hasCompleteCsvMapping,
  type Measure,
  parseMappedCubeFacts,
  suggestCsvColumnMapping,
  type CubeFact,
} from "@/data/mock-cube";

type PendingUpload = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  previewRows: Array<Record<string, unknown>>;
  mapping: CsvColumnMapping;
  parseErrors: string[];
};

function App() {
  const defaultBuiltInDataset = getBuiltInDataset(defaultBuiltInDatasetId);
  const [schema, setSchema] = useState<DatasetSchema>(defaultBuiltInDataset.schema);
  const [facts, setFacts] = useState<CubeFact[]>(defaultBuiltInDataset.facts);
  const [datasetLabel, setDatasetLabel] = useState(defaultBuiltInDataset.label);
  const [selectedBuiltInDatasetId, setSelectedBuiltInDatasetId] = useState<string | null>(
    defaultBuiltInDatasetId,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<Measure>(defaultBuiltInDataset.schema.defaultMeasure);
  const [xDimension, setXDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.x);
  const [yDimension, setYDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.y);
  const [zDimension, setZDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.z);
  const [filters, setFilters] = useState<Record<DimensionKey, string | "All">>(
    createEmptyFilters(defaultBuiltInDataset.schema),
  );
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [drilledCellId, setDrilledCellId] = useState<string | null>(null);
  const [hoveredFactIndex, setHoveredFactIndex] = useState<number | null>(null);
  const [selectedFactIndex, setSelectedFactIndex] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const availableValues = getUniqueDimensionValues(facts, schema);
  const filteredFacts = facts.filter((fact) =>
    schema.dimensions.every((dimension) => {
      const filterValue = filters[dimension.key];

      return filterValue === "All" || getDimensionValue(fact, dimension.key) === filterValue;
    }),
  );

  const pivot = buildPivotCells(filteredFacts, schema, xDimension, yDimension, zDimension, selectedMeasure);
  const activeCell = pivot.cells.find((cell) => cell.id === activeCellId) ?? pivot.cells[0] ?? null;
  const hoveredCell = pivot.cells.find((cell) => cell.id === hoveredCellId) ?? null;
  const drilledCell = pivot.cells.find((cell) => cell.id === drilledCellId) ?? null;

  useEffect(() => {
    setActiveCellId((current) => {
      if (current && pivot.cells.some((cell) => cell.id === current)) {
        return current;
      }

      return pivot.cells[0]?.id ?? null;
    });
  }, [pivot.cells]);

  useEffect(() => {
    setHoveredCellId((current) => {
      if (current && pivot.cells.some((cell) => cell.id === current)) {
        return current;
      }

      return null;
    });
  }, [pivot.cells]);

  useEffect(() => {
    setDrilledCellId((current) => {
      if (current && pivot.cells.some((cell) => cell.id === current)) {
        return current;
      }

      return null;
    });
  }, [pivot.cells]);

  useEffect(() => {
    const factCount = drilledCell?.facts.length ?? 0;

    setHoveredFactIndex((current) =>
      current !== null && current >= 0 && current < factCount ? current : null,
    );
    setSelectedFactIndex((current) =>
      current !== null && current >= 0 && current < factCount ? current : null,
    );
  }, [drilledCell?.id, drilledCell?.facts.length]);

  const totals = filteredFacts.reduce<Record<string, number>>((summary, fact) => {
    for (const measureOption of schema.measures) {
      summary[measureOption.key] = (summary[measureOption.key] ?? 0) + Number(fact[measureOption.key] ?? 0);
    }

    return summary;
  }, Object.fromEntries(schema.measures.map((measureOption) => [measureOption.key, 0])) as Record<string, number>);

  const activeDimensions =
    activeCell === null
      ? []
      : [
          `${getDimensionLabel(schema, xDimension)}: ${activeCell.xValue}`,
          `${getDimensionLabel(schema, yDimension)}: ${activeCell.yValue}`,
          `${getDimensionLabel(schema, zDimension)}: ${activeCell.zValue}`,
        ];

  const appliedSlices = schema.dimensions
    .filter((dimension) => filters[dimension.key] !== "All")
    .map((dimension) => `${dimension.label}: ${filters[dimension.key]}`);

  const drillFacts = (drilledCell ?? activeCell)?.facts ?? filteredFacts.slice(0, 8);

  function clearFactSelection() {
    setHoveredFactIndex(null);
    setSelectedFactIndex(null);
  }

  function resetInteractionState() {
    setActiveCellId(null);
    setHoveredCellId(null);
    setDrilledCellId(null);
    clearFactSelection();
  }

  function resetViewState(nextSchema: DatasetSchema = schema) {
    setFilters(createEmptyFilters(nextSchema));
    setSelectedMeasure(nextSchema.defaultMeasure);
    setXDimension(nextSchema.defaultAxes.x);
    setYDimension(nextSchema.defaultAxes.y);
    setZDimension(nextSchema.defaultAxes.z);
    resetInteractionState();
  }

  function handleLoadBuiltInDataset(datasetId: string) {
    const dataset = getBuiltInDataset(datasetId);

    setSchema(dataset.schema);
    setFacts(dataset.facts);
    setDatasetLabel(dataset.label);
    setSelectedBuiltInDatasetId(dataset.id);
    setUploadError(null);
    setPendingUpload(null);
    resetViewState(dataset.schema);
  }

  function handleSelectAggregateCell(id: string) {
    setActiveCellId(id);
    setDrilledCellId(null);
    clearFactSelection();
  }

  function handleToggleDrillCell(id: string) {
    setActiveCellId(id);
    setHoveredCellId(id);
    setDrilledCellId((current) => (current === id ? null : id));
    clearFactSelection();
  }

  function handleBackToAggregate() {
    setDrilledCellId(null);
    clearFactSelection();
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
      });
      const headers = Array.from(new Set((parsed.meta.fields ?? []).map((field) => field.trim()).filter(Boolean)));
      const rows = parsed.data.filter((row) =>
        Object.values(row).some((value) => String(value ?? "").trim() !== ""),
      );

      if (headers.length === 0) {
        setPendingUpload(null);
        setUploadError("CSV must include a header row.");
        return;
      }

      if (rows.length === 0) {
        setPendingUpload(null);
        setUploadError("CSV must include at least one data row.");
        return;
      }

      setPendingUpload({
        fileName: file.name,
        headers,
        rows,
        previewRows: rows.slice(0, 3),
        mapping: suggestCsvColumnMapping(headers, schema),
        parseErrors: parsed.errors.map((error) => {
          const rowLabel = typeof error.row === "number" ? `Row ${error.row + 2}` : "CSV";

          return `${rowLabel}: ${error.message}`;
        }),
      });
      setUploadError(null);
    } catch (error) {
      setPendingUpload(null);
      setUploadError(error instanceof Error ? error.message : "CSV upload failed.");
    }
  }

  function handleMappingChange(field: string, header: string) {
    setPendingUpload((current) => {
      if (!current) {
        return current;
      }

      const nextMapping = {
        ...current.mapping,
        [field]: header,
      };

      if (header !== "") {
        for (const cubeField of getCubeFieldOptions(schema).map((option) => option.key)) {
          if (cubeField !== field && nextMapping[cubeField] === header) {
            nextMapping[cubeField] = "";
          }
        }
      }

      return {
        ...current,
        mapping: nextMapping,
      };
    });
  }

  function handleApplyUpload() {
    if (!pendingUpload || !hasCompleteCsvMapping(schema, pendingUpload.mapping)) {
      return;
    }

    const parsed = parseMappedCubeFacts(pendingUpload.rows, schema, pendingUpload.mapping);

    if (parsed.facts.length === 0) {
      setUploadError(parsed.errors.join(" "));
      return;
    }

    setFacts(parsed.facts);
    setDatasetLabel(pendingUpload.fileName);
    setSelectedBuiltInDatasetId(null);
    resetViewState(schema);
    setPendingUpload(null);

    const warnings = [...pendingUpload.parseErrors, ...parsed.errors];

    setUploadError(
      warnings.length > 0
        ? `Loaded ${parsed.facts.length} rows with ${warnings.length} warning(s). ${warnings[0]}`
        : null,
    );
  }

  function handleCancelUpload() {
    setPendingUpload(null);
    setUploadError(null);
  }

  function handleResetDataset() {
    handleLoadBuiltInDataset(defaultBuiltInDatasetId);
  }

  function handleAxisChange(axis: "x" | "y" | "z", value: DimensionKey) {
    const nextAxes = {
      x: xDimension,
      y: yDimension,
      z: zDimension,
    };

    const conflictingAxis = (Object.entries(nextAxes) as Array<[keyof typeof nextAxes, DimensionKey]>).find(
      ([key, currentValue]) => key !== axis && currentValue === value,
    )?.[0];

    if (conflictingAxis) {
      nextAxes[conflictingAxis] = nextAxes[axis];
    }

    nextAxes[axis] = value;

    setXDimension(nextAxes.x);
    setYDimension(nextAxes.y);
    setZDimension(nextAxes.z);
  }

  function handleSwapAxes() {
    setXDimension(zDimension);
    setZDimension(xDimension);
  }

  function handleResetView() {
    resetViewState();
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.1),transparent_24%)]" />
      <div className="absolute inset-0 z-0 bg-grid bg-[size:42px_42px] opacity-40" />
      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-glow backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit bg-cyan-100 text-[11px] text-cyan-800">
                Interactive 3D OLAP Workspace
              </Badge>
              <div className="space-y-1">
                <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Pivot multidimensional data into a navigable 3D cube.
                </h1>
                <p className="max-w-2xl text-xs text-slate-600 sm:text-sm">
                  Upload CSV data, remap the cube axes, slice dimensions independently, and
                  select any aggregated cell to inspect the underlying records.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="bg-cyan-600 text-white hover:bg-cyan-500" onClick={handleResetView}>
                <Sparkles className="mr-2 h-4 w-4" />
                Reset View
              </Button>
              <Button variant="outline" className="border-slate-200 bg-white" onClick={handleResetDataset}>
                <Boxes className="mr-2 h-4 w-4" />
                Load Default Dataset
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.9fr_1.35fr_1.35fr_0.8fr]">
          <Card className="bg-white/85">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="space-y-1">
                <CardDescription className="text-[11px] uppercase tracking-[0.16em]">Active Measure</CardDescription>
                <CardTitle className="text-base">{getMeasureLabel(schema, selectedMeasure)}</CardTitle>
                <p className="text-xl font-semibold">
                  {formatMeasureValue(Number(totals[selectedMeasure] ?? 0), selectedMeasure, schema)}
                </p>
              </div>
              <Layers3 className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardContent className="space-y-1 p-4">
              <CardDescription className="text-[11px] uppercase tracking-[0.16em]">Visible Cube Cells</CardDescription>
              <CardTitle className="text-xl">{pivot.cells.length}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {getDimensionLabel(schema, xDimension)} by {getDimensionLabel(schema, yDimension)} by {getDimensionLabel(schema, zDimension)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardContent className="space-y-1 p-4">
              <CardDescription className="text-[11px] uppercase tracking-[0.16em]">Visible Fact Rows</CardDescription>
              <CardTitle className="text-xl">{filteredFacts.length}</CardTitle>
              <p className="truncate text-xs text-muted-foreground" title={datasetLabel}>
                {datasetLabel}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardContent className="space-y-1 p-4">
              <CardDescription className="text-[11px] uppercase tracking-[0.16em]">Focused Cell</CardDescription>
              <CardTitle className="text-xl">
                {activeCell ? formatMeasureValue(activeCell.value, selectedMeasure, schema) : "None"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeCell ? `${activeCell.count} contributing row(s)` : "Select a pivot cell to inspect it."}
              </p>
            </CardContent>
          </Card>

          <FilterPanel
            builtInDatasets={builtInDatasets}
            selectedBuiltInDatasetId={selectedBuiltInDatasetId}
            schema={schema}
            selectedMeasure={selectedMeasure}
            xDimension={xDimension}
            yDimension={yDimension}
            zDimension={zDimension}
            filters={filters}
            availableValues={availableValues}
            datasetLabel={datasetLabel}
            recordCount={facts.length}
            uploadError={uploadError}
            pendingUpload={pendingUpload}
            onMeasureChange={setSelectedMeasure}
            onAxisChange={handleAxisChange}
            onSwapAxes={handleSwapAxes}
            onFilterChange={(dimension, value) => {
              setFilters((current) => ({
                ...current,
                [dimension]: value,
              }));
            }}
            onUpload={handleUpload}
            onMappingChange={handleMappingChange}
            onApplyUpload={handleApplyUpload}
            onCancelUpload={handleCancelUpload}
            onLoadBuiltInDataset={handleLoadBuiltInDataset}
            onResetDataset={handleResetDataset}
          />

          <div className="grid min-w-0 gap-6 xl:col-span-2">
            <PivotedCubeSurfaceCard
              schema={schema}
              xDimension={xDimension}
              yDimension={yDimension}
              zDimension={zDimension}
              appliedSlices={appliedSlices}
              cells={pivot.cells}
              measure={selectedMeasure}
              xValues={pivot.xValues}
              yValues={pivot.yValues}
              zValues={pivot.zValues}
              activeCellId={activeCell?.id ?? null}
              hoveredCellId={hoveredCell?.id ?? null}
              drilledCellId={drilledCell?.id ?? null}
              hoveredFactIndex={hoveredFactIndex}
              selectedFactIndex={selectedFactIndex}
              onHoverCell={setHoveredCellId}
              onLeaveCell={() => setHoveredCellId(null)}
              onSelectCell={handleSelectAggregateCell}
              onToggleDrillCell={handleToggleDrillCell}
              onBackToAggregate={handleBackToAggregate}
              onHoverFact={setHoveredFactIndex}
              onLeaveFact={() => setHoveredFactIndex(null)}
              onSelectFact={setSelectedFactIndex}
            />
            <PivotMatrixHeatmapCard
              schema={schema}
              cells={pivot.cells}
              xDimension={xDimension}
              yDimension={yDimension}
              zDimension={zDimension}
              xValues={pivot.xValues}
              yValues={pivot.yValues}
              zValues={pivot.zValues}
              measure={selectedMeasure}
              activeCellId={activeCell?.id ?? null}
              hoveredCellId={hoveredCell?.id ?? null}
              onHoverCell={setHoveredCellId}
              onLeaveCell={() => setHoveredCellId(null)}
              onSelectCell={handleSelectAggregateCell}
            />
            <AggregatedPivotCellsCard
              schema={schema}
              cells={pivot.cells}
              xDimension={xDimension}
              yDimension={yDimension}
              zDimension={zDimension}
              measure={selectedMeasure}
              activeCellId={activeCell?.id ?? null}
              hoveredCellId={hoveredCell?.id ?? null}
              onHoverCell={setHoveredCellId}
              onLeaveCell={() => setHoveredCellId(null)}
              onSelectCell={handleSelectAggregateCell}
            />
            <DrillDownRowsCard
              schema={schema}
              activeCell={activeCell}
              drilledCell={drilledCell}
              drillFacts={drillFacts}
              hoveredFactIndex={hoveredFactIndex}
              selectedFactIndex={selectedFactIndex}
              onHoverFact={setHoveredFactIndex}
              onLeaveFact={() => setHoveredFactIndex(null)}
              onSelectFact={setSelectedFactIndex}
            />
          </div>

          <div className="grid min-w-0 gap-6 xl:col-span-1">
            <CellDetailCard
              schema={schema}
              selectedMeasure={selectedMeasure}
              activeDimensions={activeDimensions}
              hoveredCell={hoveredCell}
              activeCell={activeCell}
              availableValues={availableValues}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
