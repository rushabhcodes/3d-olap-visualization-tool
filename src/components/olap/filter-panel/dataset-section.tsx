import { Database, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  cubeFieldOptions,
  getCubeFieldLabel,
  hasCompleteCsvMapping,
  readMappedCsvValue,
  type CubeFactField,
} from "@/data/mock-cube";

import type { PendingUpload } from "./types";

type DatasetSectionProps = {
  datasetLabel: string;
  recordCount: number;
  uploadError: string | null;
  pendingUpload: PendingUpload | null;
  onUpload: (file: File | null) => void;
  onMappingChange: (field: CubeFactField, header: string) => void;
  onApplyUpload: () => void;
  onCancelUpload: () => void;
  onResetDataset: () => void;
};

export function DatasetSection({
  datasetLabel,
  recordCount,
  uploadError,
  pendingUpload,
  onUpload,
  onMappingChange,
  onApplyUpload,
  onCancelUpload,
  onResetDataset,
}: DatasetSectionProps) {
  return (
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
  );
}
