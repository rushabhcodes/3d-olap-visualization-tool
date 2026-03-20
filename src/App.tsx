import { Boxes, Layers3, Sparkles } from "lucide-react";

import { AggregatedPivotCellsCard } from "@/components/olap/aggregated-pivot-cells-card";
import { CellDetailCard } from "@/components/olap/cell-detail-card";
import { FilterPanel } from "@/components/olap/filter-panel";
import { PivotMatrixHeatmapCard } from "@/components/olap/pivot-matrix-heatmap-card";
import { PivotedCubeSurfaceCard } from "@/components/olap/pivoted-cube-surface-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  builtInDatasets,
  formatMeasureValue,
  getMeasureLabel,
  getDimensionLabel,
} from "@/data/mock-cube";
import { useCubeWorkspace } from "@/hooks/use-cube-workspace";

function App() {
  const {
    cubeSurfaceRef,
    schema,
    facts,
    datasetLabel,
    selectedBuiltInDatasetId,
    uploadError,
    selectedMeasure,
    xDimension,
    yDimension,
    zDimension,
    filters,
    activeCell,
    hoveredCell,
    drilledCell,
    hoveredFactIndex,
    selectedFactIndex,
    pendingUpload,
    availableValues,
    filteredFacts,
    pivot,
    totals,
    activeDimensions,
    appliedSlices,
    setSelectedMeasure,
    handleAxisChange,
    handleSwapAxes,
    handleFilterChange,
    handleUpload,
    handleMappingChange,
    handleApplyUpload,
    handleCancelUpload,
    handleLoadBuiltInDataset,
    handleResetDataset,
    handleResetView,
    handleSelectAggregateCell,
    handleHoverCell,
    handleLeaveCell,
    handleToggleDrillCell,
    handleBackToAggregate,
    handleHoverFact,
    handleLeaveFact,
    handleSelectFact,
    handleActivatePivotFact,
  } = useCubeWorkspace();

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
            onFilterChange={handleFilterChange}
            onUpload={handleUpload}
            onMappingChange={handleMappingChange}
            onApplyUpload={handleApplyUpload}
            onCancelUpload={handleCancelUpload}
            onLoadBuiltInDataset={handleLoadBuiltInDataset}
            onResetDataset={handleResetDataset}
          />

          <div className="grid min-w-0 gap-6 xl:col-span-2">
            <div ref={cubeSurfaceRef}>
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
                onHoverCell={handleHoverCell}
                onLeaveCell={handleLeaveCell}
                onSelectCell={handleSelectAggregateCell}
                onToggleDrillCell={handleToggleDrillCell}
                onBackToAggregate={handleBackToAggregate}
                onHoverFact={handleHoverFact}
                onLeaveFact={handleLeaveFact}
                onSelectFact={handleSelectFact}
              />
            </div>
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
              onHoverCell={handleHoverCell}
              onLeaveCell={handleLeaveCell}
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
              drilledCellId={drilledCell?.id ?? null}
              hoveredFactIndex={hoveredFactIndex}
              selectedFactIndex={selectedFactIndex}
              onHoverCell={handleHoverCell}
              onLeaveCell={handleLeaveCell}
              onSelectCell={handleSelectAggregateCell}
              onHoverFact={handleHoverFact}
              onLeaveFact={handleLeaveFact}
              onSelectFact={handleSelectFact}
              onActivateFact={handleActivatePivotFact}
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
