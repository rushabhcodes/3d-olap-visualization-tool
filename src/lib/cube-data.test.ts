import { describe, expect, it } from "vitest";

import {
  buildPivotCells,
  createMeasureScale,
  getMeasureMagnitudeRatio,
  getMeasureSignedRatio,
  getUniqueDimensionValues,
  parseMappedCubeFacts,
  suggestCsvColumnMapping,
  type DatasetSchema,
} from "./cube-data";

const schema: DatasetSchema = {
  dimensions: [
    { key: "month", label: "Month", aliases: ["period"] },
    { key: "region", label: "Region", aliases: ["market"] },
    { key: "scenario", label: "Scenario", aliases: ["plan type"] },
  ],
  measures: [
    { key: "Revenue", label: "Revenue", format: "currency", prefix: "$", suffix: "M", aliases: ["sales"] },
    { key: "Margin", label: "Margin", format: "currency", prefix: "$", suffix: "M", aliases: ["profit"] },
  ],
  defaultAxes: {
    x: "region",
    y: "scenario",
    z: "month",
  },
  defaultMeasure: "Revenue",
};

describe("cube-data", () => {
  it("suggests CSV mappings from labels, aliases, and keys", () => {
    const mapping = suggestCsvColumnMapping(
      ["Period", "Market", "Plan Type", "Sales", "Profit"],
      schema,
    );

    expect(mapping).toEqual({
      month: "Period",
      region: "Market",
      scenario: "Plan Type",
      Revenue: "Sales",
      Margin: "Profit",
    });
  });

  it("parses mapped rows, keeps negative measures, and reports invalid rows", () => {
    const parsed = parseMappedCubeFacts(
      [
        {
          period: "Jan",
          market: "North",
          scenario_name: "Actual",
          revenue_value: "$12.5",
          margin_value: "-4.5",
        },
        {
          period: "Feb",
          market: "South",
          scenario_name: "Plan",
          revenue_value: "oops",
          margin_value: "2",
        },
      ],
      schema,
      {
        month: "period",
        region: "market",
        scenario: "scenario_name",
        Revenue: "revenue_value",
        Margin: "margin_value",
      },
    );

    expect(parsed.facts).toEqual([
      {
        month: "Jan",
        region: "North",
        scenario: "Actual",
        Revenue: 12.5,
        Margin: -4.5,
      },
    ]);
    expect(parsed.errors).toContain("Row 3 contains a non-numeric measure value.");
  });

  it("deduplicates dimension inventories while preserving encounter order", () => {
    const values = getUniqueDimensionValues(
      [
        { month: "Jan", region: "North", scenario: "Actual", Revenue: 10, Margin: 4 },
        { month: "Jan", region: "North", scenario: "Plan", Revenue: 12, Margin: 5 },
        { month: "Feb", region: "South", scenario: "Actual", Revenue: 8, Margin: 3 },
      ],
      schema,
    );

    expect(values.month).toEqual(["Jan", "Feb"]);
    expect(values.region).toEqual(["North", "South"]);
    expect(values.scenario).toEqual(["Actual", "Plan"]);
  });

  it("aggregates pivot cells and preserves axis encounter order", () => {
    const pivot = buildPivotCells(
      [
        { month: "Jan", region: "North", scenario: "Actual", Revenue: 10, Margin: 4 },
        { month: "Jan", region: "North", scenario: "Actual", Revenue: -3, Margin: 1 },
        { month: "Jan", region: "South", scenario: "Plan", Revenue: 8, Margin: 2 },
      ],
      schema,
      "region",
      "scenario",
      "month",
      "Revenue",
    );

    expect(pivot.xValues).toEqual(["North", "South"]);
    expect(pivot.yValues).toEqual(["Actual", "Plan"]);
    expect(pivot.zValues).toEqual(["Jan"]);
    expect(pivot.cells).toHaveLength(2);
    expect(pivot.cells[0]).toMatchObject({
      id: "North:::Actual:::Jan",
      count: 2,
      value: 7,
      totals: {
        Revenue: 7,
        Margin: 5,
      },
    });
  });

  it("builds a signed measure scale that keeps magnitude ratios safe", () => {
    const scale = createMeasureScale([-12, 0, 6]);

    expect(scale.min).toBe(-12);
    expect(scale.max).toBe(6);
    expect(scale.maxAbs).toBe(12);
    expect(getMeasureSignedRatio(-12, scale)).toBe(-1);
    expect(getMeasureSignedRatio(6, scale)).toBe(0.5);
    expect(getMeasureMagnitudeRatio(-6, scale)).toBe(0.5);
    expect(getMeasureMagnitudeRatio(0, scale)).toBe(0);
  });
});
