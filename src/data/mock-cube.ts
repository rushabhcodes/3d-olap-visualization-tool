import {
  parseCubeFactsCsv,
  type CubeFact,
  type DatasetSchema,
} from "@/lib/cube-data";

export type {
  CsvColumnMapping,
  CubeFact,
  CubeFactField,
  CubeFieldOption,
  DatasetSchema,
  DimensionKey,
  DimensionOption,
  Measure,
  MeasureOption,
  MeasureScale,
  PivotCell,
} from "@/lib/cube-data";

export {
  buildPivotCells,
  createEmptyCsvColumnMapping,
  createEmptyFilters,
  createMeasureScale,
  formatMeasureValue,
  getCubeFieldLabel,
  getCubeFieldOptions,
  getDimensionLabel,
  getDimensionOption,
  getDimensionValue,
  getMeasureLabel,
  getMeasureMagnitudeRatio,
  getMeasureOption,
  getMeasureSignLabel,
  getMeasureSignedRatio,
  getMeasureValue,
  getMissingCsvMappings,
  getUniqueDimensionValues,
  hasCompleteCsvMapping,
  parseCubeFactsCsv,
  parseMappedCubeFacts,
  readMappedCsvValue,
  suggestCsvColumnMapping,
} from "@/lib/cube-data";

export type BuiltInDataset = {
  id: string;
  label: string;
  description: string;
  schema: DatasetSchema;
};

export type LoadedBuiltInDataset = BuiltInDataset & {
  facts: CubeFact[];
};

const salesSchema: DatasetSchema = {
  dimensions: [
    { key: "month", label: "Month", aliases: ["period", "date", "fiscal month"] },
    { key: "region", label: "Region", aliases: ["geography", "market", "area"] },
    { key: "productLine", label: "Product Line", aliases: ["product", "category", "business unit"] },
    { key: "scenario", label: "Scenario", aliases: ["version", "plan type", "plan"] },
    { key: "channel", label: "Channel", aliases: ["route to market", "sales channel", "go to market"] },
  ],
  measures: [
    { key: "Revenue", label: "Revenue", format: "currency", prefix: "$", suffix: "M", aliases: ["sales", "amount", "bookings"] },
    { key: "Margin", label: "Margin", format: "currency", prefix: "$", suffix: "M", aliases: ["profit", "gross margin"] },
    { key: "Units", label: "Units", format: "number", aliases: ["quantity", "volume"] },
  ],
  defaultAxes: {
    x: "region",
    y: "scenario",
    z: "productLine",
  },
  defaultMeasure: "Revenue",
  detailColorDimension: "month",
};

const healthcareSchema: DatasetSchema = {
  dimensions: [
    { key: "month", label: "Month", aliases: ["period", "date"] },
    { key: "region", label: "Region", aliases: ["market", "area"] },
    { key: "serviceLine", label: "Service Line", aliases: ["service", "specialty", "department"] },
    { key: "payer", label: "Payer", aliases: ["insurance", "plan", "coverage"] },
    { key: "facilityType", label: "Facility Type", aliases: ["facility", "care setting", "site type"] },
  ],
  measures: [
    { key: "Visits", label: "Visits", format: "number", aliases: ["encounters", "patients"] },
    { key: "Cost", label: "Cost", format: "currency", prefix: "$", suffix: "M", aliases: ["expense", "spend"] },
    { key: "Readmissions", label: "Readmissions", format: "number", aliases: ["returns", "readmit"] },
  ],
  defaultAxes: {
    x: "region",
    y: "payer",
    z: "serviceLine",
  },
  defaultMeasure: "Cost",
  detailColorDimension: "month",
};

const manufacturingSchema: DatasetSchema = {
  dimensions: [
    { key: "month", label: "Month", aliases: ["period", "date"] },
    { key: "plant", label: "Plant", aliases: ["region", "factory", "site"] },
    { key: "productFamily", label: "Product Family", aliases: ["product", "category", "line"] },
    { key: "shift", label: "Shift", aliases: ["crew", "team"] },
    { key: "productionLine", label: "Production Line", aliases: ["line", "assembly line", "workcell"] },
  ],
  measures: [
    { key: "Output", label: "Output", format: "number", aliases: ["production", "units produced"] },
    { key: "Scrap", label: "Scrap", format: "number", aliases: ["waste", "defects"] },
    { key: "Downtime", label: "Downtime", format: "number", suffix: "h", aliases: ["hours down", "idle hours"] },
  ],
  defaultAxes: {
    x: "plant",
    y: "shift",
    z: "productFamily",
  },
  defaultMeasure: "Output",
  detailColorDimension: "month",
};

export const defaultBuiltInDatasetId = "sales-demo";

export const builtInDatasets: BuiltInDataset[] = [
  {
    id: defaultBuiltInDatasetId,
    label: "Sales Performance",
    description: "Software revenue, margin, and units across regions, products, scenarios, channels, and months.",
    schema: salesSchema,
  },
  {
    id: "healthcare-ops",
    label: "Healthcare Operations",
    description: "Service line utilization, operating cost, and readmissions by region, payer, and facility type.",
    schema: healthcareSchema,
  },
  {
    id: "manufacturing-output",
    label: "Manufacturing Output",
    description: "Factory production, scrap, and downtime by plant, shift, production line, and product family.",
    schema: manufacturingSchema,
  },
];

const csvLoaders: Record<string, () => Promise<{ default: string }>> = {
  [defaultBuiltInDatasetId]: () => import("./demo-cube.csv?raw"),
  "healthcare-ops": () => import("./healthcare-cube.csv?raw"),
  "manufacturing-output": () => import("./manufacturing-cube.csv?raw"),
};

const builtInDatasetCache = new Map<string, LoadedBuiltInDataset>();

function parseBuiltInDataset(csvText: string, schema: DatasetSchema, label: string) {
  const parsed = parseCubeFactsCsv(csvText, schema);

  if (parsed.errors.length > 0 || parsed.facts.length === 0) {
    throw new Error(`${label} CSV failed to load. ${parsed.errors[0] ?? "Unknown error."}`);
  }

  return parsed.facts;
}

export function getBuiltInDatasetDefinition(datasetId: string) {
  return builtInDatasets.find((dataset) => dataset.id === datasetId) ?? builtInDatasets[0];
}

export async function loadBuiltInDataset(datasetId: string): Promise<LoadedBuiltInDataset> {
  const dataset = getBuiltInDatasetDefinition(datasetId);
  const cached = builtInDatasetCache.get(dataset.id);

  if (cached) {
    return cached;
  }

  const csvLoader = csvLoaders[dataset.id];

  if (!csvLoader) {
    throw new Error(`No CSV loader configured for dataset "${dataset.id}".`);
  }

  const csvModule = await csvLoader();
  const loadedDataset = {
    ...dataset,
    facts: parseBuiltInDataset(csvModule.default, dataset.schema, dataset.label),
  };

  builtInDatasetCache.set(dataset.id, loadedDataset);

  return loadedDataset;
}
