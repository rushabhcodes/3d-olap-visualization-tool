import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

import type { PendingUpload } from "@/components/olap/filter-panel/types";
import {
  buildPivotCells,
  builtInDatasets,
  createEmptyFilters,
  defaultBuiltInDatasetId,
  type DatasetSchema,
  type DimensionKey,
  getBuiltInDatasetDefinition,
  getCubeFieldOptions,
  getDimensionLabel,
  getDimensionValue,
  getUniqueDimensionValues,
  hasCompleteCsvMapping,
  loadBuiltInDataset,
  type Measure,
  parseMappedCubeFacts,
  suggestCsvColumnMapping,
  type CubeFact,
} from "@/data/mock-cube";

function parseCsvUploadFile(file: File) {
  return new Promise<{
    headers: string[];
    rows: Array<Record<string, unknown>>;
    parseErrors: string[];
  }>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      worker: true,
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (parsed) => {
        const headers = Array.from(
          new Set((parsed.meta.fields ?? []).map((field) => field.trim()).filter(Boolean)),
        );
        const rows = parsed.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim() !== ""),
        );

        resolve({
          headers,
          rows,
          parseErrors: parsed.errors.map((error) => {
            const rowLabel = typeof error.row === "number" ? `Row ${error.row + 2}` : "CSV";

            return `${rowLabel}: ${error.message}`;
          }),
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function useCubeWorkspace() {
  const defaultBuiltInDataset = getBuiltInDatasetDefinition(defaultBuiltInDatasetId);
  const cubeSurfaceRef = useRef<HTMLDivElement>(null);
  const builtInDatasetLoadIdRef = useRef(0);
  const [schema, setSchema] = useState<DatasetSchema>(defaultBuiltInDataset.schema);
  const [facts, setFacts] = useState<CubeFact[]>([]);
  const [datasetLabel, setDatasetLabel] = useState(defaultBuiltInDataset.label);
  const [selectedBuiltInDatasetId, setSelectedBuiltInDatasetId] = useState<string | null>(
    defaultBuiltInDatasetId,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDatasetLoading, setIsDatasetLoading] = useState(true);
  const [isUploadParsing, setIsUploadParsing] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<Measure>(defaultBuiltInDataset.schema.defaultMeasure);
  const [xDimension, setXDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.x);
  const [yDimension, setYDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.y);
  const [zDimension, setZDimension] = useState<DimensionKey>(defaultBuiltInDataset.schema.defaultAxes.z);
  const [filters, setFilters] = useState<Record<DimensionKey, string | "All">>(
    createEmptyFilters(defaultBuiltInDataset.schema),
  );
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [drilledCellId, setDrilledCellId] = useState<string | null>(null);
  const [hoveredFactIndex, setHoveredFactIndex] = useState<number | null>(null);
  const [selectedFactIndex, setSelectedFactIndex] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const availableValues = useMemo(() => getUniqueDimensionValues(facts, schema), [facts, schema]);

  const filteredFacts = useMemo(
    () =>
      facts.filter((fact) =>
        schema.dimensions.every((dimension) => {
          const filterValue = filters[dimension.key];

          return filterValue === "All" || getDimensionValue(fact, dimension.key) === filterValue;
        }),
      ),
    [facts, filters, schema],
  );

  const pivot = useMemo(
    () => buildPivotCells(filteredFacts, schema, xDimension, yDimension, zDimension, selectedMeasure),
    [filteredFacts, schema, selectedMeasure, xDimension, yDimension, zDimension],
  );

  const pivotCellMap = useMemo(() => new Map(pivot.cells.map((cell) => [cell.id, cell])), [pivot.cells]);
  const activeCell = (activeCellId ? pivotCellMap.get(activeCellId) : null) ?? pivot.cells[0] ?? null;
  const hoveredCell = (hoveredCellId ? pivotCellMap.get(hoveredCellId) : null) ?? null;
  const drilledCell = (drilledCellId ? pivotCellMap.get(drilledCellId) : null) ?? null;

  useEffect(() => {
    void handleLoadBuiltInDataset(defaultBuiltInDatasetId);
  }, []);

  useEffect(() => {
    setActiveCellId((current) => {
      if (current && pivotCellMap.has(current)) {
        return current;
      }

      return pivot.cells[0]?.id ?? null;
    });
  }, [pivot.cells, pivotCellMap]);

  useEffect(() => {
    setHoveredCellId((current) => {
      if (current && pivotCellMap.has(current)) {
        return current;
      }

      return null;
    });
  }, [pivotCellMap]);

  useEffect(() => {
    setDrilledCellId((current) => {
      if (current && pivotCellMap.has(current)) {
        return current;
      }

      return null;
    });
  }, [pivotCellMap]);

  useEffect(() => {
    const factCount = drilledCell?.facts.length ?? 0;

    setHoveredFactIndex((current) =>
      current !== null && current >= 0 && current < factCount ? current : null,
    );
    setSelectedFactIndex((current) =>
      current !== null && current >= 0 && current < factCount ? current : null,
    );
  }, [drilledCell?.id, drilledCell?.facts.length]);

  const totals = useMemo(
    () =>
      filteredFacts.reduce<Record<string, number>>(
        (summary, fact) => {
          for (const measureOption of schema.measures) {
            summary[measureOption.key] =
              (summary[measureOption.key] ?? 0) + Number(fact[measureOption.key] ?? 0);
          }

          return summary;
        },
        Object.fromEntries(schema.measures.map((measureOption) => [measureOption.key, 0])) as Record<
          string,
          number
        >,
      ),
    [filteredFacts, schema],
  );

  const activeDimensions = useMemo(
    () =>
      activeCell === null
        ? []
        : [
            `${getDimensionLabel(schema, xDimension)}: ${activeCell.xValue}`,
            `${getDimensionLabel(schema, yDimension)}: ${activeCell.yValue}`,
            `${getDimensionLabel(schema, zDimension)}: ${activeCell.zValue}`,
          ],
    [activeCell, schema, xDimension, yDimension, zDimension],
  );

  const appliedSlices = useMemo(
    () =>
      schema.dimensions
        .filter((dimension) => filters[dimension.key] !== "All")
        .map((dimension) => `${dimension.label}: ${filters[dimension.key]}`),
    [filters, schema],
  );

  function clearFactSelection() {
    setHoveredFactIndex(null);
    setSelectedFactIndex(null);
  }

  function resetInteractionState() {
    setActiveCellId(null);
    setHoveredCellId(null);
    setDrilledCellId(null);
    clearFactSelection();
  }

  function resetViewState(nextSchema: DatasetSchema = schema) {
    setFilters(createEmptyFilters(nextSchema));
    setSelectedMeasure(nextSchema.defaultMeasure);
    setXDimension(nextSchema.defaultAxes.x);
    setYDimension(nextSchema.defaultAxes.y);
    setZDimension(nextSchema.defaultAxes.z);
    resetInteractionState();
  }

  async function handleLoadBuiltInDataset(datasetId: string) {
    const nextDataset = getBuiltInDatasetDefinition(datasetId);
    const loadId = builtInDatasetLoadIdRef.current + 1;

    builtInDatasetLoadIdRef.current = loadId;
    setSchema(nextDataset.schema);
    setDatasetLabel(nextDataset.label);
    setSelectedBuiltInDatasetId(nextDataset.id);
    setPendingUpload(null);
    setUploadError(null);
    setIsDatasetLoading(true);
    startTransition(() => {
      setFacts([]);
    });
    resetViewState(nextDataset.schema);

    try {
      const loadedDataset = await loadBuiltInDataset(nextDataset.id);

      if (builtInDatasetLoadIdRef.current !== loadId) {
        return;
      }

      startTransition(() => {
        setFacts(loadedDataset.facts);
      });
    } catch (error) {
      if (builtInDatasetLoadIdRef.current !== loadId) {
        return;
      }

      setUploadError(error instanceof Error ? error.message : "Dataset failed to load.");
    } finally {
      if (builtInDatasetLoadIdRef.current === loadId) {
        setIsDatasetLoading(false);
      }
    }
  }

  function handleSelectAggregateCell(id: string) {
    setActiveCellId(id);
    setDrilledCellId(null);
    clearFactSelection();
  }

  function handleToggleDrillCell(id: string) {
    setActiveCellId(id);
    setHoveredCellId(id);
    setDrilledCellId((current) => (current === id ? null : id));
    clearFactSelection();
  }

  function handleBackToAggregate() {
    setDrilledCellId(null);
    clearFactSelection();
  }

  function handleActivatePivotFact(cellId: string, factIndex: number) {
    setActiveCellId(cellId);
    setHoveredCellId(cellId);
    setDrilledCellId(cellId);
    setHoveredFactIndex(null);
    setSelectedFactIndex(factIndex);

    window.requestAnimationFrame(() => {
      cubeSurfaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploadParsing(true);

    try {
      const parsed = await parseCsvUploadFile(file);

      if (parsed.headers.length === 0) {
        setPendingUpload(null);
        setUploadError("CSV must include a header row.");
        return;
      }

      if (parsed.rows.length === 0) {
        setPendingUpload(null);
        setUploadError("CSV must include at least one data row.");
        return;
      }

      setPendingUpload({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        previewRows: parsed.rows.slice(0, 3),
        mapping: suggestCsvColumnMapping(parsed.headers, schema),
        parseErrors: parsed.parseErrors,
      });
      setUploadError(null);
    } catch (error) {
      setPendingUpload(null);
      setUploadError(error instanceof Error ? error.message : "CSV upload failed.");
    } finally {
      setIsUploadParsing(false);
    }
  }

  function handleMappingChange(field: string, header: string) {
    setPendingUpload((current) => {
      if (!current) {
        return current;
      }

      const nextMapping = {
        ...current.mapping,
        [field]: header,
      };

      if (header !== "") {
        for (const cubeField of getCubeFieldOptions(schema).map((option) => option.key)) {
          if (cubeField !== field && nextMapping[cubeField] === header) {
            nextMapping[cubeField] = "";
          }
        }
      }

      return {
        ...current,
        mapping: nextMapping,
      };
    });
  }

  function handleApplyUpload() {
    if (!pendingUpload || !hasCompleteCsvMapping(schema, pendingUpload.mapping)) {
      return;
    }

    const parsed = parseMappedCubeFacts(pendingUpload.rows, schema, pendingUpload.mapping);

    if (parsed.facts.length === 0) {
      setUploadError(parsed.errors.join(" "));
      return;
    }

    startTransition(() => {
      setFacts(parsed.facts);
    });
    setDatasetLabel(pendingUpload.fileName);
    setSelectedBuiltInDatasetId(null);
    setIsDatasetLoading(false);
    resetViewState(schema);
    setPendingUpload(null);

    const warnings = [...pendingUpload.parseErrors, ...parsed.errors];

    setUploadError(
      warnings.length > 0
        ? `Loaded ${parsed.facts.length} rows with ${warnings.length} warning(s). ${warnings[0]}`
        : null,
    );
  }

  function handleCancelUpload() {
    setPendingUpload(null);
    setUploadError(null);
  }

  function handleResetDataset() {
    void handleLoadBuiltInDataset(defaultBuiltInDatasetId);
  }

  function handleAxisChange(axis: "x" | "y" | "z", value: DimensionKey) {
    const nextAxes = {
      x: xDimension,
      y: yDimension,
      z: zDimension,
    };

    const conflictingAxis = (Object.entries(nextAxes) as Array<[keyof typeof nextAxes, DimensionKey]>).find(
      ([key, currentValue]) => key !== axis && currentValue === value,
    )?.[0];

    if (conflictingAxis) {
      nextAxes[conflictingAxis] = nextAxes[axis];
    }

    nextAxes[axis] = value;

    setXDimension(nextAxes.x);
    setYDimension(nextAxes.y);
    setZDimension(nextAxes.z);
  }

  function handleSwapAxes() {
    setXDimension(zDimension);
    setZDimension(xDimension);
  }

  function handleResetView() {
    resetViewState();
  }

  return {
    builtInDatasets,
    cubeSurfaceRef,
    schema,
    facts,
    datasetLabel,
    selectedBuiltInDatasetId,
    uploadError,
    isDatasetLoading,
    isUploadParsing,
    selectedMeasure,
    xDimension,
    yDimension,
    zDimension,
    filters,
    activeCellId,
    hoveredCellId,
    drilledCellId,
    hoveredFactIndex,
    selectedFactIndex,
    pendingUpload,
    availableValues,
    filteredFacts,
    pivot,
    activeCell,
    hoveredCell,
    drilledCell,
    totals,
    activeDimensions,
    appliedSlices,
    setSelectedMeasure,
    handleAxisChange,
    handleSwapAxes,
    handleFilterChange: (dimension: DimensionKey, value: string | "All") => {
      setFilters((current) => ({
        ...current,
        [dimension]: value,
      }));
    },
    handleUpload,
    handleMappingChange,
    handleApplyUpload,
    handleCancelUpload,
    handleLoadBuiltInDataset,
    handleResetDataset,
    handleResetView,
    handleSelectAggregateCell,
    handleHoverCell: setHoveredCellId,
    handleLeaveCell: () => setHoveredCellId(null),
    handleToggleDrillCell,
    handleBackToAggregate,
    handleHoverFact: setHoveredFactIndex,
    handleLeaveFact: () => setHoveredFactIndex(null),
    handleSelectFact: setSelectedFactIndex,
    handleActivatePivotFact,
  };
}
