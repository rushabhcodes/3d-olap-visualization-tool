import Papa from "papaparse";

export type Measure = string;
export type DimensionKey = string;
export type CubeFactField = string;
export type CsvColumnMapping = Record<string, string>;
export type CubeFact = Record<string, string | number>;

export type DimensionOption = {
  key: DimensionKey;
  label: string;
  aliases?: string[];
};

export type MeasureOption = {
  key: Measure;
  label: string;
  format: "currency" | "number";
  prefix?: string;
  suffix?: string;
  aliases?: string[];
};

export type DatasetSchema = {
  dimensions: DimensionOption[];
  measures: MeasureOption[];
  defaultAxes: {
    x: DimensionKey;
    y: DimensionKey;
    z: DimensionKey;
  };
  defaultMeasure: Measure;
  detailColorDimension?: DimensionKey;
};

export type CubeFieldOption = {
  key: CubeFactField;
  label: string;
  kind: "dimension" | "measure";
};

export type PivotCell = {
  id: string;
  xValue: string;
  yValue: string;
  zValue: string;
  value: number;
  totals: Record<Measure, number>;
  facts: CubeFact[];
  count: number;
};

export type MeasureScale = {
  min: number;
  max: number;
  maxAbs: number;
  hasNegative: boolean;
  hasPositive: boolean;
};

function getSchemaFields(schema: DatasetSchema): CubeFieldOption[] {
  return [
    ...schema.dimensions.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      kind: "dimension" as const,
    })),
    ...schema.measures.map((measure) => ({
      key: measure.key,
      label: measure.label,
      kind: "measure" as const,
    })),
  ];
}

function createEmptyMeasureTotals(schema: DatasetSchema) {
  return Object.fromEntries(schema.measures.map((measure) => [measure.key, 0])) as Record<Measure, number>;
}

function normalizeCsvHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseNumericCsvValue(value: string) {
  const normalized = value.replace(/[$,\s]/g, "").replace(/h$/i, "");

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getDimensionOption(schema: DatasetSchema, dimension: DimensionKey) {
  return schema.dimensions.find((option) => option.key === dimension) ?? null;
}

export function getMeasureOption(schema: DatasetSchema, measure: Measure) {
  return schema.measures.find((option) => option.key === measure) ?? null;
}

export function getCubeFieldOptions(schema: DatasetSchema) {
  return getSchemaFields(schema);
}

export function getMeasureValue(fact: CubeFact, measure: Measure) {
  const value = fact[measure];

  return typeof value === "number" ? value : Number(value ?? 0);
}

export function getDimensionLabel(schema: DatasetSchema, dimension: DimensionKey) {
  return getDimensionOption(schema, dimension)?.label ?? dimension;
}

export function getMeasureLabel(schema: DatasetSchema, measure: Measure) {
  return getMeasureOption(schema, measure)?.label ?? measure;
}

export function getDimensionValue(fact: CubeFact, dimension: DimensionKey) {
  return String(fact[dimension] ?? "").trim();
}

export function createEmptyFilters(schema: DatasetSchema): Record<DimensionKey, string | "All"> {
  return Object.fromEntries(schema.dimensions.map((dimension) => [dimension.key, "All"])) as Record<
    DimensionKey,
    string | "All"
  >;
}

export function formatMeasureValue(
  value: number,
  measureOrOption: Measure | MeasureOption,
  schema?: DatasetSchema,
) {
  const measureOption =
    typeof measureOrOption === "string" ? (schema ? getMeasureOption(schema, measureOrOption) : null) : measureOrOption;

  const normalizedValue = Number.isFinite(value) ? value : 0;

  if (!measureOption) {
    return normalizedValue.toLocaleString();
  }

  const formatted = normalizedValue.toLocaleString();

  return `${measureOption.prefix ?? ""}${formatted}${measureOption.suffix ?? ""}`;
}

export function createMeasureScale(values: number[]): MeasureScale {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      maxAbs: 1,
      hasNegative: false,
      hasPositive: false,
    };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const rawValue of values) {
    const value = Number.isFinite(rawValue) ? rawValue : 0;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1);

  return {
    min,
    max,
    maxAbs,
    hasNegative: min < 0,
    hasPositive: max > 0,
  };
}

export function getMeasureMagnitudeRatio(value: number, scale: MeasureScale) {
  return Math.min(Math.abs(Number.isFinite(value) ? value : 0) / scale.maxAbs, 1);
}

export function getMeasureSignedRatio(value: number, scale: MeasureScale) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return Math.max(-1, Math.min(safeValue / scale.maxAbs, 1));
}

export function getMeasureSignLabel(value: number) {
  if (value > 0) {
    return "Positive";
  }

  if (value < 0) {
    return "Negative";
  }

  return "Zero";
}

export function getCubeFieldLabel(schema: DatasetSchema, field: CubeFactField) {
  return getCubeFieldOptions(schema).find((option) => option.key === field)?.label ?? field;
}

export function createEmptyCsvColumnMapping(schema: DatasetSchema): CsvColumnMapping {
  return Object.fromEntries(getCubeFieldOptions(schema).map((field) => [field.key, ""])) as CsvColumnMapping;
}

export function getMissingCsvMappings(schema: DatasetSchema, mapping: CsvColumnMapping) {
  return getCubeFieldOptions(schema)
    .map((field) => field.key)
    .filter((field) => (mapping[field] ?? "").trim() === "");
}

export function hasCompleteCsvMapping(schema: DatasetSchema, mapping: CsvColumnMapping) {
  return getMissingCsvMappings(schema, mapping).length === 0;
}

export function suggestCsvColumnMapping(headers: string[], schema: DatasetSchema) {
  const mapping = createEmptyCsvColumnMapping(schema);
  const usedHeaders = new Set<string>();

  for (const field of getCubeFieldOptions(schema)) {
    const dimensionOption = getDimensionOption(schema, field.key);
    const measureOption = getMeasureOption(schema, field.key);
    const aliases = [
      field.label,
      ...(dimensionOption?.aliases ?? []),
      ...(measureOption?.aliases ?? []),
      field.key,
    ];
    const normalizedAliases = new Set(aliases.map((alias) => normalizeCsvHeader(alias)));

    const matchingHeader = headers.find((header) => {
      const normalizedHeader = normalizeCsvHeader(header);

      return normalizedAliases.has(normalizedHeader) && !usedHeaders.has(header);
    });

    if (matchingHeader) {
      mapping[field.key] = matchingHeader;
      usedHeaders.add(matchingHeader);
    }
  }

  return mapping;
}

export function getUniqueDimensionValues(facts: CubeFact[], schema: DatasetSchema) {
  const values = Object.fromEntries(schema.dimensions.map((dimension) => [dimension.key, [] as string[]])) as Record<
    DimensionKey,
    string[]
  >;
  const valueSets = Object.fromEntries(schema.dimensions.map((dimension) => [dimension.key, new Set<string>()])) as Record<
    DimensionKey,
    Set<string>
  >;

  for (const fact of facts) {
    for (const dimension of schema.dimensions) {
      const value = getDimensionValue(fact, dimension.key);

      if (valueSets[dimension.key].has(value)) {
        continue;
      }

      valueSets[dimension.key].add(value);
      values[dimension.key].push(value);
    }
  }

  return values;
}

export function buildPivotCells(
  facts: CubeFact[],
  schema: DatasetSchema,
  xDimension: DimensionKey,
  yDimension: DimensionKey,
  zDimension: DimensionKey,
  measure: Measure,
) {
  const cellMap = new Map<string, PivotCell>();
  const xValueSet = new Set<string>();
  const yValueSet = new Set<string>();
  const zValueSet = new Set<string>();
  const xValues: string[] = [];
  const yValues: string[] = [];
  const zValues: string[] = [];

  for (const fact of facts) {
    const xValue = getDimensionValue(fact, xDimension);
    const yValue = getDimensionValue(fact, yDimension);
    const zValue = getDimensionValue(fact, zDimension);
    const id = `${xValue}:::${yValue}:::${zValue}`;

    if (!xValueSet.has(xValue)) {
      xValueSet.add(xValue);
      xValues.push(xValue);
    }

    if (!yValueSet.has(yValue)) {
      yValueSet.add(yValue);
      yValues.push(yValue);
    }

    if (!zValueSet.has(zValue)) {
      zValueSet.add(zValue);
      zValues.push(zValue);
    }

    const existing = cellMap.get(id);

    if (existing) {
      existing.count += 1;
      existing.facts.push(fact);

      for (const measureOption of schema.measures) {
        existing.totals[measureOption.key] += getMeasureValue(fact, measureOption.key);
      }

      existing.value = existing.totals[measure];
      continue;
    }

    const totals = createEmptyMeasureTotals(schema);

    for (const measureOption of schema.measures) {
      totals[measureOption.key] = getMeasureValue(fact, measureOption.key);
    }

    cellMap.set(id, {
      id,
      xValue,
      yValue,
      zValue,
      count: 1,
      facts: [fact],
      totals,
      value: totals[measure],
    });
  }

  const cells: PivotCell[] = [];

  for (const yValue of yValues) {
    for (const zValue of zValues) {
      for (const xValue of xValues) {
        const cell = cellMap.get(`${xValue}:::${yValue}:::${zValue}`);

        if (!cell) {
          continue;
        }

        cells.push({
          ...cell,
          value: cell.totals[measure],
        });
      }
    }
  }

  return { cells, xValues, yValues, zValues };
}

export function readMappedCsvValue(row: Record<string, unknown>, header: string) {
  const rawValue = row[header];

  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => String(value ?? "")).join(", ").trim();
  }

  return String(rawValue ?? "").trim();
}

export function parseMappedCubeFacts(
  rows: Array<Record<string, unknown>>,
  schema: DatasetSchema,
  mapping: CsvColumnMapping,
) {
  const missingMappings = getMissingCsvMappings(schema, mapping);

  if (missingMappings.length > 0) {
    return {
      facts: [] as CubeFact[],
      errors: [
        `Unmapped required fields: ${missingMappings.map((field) => getCubeFieldLabel(schema, field)).join(", ")}.`,
      ],
    };
  }

  const facts: CubeFact[] = [];
  const errors: string[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? {};
    const lineNumber = rowIndex + 2;
    const dimensionValues = schema.dimensions.map((dimension) => ({
      key: dimension.key,
      value: readMappedCsvValue(row, mapping[dimension.key]),
    }));
    const measureValues = schema.measures.map((measure) => ({
      key: measure.key,
      value: readMappedCsvValue(row, mapping[measure.key]),
    }));

    if ([...dimensionValues, ...measureValues].every((entry) => entry.value === "")) {
      continue;
    }

    if (dimensionValues.some((entry) => entry.value === "")) {
      errors.push(`Row ${lineNumber} is missing one or more dimension values.`);
      continue;
    }

    const parsedMeasures = measureValues.map((entry) => ({
      key: entry.key,
      value: parseNumericCsvValue(entry.value),
    }));

    if (parsedMeasures.some((entry) => entry.value === null)) {
      errors.push(`Row ${lineNumber} contains a non-numeric measure value.`);
      continue;
    }

    const fact: CubeFact = {};

    for (const entry of dimensionValues) {
      fact[entry.key] = entry.value;
    }

    for (const entry of parsedMeasures) {
      fact[entry.key] = entry.value ?? 0;
    }

    facts.push(fact);
  }

  if (facts.length === 0) {
    errors.unshift("No valid rows were parsed from the uploaded CSV.");
  }

  return { facts, errors };
}

export function parseCubeFactsCsv(csvText: string, schema: DatasetSchema) {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const headers = Array.from(new Set((parsed.meta.fields ?? []).map((field) => field.trim()).filter(Boolean)));
  const rows = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));

  if (headers.length === 0) {
    return {
      facts: [] as CubeFact[],
      errors: ["CSV must include a header row."],
    };
  }

  if (rows.length === 0) {
    return {
      facts: [] as CubeFact[],
      errors: ["CSV must include at least one data row."],
    };
  }

  const mapping = suggestCsvColumnMapping(headers, schema);
  const mapped = parseMappedCubeFacts(rows, schema, mapping);
  const parseErrors = parsed.errors.map((error) => {
    const rowLabel = typeof error.row === "number" ? `Row ${error.row + 2}` : "CSV";

    return `${rowLabel}: ${error.message}`;
  });

  return {
    facts: mapped.facts,
    errors: [...parseErrors, ...mapped.errors],
  };
}
