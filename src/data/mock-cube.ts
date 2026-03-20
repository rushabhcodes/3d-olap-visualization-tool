export type Measure = "Revenue" | "Margin" | "Units";
export type DimensionKey = "region" | "productLine" | "scenario" | "month";

export type CubeFact = {
  month: string;
  region: string;
  productLine: string;
  scenario: string;
  revenue: number;
  margin: number;
  units: number;
};

export type CubeFactField = keyof CubeFact;
export type CsvColumnMapping = Record<CubeFactField, string>;

export type MeasureTotals = Record<Measure, number>;
export type MeasureFactKey = "revenue" | "margin" | "units";

export type PivotCell = {
  id: string;
  xValue: string;
  yValue: string;
  zValue: string;
  value: number;
  totals: MeasureTotals;
  facts: CubeFact[];
  count: number;
};

export const measures: Measure[] = ["Revenue", "Margin", "Units"];

export const dimensionOptions: Array<{ key: DimensionKey; label: string }> = [
  { key: "region", label: "Region" },
  { key: "productLine", label: "Product Line" },
  { key: "scenario", label: "Scenario" },
  { key: "month", label: "Month" },
];

export const measureOptions: Array<{ key: Measure; label: string; factKey: MeasureFactKey }> = [
  { key: "Revenue", label: "Revenue", factKey: "revenue" },
  { key: "Margin", label: "Margin", factKey: "margin" },
  { key: "Units", label: "Units", factKey: "units" },
];

export const cubeFieldOptions: Array<{
  key: CubeFactField;
  label: string;
  kind: "dimension" | "measure";
}> = [
  { key: "month", label: "Month", kind: "dimension" },
  { key: "region", label: "Region", kind: "dimension" },
  { key: "productLine", label: "Product Line", kind: "dimension" },
  { key: "scenario", label: "Scenario", kind: "dimension" },
  { key: "revenue", label: "Revenue", kind: "measure" },
  { key: "margin", label: "Margin", kind: "measure" },
  { key: "units", label: "Units", kind: "measure" },
];

const monthProfiles = [
  { label: "Jan", seasonalFactor: 0.9, unitFactor: 0.94 },
  { label: "Feb", seasonalFactor: 0.93, unitFactor: 0.96 },
  { label: "Mar", seasonalFactor: 1.01, unitFactor: 1.0 },
  { label: "Apr", seasonalFactor: 1.04, unitFactor: 1.02 },
  { label: "May", seasonalFactor: 1.08, unitFactor: 1.05 },
  { label: "Jun", seasonalFactor: 1.12, unitFactor: 1.08 },
  { label: "Jul", seasonalFactor: 1.15, unitFactor: 1.1 },
  { label: "Aug", seasonalFactor: 1.11, unitFactor: 1.07 },
  { label: "Sep", seasonalFactor: 1.06, unitFactor: 1.03 },
  { label: "Oct", seasonalFactor: 1.13, unitFactor: 1.09 },
  { label: "Nov", seasonalFactor: 1.2, unitFactor: 1.14 },
  { label: "Dec", seasonalFactor: 1.28, unitFactor: 1.2 },
] as const;

const regionProfiles = [
  { label: "North America", revenueBase: 430, marginRate: 0.34, unitsBase: 3100 },
  { label: "Europe", revenueBase: 360, marginRate: 0.31, unitsBase: 2840 },
  { label: "APAC", revenueBase: 335, marginRate: 0.29, unitsBase: 3300 },
  { label: "Latin America", revenueBase: 255, marginRate: 0.24, unitsBase: 2160 },
] as const;

const productProfiles = [
  { label: "Cloud Suite", revenueFactor: 1.22, marginLift: 0.04, unitsFactor: 0.92 },
  { label: "Retail Analytics", revenueFactor: 1.04, marginLift: 0.02, unitsFactor: 1.0 },
  { label: "Supply Chain", revenueFactor: 0.96, marginLift: 0.01, unitsFactor: 1.08 },
  { label: "Data Platform", revenueFactor: 1.34, marginLift: 0.06, unitsFactor: 0.88 },
] as const;

const scenarioProfiles = [
  { label: "Actual", revenueFactor: 1, marginDelta: 0, unitsFactor: 1 },
  { label: "Plan", revenueFactor: 1.06, marginDelta: 0.01, unitsFactor: 1.03 },
  { label: "Forecast", revenueFactor: 1.03, marginDelta: 0.015, unitsFactor: 1.01 },
] as const;

export const cubeFacts: CubeFact[] = monthProfiles.flatMap((month, monthIndex) =>
  regionProfiles.flatMap((region, regionIndex) =>
    productProfiles.flatMap((product, productIndex) =>
      scenarioProfiles.map((scenario, scenarioIndex) => {
        const interactionFactor =
          1 +
          (monthIndex % 4) * 0.015 +
          regionIndex * 0.02 +
          productIndex * 0.012 +
          scenarioIndex * 0.01;
        const revenue = Math.round(
          region.revenueBase *
            product.revenueFactor *
            month.seasonalFactor *
            scenario.revenueFactor *
            interactionFactor,
        );
        const units = Math.round(
          region.unitsBase *
            product.unitsFactor *
            month.unitFactor *
            scenario.unitsFactor *
            (1 + (monthIndex % 3) * 0.01 + productIndex * 0.015),
        );
        const marginRate = Math.min(
          0.44,
          region.marginRate +
            product.marginLift +
            scenario.marginDelta +
            (monthIndex % 5) * 0.004,
        );
        const margin = Math.round(revenue * marginRate);

        return {
          month: month.label,
          region: region.label,
          productLine: product.label,
          scenario: scenario.label,
          revenue,
          margin,
          units,
        };
      }),
    ),
  ),
);

const measureAccessor = {
  Revenue: (fact: CubeFact) => fact.revenue,
  Margin: (fact: CubeFact) => fact.margin,
  Units: (fact: CubeFact) => fact.units,
} satisfies Record<Measure, (fact: CubeFact) => number>;

const dimensionAccessor = {
  region: (fact: CubeFact) => fact.region,
  productLine: (fact: CubeFact) => fact.productLine,
  scenario: (fact: CubeFact) => fact.scenario,
  month: (fact: CubeFact) => fact.month,
} satisfies Record<DimensionKey, (fact: CubeFact) => string>;

const csvHeaderAliases: Record<CubeFactField, string[]> = {
  month: ["month", "period", "date", "fiscalmonth"],
  region: ["region", "geography", "market", "area"],
  productLine: ["productline", "product line", "product", "category", "businessunit"],
  scenario: ["scenario", "version", "plan type", "plan"],
  revenue: ["revenue", "sales", "amount", "bookings"],
  margin: ["margin", "profit", "grossmargin"],
  units: ["units", "quantity", "volume"],
};

export function getMeasureValue(fact: CubeFact, measure: Measure) {
  return measureAccessor[measure](fact);
}

export function getDimensionLabel(dimension: DimensionKey) {
  return dimensionOptions.find((option) => option.key === dimension)?.label ?? dimension;
}

export function getDimensionValue(fact: CubeFact, dimension: DimensionKey) {
  return dimensionAccessor[dimension](fact);
}

export function createEmptyFilters(): Record<DimensionKey, string | "All"> {
  return {
    region: "All",
    productLine: "All",
    scenario: "All",
    month: "All",
  };
}

export function formatMeasureValue(value: number, measure: Measure) {
  return measure === "Units" ? value.toLocaleString() : `$${value.toLocaleString()}M`;
}

export function getCubeFieldLabel(field: CubeFactField) {
  return cubeFieldOptions.find((option) => option.key === field)?.label ?? field;
}

export function createEmptyCsvColumnMapping(): CsvColumnMapping {
  return {
    month: "",
    region: "",
    productLine: "",
    scenario: "",
    revenue: "",
    margin: "",
    units: "",
  };
}

export function getMissingCsvMappings(mapping: CsvColumnMapping) {
  return cubeFieldOptions
    .map((field) => field.key)
    .filter((field) => mapping[field].trim() === "");
}

export function hasCompleteCsvMapping(mapping: CsvColumnMapping) {
  return getMissingCsvMappings(mapping).length === 0;
}

export function suggestCsvColumnMapping(headers: string[]) {
  const mapping = createEmptyCsvColumnMapping();
  const usedHeaders = new Set<string>();

  for (const field of cubeFieldOptions) {
    const aliases = new Set(
      csvHeaderAliases[field.key].map((alias) => normalizeCsvHeader(alias)).concat(normalizeCsvHeader(field.label)),
    );

    const matchingHeader = headers.find((header) => {
      const normalized = normalizeCsvHeader(header);

      return aliases.has(normalized) && !usedHeaders.has(header);
    });

    if (matchingHeader) {
      mapping[field.key] = matchingHeader;
      usedHeaders.add(matchingHeader);
    }
  }

  return mapping;
}

export function getUniqueDimensionValues(facts: CubeFact[]) {
  const values = {
    region: [] as string[],
    productLine: [] as string[],
    scenario: [] as string[],
    month: [] as string[],
  };

  for (const fact of facts) {
    for (const dimension of dimensionOptions) {
      const value = getDimensionValue(fact, dimension.key);

      if (!values[dimension.key].includes(value)) {
        values[dimension.key].push(value);
      }
    }
  }

  return values;
}

export function buildPivotCells(
  facts: CubeFact[],
  xDimension: DimensionKey,
  yDimension: DimensionKey,
  zDimension: DimensionKey,
  measure: Measure,
) {
  const cellMap = new Map<string, PivotCell>();
  const xValues: string[] = [];
  const yValues: string[] = [];
  const zValues: string[] = [];

  for (const fact of facts) {
    const xValue = getDimensionValue(fact, xDimension);
    const yValue = getDimensionValue(fact, yDimension);
    const zValue = getDimensionValue(fact, zDimension);
    const id = `${xValue}:::${yValue}:::${zValue}`;

    if (!xValues.includes(xValue)) {
      xValues.push(xValue);
    }

    if (!yValues.includes(yValue)) {
      yValues.push(yValue);
    }

    if (!zValues.includes(zValue)) {
      zValues.push(zValue);
    }

    const existing = cellMap.get(id);

    if (existing) {
      existing.count += 1;
      existing.facts.push(fact);
      existing.totals.Revenue += fact.revenue;
      existing.totals.Margin += fact.margin;
      existing.totals.Units += fact.units;
      existing.value = existing.totals[measure];
      continue;
    }

    cellMap.set(id, {
      id,
      xValue,
      yValue,
      zValue,
      count: 1,
      facts: [fact],
      totals: {
        Revenue: fact.revenue,
        Margin: fact.margin,
        Units: fact.units,
      },
      value: getMeasureValue(fact, measure),
    });
  }

  const cells: PivotCell[] = [];

  for (const yValue of yValues) {
    for (const zValue of zValues) {
      for (const xValue of xValues) {
        const cell = cellMap.get(`${xValue}:::${yValue}:::${zValue}`);

        if (cell) {
          cells.push({
            ...cell,
            value: cell.totals[measure],
          });
        }
      }
    }
  }

  return { cells, xValues, yValues, zValues };
}

export function parseMappedCubeFacts(rows: Array<Record<string, unknown>>, mapping: CsvColumnMapping) {
  const missingMappings = getMissingCsvMappings(mapping);

  if (missingMappings.length > 0) {
    return {
      facts: [] as CubeFact[],
      errors: [
        `Unmapped required fields: ${missingMappings.map((field) => getCubeFieldLabel(field)).join(", ")}.`,
      ],
    };
  }

  const facts: CubeFact[] = [];
  const errors: string[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? {};
    const lineNumber = rowIndex + 2;
    const month = readMappedCsvValue(row, mapping.month);
    const region = readMappedCsvValue(row, mapping.region);
    const productLine = readMappedCsvValue(row, mapping.productLine);
    const scenario = readMappedCsvValue(row, mapping.scenario);
    const revenueText = readMappedCsvValue(row, mapping.revenue);
    const marginText = readMappedCsvValue(row, mapping.margin);
    const unitsText = readMappedCsvValue(row, mapping.units);

    if ([month, region, productLine, scenario, revenueText, marginText, unitsText].every((value) => value === "")) {
      continue;
    }

    const revenue = parseNumericCsvValue(revenueText);
    const margin = parseNumericCsvValue(marginText);
    const units = parseNumericCsvValue(unitsText);

    if (!month || !region || !productLine || !scenario) {
      errors.push(`Row ${lineNumber} is missing one or more dimension values.`);
      continue;
    }

    if (revenue === null || margin === null || units === null) {
      errors.push(`Row ${lineNumber} contains a non-numeric measure value.`);
      continue;
    }

    facts.push({
      month,
      region,
      productLine,
      scenario,
      revenue,
      margin,
      units,
    });
  }

  if (facts.length === 0) {
    errors.unshift("No valid rows were parsed from the uploaded CSV.");
  }

  return { facts, errors };
}

function parseNumericCsvValue(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function readMappedCsvValue(row: Record<string, unknown>, header: string) {
  const rawValue = row[header];

  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => String(value ?? "")).join(", ").trim();
  }

  return String(rawValue ?? "").trim();
}

function normalizeCsvHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
