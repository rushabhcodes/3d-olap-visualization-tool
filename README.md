# 3D OLAP Visualization Tool

Starter repository for an interactive 3D OLAP exploration app using Vite, React, TypeScript, Tailwind CSS, shadcn/ui patterns, and React Three Fiber.

## Stack

- Vite
- React 19 + TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Three.js with `@react-three/fiber` and `@react-three/drei`
- Papa Parse for CSV ingestion

## Run

```bash
npm install
npm run dev
```

## Included starter features

- KPI overview cards
- Slice-and-dice filter rail
- Pivotable 3D cube scene with selectable aggregated cells
- Real pivot matrix heatmap with cross-highlighting
- CSV dataset upload for local exploration
- Parser-backed CSV schema mapping before import
- Drill-down detail panel and aggregated pivot table
- Tailwind theme tokens and shadcn component aliases

## CSV schema

Uploads still map into these semantic fields:

- `month`
- `region`
- `productLine`
- `scenario`
- `revenue`
- `margin`
- `units`

The uploader now parses CSV files with Papa Parse, suggests header mappings automatically, and lets you remap columns before applying the dataset.
