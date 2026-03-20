import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuiltInDataset, DatasetSchema, DimensionKey, Measure } from "@/data/mock-cube";
import { DatasetSection } from "@/components/olap/filter-panel/dataset-section";
import { DimensionFiltersSection } from "@/components/olap/filter-panel/dimension-filters-section";
import { MeasureSection } from "@/components/olap/filter-panel/measure-section";
import { PivotAxesSection } from "@/components/olap/filter-panel/pivot-axes-section";
import type { PendingUpload } from "@/components/olap/filter-panel/types";

type FilterPanelProps = {
  builtInDatasets: BuiltInDataset[];
  selectedBuiltInDatasetId: string | null;
  schema: DatasetSchema;
  selectedMeasure: Measure;
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  filters: Record<DimensionKey, string | "All">;
  availableValues: Record<DimensionKey, string[]>;
  datasetLabel: string;
  recordCount: number;
  uploadError: string | null;
  isDatasetLoading: boolean;
  isUploadParsing: boolean;
  pendingUpload: PendingUpload | null;
  onMeasureChange: (value: Measure) => void;
  onAxisChange: (axis: "x" | "y" | "z", value: DimensionKey) => void;
  onSwapAxes: () => void;
  onFilterChange: (dimension: DimensionKey, value: string | "All") => void;
  onUpload: (file: File | null) => void;
  onMappingChange: (field: string, header: string) => void;
  onApplyUpload: () => void;
  onCancelUpload: () => void;
  onLoadBuiltInDataset: (datasetId: string) => void;
  onResetDataset: () => void;
};

export function FilterPanel({
  builtInDatasets,
  selectedBuiltInDatasetId,
  schema,
  selectedMeasure,
  xDimension,
  yDimension,
  zDimension,
  filters,
  availableValues,
  datasetLabel,
  recordCount,
  uploadError,
  isDatasetLoading,
  isUploadParsing,
  pendingUpload,
  onMeasureChange,
  onAxisChange,
  onSwapAxes,
  onFilterChange,
  onUpload,
  onMappingChange,
  onApplyUpload,
  onCancelUpload,
  onLoadBuiltInDataset,
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
        <DatasetSection
          builtInDatasets={builtInDatasets}
          selectedBuiltInDatasetId={selectedBuiltInDatasetId}
          schema={schema}
          datasetLabel={datasetLabel}
          recordCount={recordCount}
          uploadError={uploadError}
          isDatasetLoading={isDatasetLoading}
          isUploadParsing={isUploadParsing}
          pendingUpload={pendingUpload}
          onUpload={onUpload}
          onMappingChange={onMappingChange}
          onApplyUpload={onApplyUpload}
          onCancelUpload={onCancelUpload}
          onLoadBuiltInDataset={onLoadBuiltInDataset}
          onResetDataset={onResetDataset}
        />

        <MeasureSection
          measures={schema.measures}
          selectedMeasure={selectedMeasure}
          onMeasureChange={onMeasureChange}
        />

        <PivotAxesSection
          dimensions={schema.dimensions}
          xDimension={xDimension}
          yDimension={yDimension}
          zDimension={zDimension}
          onAxisChange={onAxisChange}
          onSwapAxes={onSwapAxes}
        />

        <DimensionFiltersSection
          dimensions={schema.dimensions}
          filters={filters}
          availableValues={availableValues}
          onFilterChange={onFilterChange}
        />
      </CardContent>
    </Card>
  );
}
