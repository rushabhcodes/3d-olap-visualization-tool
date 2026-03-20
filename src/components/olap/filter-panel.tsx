import { ArrowLeftRight, Database, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cubeFieldOptions,
  type CubeFactField,
  type CsvColumnMapping,
  type DimensionKey,
  dimensionOptions,
  getCubeFieldLabel,
  hasCompleteCsvMapping,
  type Measure,
  measures,
  readMappedCsvValue,
} from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  selectedMeasure: Measure;
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  filters: Record<DimensionKey, string | "All">;
  availableValues: Record<DimensionKey, string[]>;
  datasetLabel: string;
  recordCount: number;
  uploadError: string | null;
  pendingUpload: {
    fileName: string;
    headers: string[];
    rows: Array<Record<string, unknown>>;
    previewRows: Array<Record<string, unknown>>;
    mapping: CsvColumnMapping;
    parseErrors: string[];
  } | null;
  onMeasureChange: (value: Measure) => void;
  onAxisChange: (axis: "x" | "z", value: DimensionKey) => void;
  onSwapAxes: () => void;
  onFilterChange: (dimension: DimensionKey, value: string | "All") => void;
  onUpload: (file: File | null) => void;
  onMappingChange: (field: CubeFactField, header: string) => void;
  onApplyUpload: () => void;
  onCancelUpload: () => void;
  onResetDataset: () => void;
};

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn("justify-start rounded-full", !active && "bg-card/40")}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function AxisSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DimensionKey;
  onChange: (value: DimensionKey) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
        value={value}
        onChange={(event) => onChange(event.target.value as DimensionKey)}
      >
        {dimensionOptions.map((dimension) => (
          <option key={dimension.key} value={dimension.key}>
            {dimension.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterPanel({
  selectedMeasure,
  xDimension,
  zDimension,
  filters,
  availableValues,
  datasetLabel,
  recordCount,
  uploadError,
  pendingUpload,
  onMeasureChange,
  onAxisChange,
  onSwapAxes,
  onFilterChange,
  onUpload,
  onMappingChange,
  onApplyUpload,
  onCancelUpload,
  onResetDataset,
}: FilterPanelProps) {
  return (
    <Card className="border-cyan-200/70 bg-white/85">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Cube Controls</CardTitle>
            <CardDescription>Drive pivots, slices, and dataset changes from one rail.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-cyan-100 text-cyan-800">
            OLAP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-700" />
            <p className="text-sm font-medium text-slate-900">Dataset</p>
          </div>
          <p className="text-xs text-slate-600">{datasetLabel}</p>
          <p className="text-xs text-slate-600">{recordCount} fact rows loaded</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-cyan-500 hover:text-slate-950">
            <Upload className="h-4 w-4" />
            Upload CSV
            <input
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-slate-500">
            Parser: Papa Parse with explicit field mapping for month, region, productLine, scenario, revenue, margin, and units.
          </p>
          {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
          {pendingUpload ? (
            <div className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Review CSV Mapping</p>
                <p className="text-xs text-slate-600">
                  {pendingUpload.fileName} with {pendingUpload.rows.length} parsed row(s) and {pendingUpload.headers.length} detected column(s).
                </p>
              </div>
              {pendingUpload.parseErrors.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Parser warnings: {pendingUpload.parseErrors[0]}
                </p>
              ) : null}
              <div className="grid gap-3">
                {cubeFieldOptions.map((field) => {
                  const selectedHeader = pendingUpload.mapping[field.key];
                  const sampleValue =
                    pendingUpload.previewRows.length > 0 && selectedHeader
                      ? readMappedCsvValue(pendingUpload.previewRows[0] ?? {}, selectedHeader)
                      : "";

                  return (
                    <label key={field.key} className="grid gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {getCubeFieldLabel(field.key)}
                      </span>
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                        value={selectedHeader}
                        onChange={(event) => onMappingChange(field.key, event.target.value)}
                      >
                        <option value="">Unmapped</option>
                        {pendingUpload.headers.map((header) => (
                          <option key={`${field.key}-${header}`} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Sample: {sampleValue || "No sample value for the current mapping."}
                      </p>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-cyan-600 text-white hover:bg-cyan-500" disabled={!hasCompleteCsvMapping(pendingUpload.mapping)} onClick={onApplyUpload}>
                  Apply Mapping
                </Button>
                <Button variant="outline" className="flex-1 border-slate-200 bg-white" onClick={onCancelUpload}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
          <Button variant="outline" className="w-full border-slate-200 bg-white" onClick={onResetDataset}>
            Reset Demo Data
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">Measure</p>
            <p className="text-xs text-muted-foreground">Height and totals follow the selected KPI.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {measures.map((measure) => (
              <FilterChip
                key={measure}
                active={selectedMeasure === measure}
                label={measure}
                onClick={() => onMeasureChange(measure)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Pivot Axes</p>
              <p className="text-xs text-muted-foreground">Re-map the cube surface without changing the facts.</p>
            </div>
            <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onSwapAxes}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Swap
            </Button>
          </div>
          <div className="grid gap-3">
            <AxisSelect label="X Axis" value={xDimension} onChange={(value) => onAxisChange("x", value)} />
            <AxisSelect label="Z Axis" value={zDimension} onChange={(value) => onAxisChange("z", value)} />
          </div>
        </section>

        {dimensionOptions.map((dimension) => (
          <section key={dimension.key} className="space-y-3">
            <div>
              <p className="text-sm font-medium">{dimension.label}</p>
              <p className="text-xs text-muted-foreground">Filter visible cells and raw fact rows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={filters[dimension.key] === "All"}
                label="All"
                onClick={() => onFilterChange(dimension.key, "All")}
              />
              {availableValues[dimension.key].map((value) => (
                <FilterChip
                  key={value}
                  active={filters[dimension.key] === value}
                  label={value}
                  onClick={() => onFilterChange(dimension.key, value)}
                />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
