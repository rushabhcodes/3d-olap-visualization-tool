# 3D OLAP Visualization Tool

Interactive OLAP exploration workspace built with Vite, React, TypeScript, Tailwind CSS, shadcn-style components, and React Three Fiber.

## Stack

- Vite
- React 19 + TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Three.js with `@react-three/fiber` and `@react-three/drei`
- Papa Parse for CSV ingestion
- Vitest for data-engine regression tests

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run build
npm test
```

## Included features

- KPI overview cards
- Slice-and-dice filter rail
- Pivotable 3D cube scene with selectable aggregated cells
- Cross-highlighted pivot matrix heatmap and pivot table
- Drill-down voxel inspection for contributing fact rows
- Schema-aware CSV upload with column mapping review
- Signed measure support for negative and mixed-value datasets
- Lazy-loaded built-in datasets to reduce initial bundle work

## Built-in datasets

The app ships with three schema-aware sample cubes:

- `Sales Performance`
  Dimensions: `month`, `region`, `productLine`, `scenario`, `channel`
  Measures: `Revenue`, `Margin`, `Units`
- `Healthcare Operations`
  Dimensions: `month`, `region`, `serviceLine`, `payer`, `facilityType`
  Measures: `Visits`, `Cost`, `Readmissions`
- `Manufacturing Output`
  Dimensions: `month`, `plant`, `productFamily`, `shift`, `productionLine`
  Measures: `Output`, `Scrap`, `Downtime`

## CSV uploads

Uploads are parsed in a Papa Parse worker, then mapped onto the active dataset schema before being applied.

Requirements:

- The CSV must contain a header row.
- Every dimension field for the active schema must be mapped.
- Every measure field for the active schema must be mapped to numeric values.

The uploader suggests mappings from field labels, aliases, and raw keys, then lets you review the mapping before loading the dataset.

## Notes

- The 3D scene is lazy-loaded, and built-in sample datasets are split into separate chunks.
- The signed measure scale uses color to distinguish negative and positive values while keeping geometry valid for both.
- Current automated coverage focuses on the data engine: mapping, parsing, deduplication, pivot aggregation, and signed scaling.
