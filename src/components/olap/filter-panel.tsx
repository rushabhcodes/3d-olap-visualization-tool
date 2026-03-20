import { ArrowLeftRight, Database, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DimensionKey,
  dimensionOptions,
  type Measure,
  measures,
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
  onMeasureChange: (value: Measure) => void;
  onAxisChange: (axis: "x" | "z", value: DimensionKey) => void;
  onSwapAxes: () => void;
  onFilterChange: (dimension: DimensionKey, value: string | "All") => void;
  onUpload: (file: File | null) => void;
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
        className="h-10 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
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
  onMeasureChange,
  onAxisChange,
  onSwapAxes,
  onFilterChange,
  onUpload,
  onResetDataset,
}: FilterPanelProps) {
  return (
    <Card className="border-cyan-950/20 bg-slate-950/65">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Cube Controls</CardTitle>
            <CardDescription>Drive pivots, slices, and dataset changes from one rail.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100">
            OLAP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-medium text-white">Dataset</p>
          </div>
          <p className="text-xs text-slate-400">{datasetLabel}</p>
          <p className="text-xs text-slate-400">{recordCount} fact rows loaded</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-white">
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
            Expected columns: month, region, productLine, scenario, revenue, margin, units.
          </p>
          {uploadError ? <p className="text-xs text-rose-300">{uploadError}</p> : null}
          <Button variant="outline" className="w-full border-slate-700 bg-slate-900/70" onClick={onResetDataset}>
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
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900/70" onClick={onSwapAxes}>
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
