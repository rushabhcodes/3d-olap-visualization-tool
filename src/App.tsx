import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Boxes, Layers3, Sparkles, TableProperties } from "lucide-react";

import { CubeScene } from "@/components/olap/cube-scene";
import { FilterPanel } from "@/components/olap/filter-panel";
import { PivotHeatmap } from "@/components/olap/pivot-heatmap";
import { PivotTable } from "@/components/olap/pivot-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPivotCells,
  cubeFieldOptions,
  createEmptyFilters,
  type CsvColumnMapping,
  cubeFacts,
  dimensionOptions,
  type DimensionKey,
  formatMeasureValue,
  getDimensionValue,
  getUniqueDimensionValues,
  hasCompleteCsvMapping,
  type Measure,
  parseMappedCubeFacts,
  suggestCsvColumnMapping,
  type CubeFact,
} from "@/data/mock-cube";

function getDimensionLabel(dimension: DimensionKey) {
  return dimensionOptions.find((option) => option.key === dimension)?.label ?? dimension;
}

type PendingUpload = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  previewRows: Array<Record<string, unknown>>;
  mapping: CsvColumnMapping;
  parseErrors: string[];
};

function App() {
  const [facts, setFacts] = useState<CubeFact[]>(cubeFacts);
  const [datasetLabel, setDatasetLabel] = useState("Built-in demo cube");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<Measure>("Revenue");
  const [xDimension, setXDimension] = useState<DimensionKey>("region");
  const [zDimension, setZDimension] = useState<DimensionKey>("productLine");
  const [filters, setFilters] = useState<Record<DimensionKey, string | "All">>(createEmptyFilters());
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const availableValues = getUniqueDimensionValues(facts);
  const filteredFacts = facts.filter((fact) =>
    dimensionOptions.every((dimension) => {
      const filterValue = filters[dimension.key];

      return filterValue === "All" || getDimensionValue(fact, dimension.key) === filterValue;
    }),
  );

  const pivot = buildPivotCells(filteredFacts, xDimension, zDimension, selectedMeasure);
  const activeCell = pivot.cells.find((cell) => cell.id === activeCellId) ?? pivot.cells[0] ?? null;
  const hoveredCell = pivot.cells.find((cell) => cell.id === hoveredCellId) ?? null;

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

  const totals = filteredFacts.reduce(
    (summary, fact) => ({
      Revenue: summary.Revenue + fact.revenue,
      Margin: summary.Margin + fact.margin,
      Units: summary.Units + fact.units,
    }),
    { Revenue: 0, Margin: 0, Units: 0 },
  );

  const activeDimensions =
    activeCell === null
      ? []
      : [
          `${getDimensionLabel(xDimension)}: ${activeCell.xValue}`,
          `${getDimensionLabel(zDimension)}: ${activeCell.zValue}`,
        ];

  const appliedSlices = dimensionOptions
    .filter((dimension) => filters[dimension.key] !== "All")
    .map((dimension) => `${dimension.label}: ${filters[dimension.key]}`);

  const drillFacts = activeCell?.facts ?? filteredFacts.slice(0, 8);

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
        mapping: suggestCsvColumnMapping(headers),
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

  function handleMappingChange(field: keyof CubeFact, header: string) {
    setPendingUpload((current) => {
      if (!current) {
        return current;
      }

      const nextMapping = {
        ...current.mapping,
        [field]: header,
      };

      if (header !== "") {
        for (const cubeField of cubeFieldOptions.map((option) => option.key)) {
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
    if (!pendingUpload || !hasCompleteCsvMapping(pendingUpload.mapping)) {
      return;
    }

    const parsed = parseMappedCubeFacts(pendingUpload.rows, pendingUpload.mapping);

    if (parsed.facts.length === 0) {
      setUploadError(parsed.errors.join(" "));
      return;
    }

    setFacts(parsed.facts);
    setDatasetLabel(pendingUpload.fileName);
    setFilters(createEmptyFilters());
    setActiveCellId(null);
    setHoveredCellId(null);
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
    setFacts(cubeFacts);
    setDatasetLabel("Built-in demo cube");
    setUploadError(null);
    setPendingUpload(null);
    setFilters(createEmptyFilters());
    setSelectedMeasure("Revenue");
    setXDimension("region");
    setZDimension("productLine");
    setActiveCellId(null);
    setHoveredCellId(null);
  }

  function handleAxisChange(axis: "x" | "z", value: DimensionKey) {
    if (axis === "x") {
      if (value === zDimension) {
        setZDimension(xDimension);
      }

      setXDimension(value);
      return;
    }

    if (value === xDimension) {
      setXDimension(zDimension);
    }

    setZDimension(value);
  }

  function handleSwapAxes() {
    setXDimension(zDimension);
    setZDimension(xDimension);
  }

  function handleResetView() {
    setFilters(createEmptyFilters());
    setSelectedMeasure("Revenue");
    setXDimension("region");
    setZDimension("productLine");
    setActiveCellId(null);
    setHoveredCellId(null);
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_22%)]" />
      <div className="absolute inset-0 z-0 bg-grid bg-[size:42px_42px] opacity-30" />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-slate-800/80 bg-slate-950/75 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">
                Interactive 3D OLAP Workspace
              </Badge>
              <div className="space-y-2">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Pivot multidimensional data into a navigable 3D cube.
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Upload CSV data, remap the cube axes, slice dimensions independently, and
                  select any aggregated cell to inspect the underlying records.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={handleResetView}>
                <Sparkles className="mr-2 h-4 w-4" />
                Reset View
              </Button>
              <Button variant="outline" className="border-slate-700 bg-slate-900/70" onClick={handleResetDataset}>
                <Boxes className="mr-2 h-4 w-4" />
                Load Demo Cube
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-slate-950/65">
            <CardHeader className="pb-3">
              <CardDescription>Active Measure</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Layers3 className="h-5 w-5 text-cyan-300" />
                {selectedMeasure}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatMeasureValue(totals[selectedMeasure], selectedMeasure)}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/65">
            <CardHeader className="pb-3">
              <CardDescription>Visible Cube Cells</CardDescription>
              <CardTitle className="text-2xl">{pivot.cells.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {getDimensionLabel(xDimension)} by {getDimensionLabel(zDimension)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/65">
            <CardHeader className="pb-3">
              <CardDescription>Visible Fact Rows</CardDescription>
              <CardTitle className="text-2xl">{filteredFacts.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{datasetLabel}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/65">
            <CardHeader className="pb-3">
              <CardDescription>Focused Cell</CardDescription>
              <CardTitle className="text-2xl">
                {activeCell ? formatMeasureValue(activeCell.value, selectedMeasure) : "None"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {activeCell ? `${activeCell.count} contributing row(s)` : "Select a pivot cell to inspect it."}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <FilterPanel
            selectedMeasure={selectedMeasure}
            xDimension={xDimension}
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
            onResetDataset={handleResetDataset}
          />

          <div className="grid gap-6">
            <Card className="bg-slate-950/65">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Pivoted Cube Surface</CardTitle>
                  <CardDescription>
                    Hover or click in any view to highlight the same pivot cell across the workspace.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-700 text-slate-200">
                    X: {getDimensionLabel(xDimension)}
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-200">
                    Z: {getDimensionLabel(zDimension)}
                  </Badge>
                  {appliedSlices.length === 0 ? (
                    <Badge variant="outline" className="border-slate-700 text-slate-200">
                      No slices
                    </Badge>
                  ) : (
                    appliedSlices.map((slice) => (
                      <Badge key={slice} variant="outline" className="border-slate-700 text-slate-200">
                        {slice}
                      </Badge>
                    ))
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CubeScene
                  cells={pivot.cells}
                  measure={selectedMeasure}
                  xDimension={xDimension}
                  zDimension={zDimension}
                  xValues={pivot.xValues}
                  zValues={pivot.zValues}
                  activeCellId={activeCell?.id ?? null}
                  hoveredCellId={hoveredCell?.id ?? null}
                  onHoverCell={setHoveredCellId}
                  onLeaveCell={() => setHoveredCellId(null)}
                  onSelectCell={setActiveCellId}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Drill Path</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Hover a cell anywhere to preview it, then click to lock the drill-down below.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Cross-Highlight</p>
                    <p className="mt-2 text-sm text-slate-300">
                      The cube, heatmap, and pivot table now share hover and selection state.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Upload Model</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Local CSV uploads replace the demo dataset and reuse the same OLAP controls.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/65">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-cyan-300" />
                  <CardTitle>Pivot Matrix Heatmap</CardTitle>
                </div>
                <CardDescription>
                  A true matrix view of the same pivot surface. Hover and click behavior is synchronized with the 3D cube and pivot table.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PivotHeatmap
                  cells={pivot.cells}
                  xDimension={xDimension}
                  zDimension={zDimension}
                  xValues={pivot.xValues}
                  zValues={pivot.zValues}
                  measure={selectedMeasure}
                  activeCellId={activeCell?.id ?? null}
                  hoveredCellId={hoveredCell?.id ?? null}
                  onHoverCell={setHoveredCellId}
                  onLeaveCell={() => setHoveredCellId(null)}
                  onSelectCell={setActiveCellId}
                />
              </CardContent>
            </Card>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="bg-slate-950/65">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TableProperties className="h-5 w-5 text-cyan-300" />
                    <CardTitle>Aggregated Pivot Cells</CardTitle>
                  </div>
                  <CardDescription>Tabular drill-down entry points for the current pivot surface.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PivotTable
                    cells={pivot.cells}
                    xDimension={xDimension}
                    zDimension={zDimension}
                    measure={selectedMeasure}
                    activeCellId={activeCell?.id ?? null}
                    hoveredCellId={hoveredCell?.id ?? null}
                    onHoverCell={setHoveredCellId}
                    onLeaveCell={() => setHoveredCellId(null)}
                    onSelectCell={setActiveCellId}
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-950/65">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-cyan-300" />
                    <CardTitle>Cell Detail</CardTitle>
                  </div>
                  <CardDescription>Totals and member values for the current focused intersection.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-300">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="font-medium text-white">Coordinates</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeDimensions.length > 0 ? (
                        activeDimensions.map((value) => (
                          <Badge key={value} variant="outline" className="border-slate-700 text-slate-200">
                            {value}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-400">Select a cube cell to see its coordinates.</p>
                      )}
                    </div>
                    {hoveredCell && hoveredCell.id !== activeCell?.id ? (
                      <p className="mt-3 text-xs text-cyan-300">
                        Hover preview: {hoveredCell.xValue} / {hoveredCell.zValue}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Revenue</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMeasureValue(activeCell?.totals.Revenue ?? 0, "Revenue")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Margin</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMeasureValue(activeCell?.totals.Margin ?? 0, "Margin")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Units</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMeasureValue(activeCell?.totals.Units ?? 0, "Units")}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="font-medium text-white">Contributing Fact Rows</p>
                    <p className="mt-2 text-slate-400">
                      {activeCell ? `${activeCell.count} row(s) contribute to this cell.` : "No active cell selected."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="font-medium text-white">Dimension Inventory</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {dimensionOptions.map((dimension) => (
                        <div key={dimension.key} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{dimension.label}</p>
                          <p className="mt-1 text-sm text-slate-200">{availableValues[dimension.key].length} members</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="bg-slate-950/65">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TableProperties className="h-5 w-5 text-cyan-300" />
                  <CardTitle>Drill-Down Rows</CardTitle>
                </div>
                <CardDescription>
                  {activeCell
                    ? "Raw facts currently contributing to the focused cube cell."
                    : "Preview of the visible fact slice. Select a cell to narrow this table."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-900/90 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Month</th>
                        <th className="px-4 py-3 font-medium">Region</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Scenario</th>
                        <th className="px-4 py-3 font-medium">Revenue</th>
                        <th className="px-4 py-3 font-medium">Margin</th>
                        <th className="px-4 py-3 font-medium">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                      {drillFacts.map((fact, index) => (
                        <tr key={`${fact.month}-${fact.region}-${fact.productLine}-${fact.scenario}-${index}`}>
                          <td className="px-4 py-3 text-slate-200">{fact.month}</td>
                          <td className="px-4 py-3 text-slate-300">{fact.region}</td>
                          <td className="px-4 py-3 text-slate-300">{fact.productLine}</td>
                          <td className="px-4 py-3 text-slate-300">{fact.scenario}</td>
                          <td className="px-4 py-3 text-slate-100">{formatMeasureValue(fact.revenue, "Revenue")}</td>
                          <td className="px-4 py-3 text-slate-100">{formatMeasureValue(fact.margin, "Margin")}</td>
                          <td className="px-4 py-3 text-slate-100">{formatMeasureValue(fact.units, "Units")}</td>
                        </tr>
                      ))}
                      {drillFacts.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                            No rows match the current slice.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
