import { Database, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type BuiltInDataset,
  getCubeFieldOptions,
  getCubeFieldLabel,
  hasCompleteCsvMapping,
  readMappedCsvValue,
  type DatasetSchema,
} from "@/data/mock-cube";

import type { PendingUpload } from "./types";

type DatasetSectionProps = {
  builtInDatasets: BuiltInDataset[];
  selectedBuiltInDatasetId: string | null;
  schema: DatasetSchema;
  datasetLabel: string;
  recordCount: number;
  uploadError: string | null;
  isDatasetLoading: boolean;
  isUploadParsing: boolean;
  pendingUpload: PendingUpload | null;
  onUpload: (file: File | null) => void;
  onMappingChange: (field: string, header: string) => void;
  onApplyUpload: () => void;
  onCancelUpload: () => void;
  onLoadBuiltInDataset: (datasetId: string) => void;
  onResetDataset: () => void;
};

export function DatasetSection({
  builtInDatasets,
  selectedBuiltInDatasetId,
  schema,
  datasetLabel,
  recordCount,
  uploadError,
  isDatasetLoading,
  isUploadParsing,
  pendingUpload,
  onUpload,
  onMappingChange,
  onApplyUpload,
  onCancelUpload,
  onLoadBuiltInDataset,
  onResetDataset,
}: DatasetSectionProps) {
  const schemaFields = getCubeFieldOptions(schema);
  const parserFieldSummary = schemaFields.map((field) => field.label).join(", ");

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-cyan-700" />
        <p className="text-sm font-medium text-slate-900">Dataset</p>
      </div>
      <p className="text-xs text-slate-600">{datasetLabel}</p>
      <p className="text-xs text-slate-600">
        {isDatasetLoading ? "Loading built-in dataset..." : `${recordCount} fact rows loaded`}
      </p>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Built-in datasets</p>
        <div className="grid gap-2">
          {builtInDatasets.map((dataset) => {
            const isActive = selectedBuiltInDatasetId === dataset.id;

            return (
              <button
                key={dataset.id}
                type="button"
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-cyan-500 bg-cyan-50 text-slate-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-cyan-400 hover:text-slate-950"
                }`}
                disabled={isDatasetLoading}
                onClick={() => onLoadBuiltInDataset(dataset.id)}
              >
                <p className="text-sm font-medium">{dataset.label}</p>
                <p className="mt-1 text-xs text-slate-500">{dataset.description}</p>
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-cyan-500 hover:text-slate-950">
        <Upload className="h-4 w-4" />
        {isUploadParsing ? "Parsing CSV..." : "Upload CSV"}
        <input
          className="hidden"
          type="file"
          accept=".csv,text/csv"
          disabled={isUploadParsing}
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
        />
      </label>
      <p className="text-xs text-slate-500">
        Parser: Papa Parse with explicit field mapping for {parserFieldSummary}.
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
            {schemaFields.map((field) => {
              const selectedHeader = pendingUpload.mapping[field.key];
              const sampleValue =
                pendingUpload.previewRows.length > 0 && selectedHeader
                  ? readMappedCsvValue(pendingUpload.previewRows[0] ?? {}, selectedHeader)
                  : "";

              return (
                <label key={field.key} className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {getCubeFieldLabel(schema, field.key)}
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
            <Button className="flex-1 bg-cyan-600 text-white hover:bg-cyan-500" disabled={!hasCompleteCsvMapping(schema, pendingUpload.mapping)} onClick={onApplyUpload}>
              Apply Mapping
            </Button>
            <Button variant="outline" className="flex-1 border-slate-200 bg-white" onClick={onCancelUpload}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      <Button variant="outline" className="w-full border-slate-200 bg-white" disabled={isDatasetLoading} onClick={onResetDataset}>
        Load Default Dataset
      </Button>
    </section>
  );
}
