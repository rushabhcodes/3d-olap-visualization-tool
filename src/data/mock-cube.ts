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

export type PivotCell = {
  id: string;
  xValue: string;
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

export const cubeFacts: CubeFact[] = [
  {
    month: "Jan",
    region: "North America",
    productLine: "Cloud Suite",
    scenario: "Actual",
    revenue: 420,
    margin: 146,
    units: 3200,
  },
  {
    month: "Jan",
    region: "Europe",
    productLine: "Retail Analytics",
    scenario: "Actual",
    revenue: 310,
    margin: 112,
    units: 2400,
  },
  {
    month: "Jan",
    region: "APAC",
    productLine: "Supply Chain",
    scenario: "Actual",
    revenue: 260,
    margin: 88,
    units: 2800,
  },
  {
    month: "Feb",
    region: "North America",
    productLine: "Retail Analytics",
    scenario: "Plan",
    revenue: 390,
    margin: 135,
    units: 2900,
  },
  {
    month: "Feb",
    region: "Europe",
    productLine: "Supply Chain",
    scenario: "Plan",
    revenue: 295,
    margin: 106,
    units: 2350,
  },
  {
    month: "Feb",
    region: "APAC",
    productLine: "Cloud Suite",
    scenario: "Plan",
    revenue: 335,
    margin: 122,
    units: 3010,
  },
  {
    month: "Mar",
    region: "North America",
    productLine: "Supply Chain",
    scenario: "Forecast",
    revenue: 448,
    margin: 162,
    units: 3320,
  },
  {
    month: "Mar",
    region: "Europe",
    productLine: "Cloud Suite",
    scenario: "Forecast",
    revenue: 328,
    margin: 118,
    units: 2560,
  },
  {
    month: "Mar",
    region: "APAC",
    productLine: "Retail Analytics",
    scenario: "Forecast",
    revenue: 352,
    margin: 124,
    units: 3190,
  },
];

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
  zDimension: DimensionKey,
  measure: Measure,
) {
  const cellMap = new Map<string, PivotCell>();
  const xValues: string[] = [];
  const zValues: string[] = [];

  for (const fact of facts) {
    const xValue = getDimensionValue(fact, xDimension);
    const zValue = getDimensionValue(fact, zDimension);
    const id = `${xValue}:::${zValue}`;

    if (!xValues.includes(xValue)) {
      xValues.push(xValue);
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

  for (const zValue of zValues) {
    for (const xValue of xValues) {
      const cell = cellMap.get(`${xValue}:::${zValue}`);

      if (cell) {
        cells.push({
          ...cell,
          value: cell.totals[measure],
        });
      }
    }
  }

  return { cells, xValues, zValues };
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
