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

const csvHeaderAliases: Record<string, keyof CubeFact> = {
  month: "month",
  period: "month",
  region: "region",
  geography: "region",
  product: "productLine",
  productline: "productLine",
  scenario: "scenario",
  revenue: "revenue",
  sales: "revenue",
  margin: "margin",
  units: "units",
  quantity: "units",
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

export function parseCubeFactsCsv(csvText: string) {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      facts: [] as CubeFact[],
      errors: ["CSV must include a header row and at least one data row."],
    };
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headerMap = new Map<keyof CubeFact, number>();

  rawHeaders.forEach((header, index) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const key = csvHeaderAliases[normalized];

    if (key && !headerMap.has(key)) {
      headerMap.set(key, index);
    }
  });

  const requiredColumns: Array<keyof CubeFact> = [
    "month",
    "region",
    "productLine",
    "scenario",
    "revenue",
    "margin",
    "units",
  ];

  const missingColumns = requiredColumns.filter((column) => !headerMap.has(column));

  if (missingColumns.length > 0) {
    return {
      facts: [] as CubeFact[],
      errors: [
        `Missing required columns: ${missingColumns.join(", ")}.`,
        "Expected columns include month, region, productLine, scenario, revenue, margin, and units.",
      ],
    };
  }

  const facts: CubeFact[] = [];
  const errors: string[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = splitCsvLine(lines[lineIndex] ?? "");
    const lineNumber = lineIndex + 1;
    const fact = buildFactFromCsvRow(values, headerMap, lineNumber);

    if (fact.error) {
      errors.push(fact.error);
      continue;
    }

    if (fact.fact) {
      facts.push(fact.fact);
    }
  }

  if (facts.length === 0) {
    errors.unshift("No valid rows were parsed from the uploaded CSV.");
  }

  return { facts, errors };
}

function buildFactFromCsvRow(
  values: string[],
  headerMap: Map<keyof CubeFact, number>,
  lineNumber: number,
): { fact: CubeFact; error?: never } | { fact?: never; error: string } {
  const month = getCsvValue(values, headerMap, "month");
  const region = getCsvValue(values, headerMap, "region");
  const productLine = getCsvValue(values, headerMap, "productLine");
  const scenario = getCsvValue(values, headerMap, "scenario");
  const revenue = parseNumericCsvValue(getCsvValue(values, headerMap, "revenue"));
  const margin = parseNumericCsvValue(getCsvValue(values, headerMap, "margin"));
  const units = parseNumericCsvValue(getCsvValue(values, headerMap, "units"));

  if (!month || !region || !productLine || !scenario) {
    return {
      error: `Row ${lineNumber} is missing one or more dimension values.`,
    };
  }

  if (revenue === null || margin === null || units === null) {
    return {
      error: `Row ${lineNumber} contains a non-numeric measure value.`,
    };
  }

  return {
    fact: {
      month,
      region,
      productLine,
      scenario,
      revenue,
      margin,
      units,
    },
  };
}

function getCsvValue(values: string[], headerMap: Map<keyof CubeFact, number>, key: keyof CubeFact) {
  const columnIndex = headerMap.get(key);

  if (columnIndex === undefined) {
    return "";
  }

  return (values[columnIndex] ?? "").trim();
}

function parseNumericCsvValue(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
}
