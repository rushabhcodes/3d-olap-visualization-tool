import { useEffect, useRef, type MutableRefObject } from "react";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChevronRight, Undo2 } from "lucide-react";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMeasureValue,
  getMeasureValue,
  type CubeFact,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";

type CubeSceneProps = {
  cells: PivotCell[];
  measure: Measure;
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  xValues: string[];
  zValues: string[];
  activeCellId: string | null;
  hoveredCellId: string | null;
  drilledCellId: string | null;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
  onToggleDrillCell: (id: string) => void;
  onBackToAggregate: () => void;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
};

type SceneCell = PivotCell & {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  normalizedValue: number;
};

type DetailVoxel = {
  id: string;
  factIndex: number;
  column: number;
  row: number;
  layer: number;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  fact: CubeFact;
};

function getDimensionLabel(dimension: DimensionKey) {
  switch (dimension) {
    case "region":
      return "Region";
    case "productLine":
      return "Product Line";
    case "scenario":
      return "Scenario";
    case "month":
      return "Month";
    default:
      return dimension;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashLabel(label: string) {
  return Array.from(label).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function getCategoryColor(label: string) {
  const hue = Math.abs(hashLabel(label)) % 360;

  return `hsl(${hue} 82% 61%)`;
}

function getScenarioColor(label: string) {
  switch (label) {
    case "Actual":
      return "#0891b2";
    case "Plan":
      return "#d97706";
    case "Forecast":
      return "#dc2626";
    default:
      return getCategoryColor(label);
  }
}

function getAggregateColor(normalizedValue: number, active: boolean, hovered: boolean) {
  const saturation = 54 + normalizedValue * 32 + (active ? 8 : hovered ? 4 : 0);
  const lightness = 77 - normalizedValue * 28 - (active ? 9 : hovered ? 4 : 0);

  return `hsl(192 ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
}

function collectScenarioLabels(cells: PivotCell[]) {
  const labels = new Set<string>();

  for (const cell of cells) {
    for (const fact of cell.facts) {
      labels.add(fact.scenario);
    }
  }

  return Array.from(labels);
}

function getNextVoxelIndex(
  voxels: DetailVoxel[],
  currentIndex: number | null,
  direction: "left" | "right" | "up" | "down",
) {
  if (voxels.length === 0) {
    return null;
  }

  if (currentIndex === null) {
    return direction === "left" || direction === "up"
      ? voxels[voxels.length - 1]?.factIndex ?? null
      : voxels[0]?.factIndex ?? null;
  }

  const currentVoxel = voxels.find((voxel) => voxel.factIndex === currentIndex) ?? null;

  if (!currentVoxel) {
    return voxels[0]?.factIndex ?? null;
  }

  const originVoxel = currentVoxel;

  const axis = direction === "left" || direction === "right" ? "column" : "row";
  const orthogonalAxis = axis === "column" ? "row" : "column";
  const sign = direction === "left" || direction === "up" ? -1 : 1;

  function scoreVoxel(voxel: DetailVoxel) {
    const primaryDelta = (voxel[axis] - originVoxel[axis]) * sign;

    if (primaryDelta <= 0) {
      return null;
    }

    return {
      voxel,
      sameLayer: voxel.layer === originVoxel.layer ? 0 : Math.abs(voxel.layer - originVoxel.layer) * 1000,
      orthogonal: Math.abs(voxel[orthogonalAxis] - originVoxel[orthogonalAxis]) * 100,
      primary: primaryDelta,
    };
  }

  const forwardCandidate = voxels
    .filter((voxel) => voxel.factIndex !== originVoxel.factIndex)
    .map(scoreVoxel)
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => {
      if (left.sameLayer !== right.sameLayer) {
        return left.sameLayer - right.sameLayer;
      }

      if (left.orthogonal !== right.orthogonal) {
        return left.orthogonal - right.orthogonal;
      }

      return left.primary - right.primary;
    })[0];

  if (forwardCandidate) {
    return forwardCandidate.voxel.factIndex;
  }

  const wrapCandidates = voxels
    .filter((voxel) => voxel.factIndex !== originVoxel.factIndex)
    .map((voxel) => ({
      voxel,
      sameLayer: voxel.layer === originVoxel.layer ? 0 : Math.abs(voxel.layer - originVoxel.layer) * 1000,
      orthogonal: Math.abs(voxel[orthogonalAxis] - originVoxel[orthogonalAxis]) * 100,
      edge: voxel[axis],
    }))
    .sort((left, right) => {
      if (left.sameLayer !== right.sameLayer) {
        return left.sameLayer - right.sameLayer;
      }

      if (left.orthogonal !== right.orthogonal) {
        return left.orthogonal - right.orthogonal;
      }

      return direction === "left" || direction === "up"
        ? right.edge - left.edge
        : left.edge - right.edge;
    })[0];

  return wrapCandidates?.voxel.factIndex ?? originVoxel.factIndex;
}

function buildDetailVoxels(cell: SceneCell | null): DetailVoxel[] {
  if (!cell || cell.facts.length === 0) {
    return [];
  }

  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(cell.facts.length))));
  const depth = Math.min(3, Math.max(1, Math.ceil(cell.facts.length / columns)));
  const layerCapacity = columns * depth;
  const layers = Math.max(1, Math.ceil(cell.facts.length / layerCapacity));
  const usableWidth = Math.max(0.52, cell.width - 0.26);
  const usableDepth = Math.max(0.52, cell.depth - 0.26);
  const usableHeight = Math.max(0.95, cell.height - 0.52);
  const size = clamp(
    Math.min(usableWidth / columns, usableDepth / depth, usableHeight / layers) * 0.66,
    0.12,
    0.28,
  );
  const voxels: DetailVoxel[] = [];

  for (let index = 0; index < cell.facts.length; index += 1) {
    const fact = cell.facts[index];
    const layer = Math.floor(index / layerCapacity);
    const slot = index % layerCapacity;
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const x = ((column + 0.5) / columns - 0.5) * usableWidth;
    const z = ((row + 0.5) / depth - 0.5) * usableDepth;
    const yBand = usableHeight / layers;
    const y = -cell.height / 2 + 0.26 + yBand * (layer + 0.5);

      voxels.push({
        id: `${cell.id}-${fact.month}-${fact.scenario}-${index}`,
        factIndex: index,
        column,
        row,
        layer,
        x,
        y,
        z,
        size,
        color: getScenarioColor(fact.scenario),
        fact,
      });
  }

  return voxels;
}

function SceneRig({
  activeCell,
  drilledCell,
  maxHeight,
  controlsRef,
  shouldAnimateRef,
  overviewDistance,
  overviewHeight,
  drillOffset,
}: {
  activeCell: SceneCell | null;
  drilledCell: SceneCell | null;
  maxHeight: number;
  controlsRef: MutableRefObject<any>;
  shouldAnimateRef: MutableRefObject<boolean>;
  overviewDistance: number;
  overviewHeight: number;
  drillOffset: number;
}) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    const focusCell = drilledCell ?? activeCell;
    const focusY = drilledCell ? Math.max(0.9, (focusCell?.height ?? 1) * 0.58) : maxHeight * 0.36;

    desiredTarget.current.set(focusCell?.x ?? 0, focusY, focusCell?.z ?? 0);

    if (drilledCell) {
      desiredPosition.current.set(
        drilledCell.x + drillOffset,
        Math.max(3.6, drilledCell.height + 1.4),
        drilledCell.z + drillOffset * 1.12,
      );
    } else {
      desiredPosition.current.set(overviewDistance, overviewHeight, overviewDistance * 1.08);
    }
    shouldAnimateRef.current = true;
  }, [
    activeCell?.id,
    activeCell?.x,
    activeCell?.z,
    activeCell?.height,
    drilledCell?.id,
    drilledCell?.x,
    drilledCell?.z,
    drilledCell?.height,
    maxHeight,
    shouldAnimateRef,
    overviewDistance,
    overviewHeight,
    drillOffset,
  ]);

  useFrame(() => {
    if (!shouldAnimateRef.current) {
      return;
    }

    camera.position.lerp(desiredPosition.current, 0.08);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, 0.1);
      controlsRef.current.update();
    } else {
      camera.lookAt(desiredTarget.current);
    }

    const targetDistance = controlsRef.current?.target.distanceToSquared(desiredTarget.current) ?? 0;

    if (camera.position.distanceToSquared(desiredPosition.current) < 0.0025 && targetDistance < 0.0025) {
      camera.position.copy(desiredPosition.current);

      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTarget.current);
        controlsRef.current.update();
      } else {
        camera.lookAt(desiredTarget.current);
      }

      shouldAnimateRef.current = false;
    }
  });

  return null;
}

function DetailCloud({
  cell,
  voxels,
  measure,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
  onFocusScene,
}: {
  cell: SceneCell;
  voxels: DetailVoxel[];
  measure: Measure;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
  onFocusScene: () => void;
}) {
  const tooltipVoxel =
    voxels.find((voxel) => voxel.factIndex === selectedFactIndex) ??
    voxels.find((voxel) => voxel.factIndex === hoveredFactIndex) ??
    null;

  return (
    <group position={[0, cell.height / 2, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[cell.width + 0.16, cell.height + 0.04, cell.depth + 0.16]} />
        <meshPhysicalMaterial
          color="#67e8f9"
          transparent
          opacity={0.12}
          roughness={0.12}
          metalness={0.18}
          transmission={0.08}
        />
        <Edges color="#06b6d4" linewidth={1.4} />
      </mesh>
      {voxels.map((voxel) => {
        const selected = selectedFactIndex === voxel.factIndex;
        const hovered = hoveredFactIndex === voxel.factIndex;

        return (
          <mesh
            key={voxel.id}
            position={[voxel.x, voxel.y, voxel.z]}
            castShadow
            onPointerOver={(event) => {
              event.stopPropagation();
              onHoverFact(voxel.factIndex);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              onLeaveFact();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onFocusScene();
              onSelectFact(voxel.factIndex);
            }}
          >
            <boxGeometry args={[voxel.size, voxel.size, voxel.size]} />
            <meshStandardMaterial
              color={voxel.color}
              emissive={voxel.color}
              emissiveIntensity={selected ? 0.42 : hovered ? 0.34 : 0.18}
              metalness={0.24}
              roughness={0.3}
            />
            {(selected || hovered) ? (
              <Edges color={selected ? "#fef3c7" : "#cffafe"} linewidth={1.2} />
            ) : null}
          </mesh>
        );
      })}
      {tooltipVoxel ? (
        <Html
          position={[tooltipVoxel.x, tooltipVoxel.y + tooltipVoxel.size * 1.5, tooltipVoxel.z]}
          center
          distanceFactor={7}
        >
          <div className="min-w-[220px] rounded-xl border border-cyan-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">
                {tooltipVoxel.fact.month} • {tooltipVoxel.fact.scenario}
              </p>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-800">
                {selectedFactIndex === tooltipVoxel.factIndex ? "Pinned" : "Preview"}
              </span>
            </div>
            <p className="mt-1 text-slate-600">
              {tooltipVoxel.fact.region} / {tooltipVoxel.fact.productLine}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg bg-slate-100 px-2 py-1">
                <p className="uppercase tracking-[0.12em] text-slate-500">Revenue</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {formatMeasureValue(tooltipVoxel.fact.revenue, "Revenue")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 px-2 py-1">
                <p className="uppercase tracking-[0.12em] text-slate-500">Margin</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {formatMeasureValue(tooltipVoxel.fact.margin, "Margin")}
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 px-2 py-1">
                <p className="uppercase tracking-[0.12em] text-slate-500">Units</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {formatMeasureValue(tooltipVoxel.fact.units, "Units")}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-cyan-700">
              {measure} contributes {formatMeasureValue(getMeasureValue(tooltipVoxel.fact, measure), measure)}.
            </p>
            <p className="mt-1 text-[10px] text-slate-500">Use arrow keys to move across neighboring voxels.</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function CubeCells({
  cells,
  drilledVoxels,
  measure,
  activeCellId,
  hoveredCellId,
  drilledCellId,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
  onToggleDrill,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
  onFocusScene,
}: {
  cells: SceneCell[];
  drilledVoxels: DetailVoxel[];
  measure: Measure;
  activeCellId: string | null;
  hoveredCellId: string | null;
  drilledCellId: string | null;
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
  onToggleDrill: (id: string) => void;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
  onFocusScene: () => void;
}) {
  return (
    <>
      {cells.map((cell) => {
        const active = cell.id === activeCellId;
        const hovered = cell.id === hoveredCellId;
        const drilled = cell.id === drilledCellId;
        const aggregateColor = getAggregateColor(cell.normalizedValue, active || drilled, hovered);
        const emissiveColor =
          active || drilled
            ? "#0f766e"
            : hovered
              ? "#0891b2"
              : getAggregateColor(Math.max(cell.normalizedValue - 0.2, 0), false, false);

        return (
          <group key={cell.id} position={[cell.x, 0, cell.z]}>
            <mesh
              position={[0, cell.height / 2, 0]}
              castShadow
              receiveShadow
              onPointerOver={(event) => {
                event.stopPropagation();
                onHoverCell(cell.id);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                onLeaveCell();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onFocusScene();
                onSelectCell(cell.id);
                onToggleDrill(cell.id);
              }}
            >
              <boxGeometry args={[cell.width, cell.height, cell.depth]} />
              <meshStandardMaterial
                color={aggregateColor}
                emissive={emissiveColor}
                emissiveIntensity={active || drilled ? 0.28 : hovered ? 0.24 : 0.11}
                metalness={0.2}
                roughness={0.22}
                transparent
                opacity={active || drilled ? 0.96 : hovered ? 0.9 : 0.8}
              />
              {(active || hovered || drilled) ? (
                <Edges color={active || drilled ? "#ecfeff" : "#a5f3fc"} linewidth={1.2} />
              ) : null}
            </mesh>
            {drilled ? (
              <DetailCloud
                cell={cell}
                voxels={drilledVoxels}
                measure={measure}
                hoveredFactIndex={hoveredFactIndex}
                selectedFactIndex={selectedFactIndex}
                onHoverFact={(factIndex) => {
                  onHoverCell(cell.id);
                  onHoverFact(factIndex);
                }}
                onLeaveFact={onLeaveFact}
                onSelectFact={onSelectFact}
                onFocusScene={onFocusScene}
              />
            ) : null}
          </group>
        );
      })}
    </>
  );
}

export function CubeScene({
  cells,
  measure,
  xDimension,
  zDimension,
  xValues,
  zValues,
  activeCellId,
  hoveredCellId,
  drilledCellId,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
  onToggleDrillCell,
  onBackToAggregate,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
}: CubeSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const shouldAnimateRef = useRef(true);
  const xOffset = (xValues.length - 1) / 2;
  const zOffset = (zValues.length - 1) / 2;
  const maxValue = Math.max(...cells.map((cell) => cell.value), 1);
  const sceneCells: SceneCell[] = cells.map((cell) => {
    const normalizedValue = cell.value / maxValue;

    return {
      ...cell,
      x: (xValues.indexOf(cell.xValue) - xOffset) * 1.85,
      z: (zValues.indexOf(cell.zValue) - zOffset) * 1.85,
      width: 0.72 + normalizedValue * 0.56,
      depth: 0.72 + normalizedValue * 0.56,
      height: 0.85 + normalizedValue * 3.4,
      normalizedValue,
    };
  });

  const activeCell = sceneCells.find((cell) => cell.id === activeCellId) ?? null;
  const drilledCell = sceneCells.find((cell) => cell.id === drilledCellId) ?? null;
  const drilledVoxels = buildDetailVoxels(drilledCell);
  const scenarioLabels = collectScenarioLabels(cells);
  const maxHeight = Math.max(...sceneCells.map((cell) => cell.height), 2.2);
  const sceneWidth = Math.max(7.2, xValues.length * 2 + 1.8);
  const sceneDepth = Math.max(7.2, zValues.length * 2 + 1.8);
  const sceneSpan = Math.max(sceneWidth, sceneDepth);
  const overviewDistance = Math.max(7.2, sceneSpan * 0.78);
  const overviewHeight = Math.max(5.6, maxHeight + sceneSpan * 0.16);
  const drillOffset = Math.max(2.6, sceneSpan * 0.2);
  const orbitMaxDistance = Math.max(16, sceneSpan * 1.95);

  function focusScene() {
    sceneRef.current?.focus();
  }

  function handleStepSelection(direction: "left" | "right" | "up" | "down") {
    if (!drilledCell || drilledVoxels.length === 0) {
      return;
    }

    const currentIndex = selectedFactIndex ?? hoveredFactIndex;
    const nextIndex = getNextVoxelIndex(drilledVoxels, currentIndex, direction);

    if (nextIndex === null) {
      return;
    }

    focusScene();
    onSelectFact(nextIndex);
  }

  return (
    <div
      ref={sceneRef}
      className="relative h-[760px] overflow-hidden rounded-[1.75rem] border border-cyan-200 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onLeaveCell();
          onLeaveFact();
          onBackToAggregate();
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleStepSelection("right");
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handleStepSelection("left");
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          handleStepSelection("up");
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          handleStepSelection("down");
        }
      }}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="pointer-events-auto space-y-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              {getDimensionLabel(xDimension)} by {getDimensionLabel(zDimension)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              {measure} intensity
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">Aggregate</span>
              <div className="h-2 w-24 rounded-full bg-[linear-gradient(90deg,#d9f99d_0%,#67e8f9_45%,#0f766e_100%)]" />
              <span>low</span>
              <span>high</span>
            </div>
            {scenarioLabels.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">Scenario</span>
                {scenarioLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getScenarioColor(label) }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-medium text-slate-900">Drill path</span>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              Aggregate
            </Badge>
            {drilledCell ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
                  {getDimensionLabel(xDimension)}: {drilledCell.xValue}
                </Badge>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
                  {getDimensionLabel(zDimension)}: {drilledCell.zValue}
                </Badge>
                {selectedFactIndex !== null ? (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                      Fact {selectedFactIndex + 1}
                    </Badge>
                  </>
                ) : null}
              </>
            ) : (
              <span>Click a cube block to open its interior voxels.</span>
            )}
          </div>
          {drilledCell ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onBackToAggregate}>
                <Undo2 className="mr-2 h-4 w-4" />
                Back to aggregate
              </Button>
              <span className="text-[11px] text-slate-500">
                Click a voxel to pin it, use arrow keys to move spatially, and press Esc to exit drill.
              </span>
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm backdrop-blur">
          {drilledCell ? `${drilledCell.count} contributing voxel(s)` : `${cells.length} visible cube cell(s)`}
        </div>
      </div>
      {sceneCells.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-slate-600">
          No facts match the current slice. Adjust a filter or upload a wider dataset.
        </div>
      ) : null}
      <Canvas
        camera={{ position: [overviewDistance, overviewHeight, overviewDistance * 1.08], fov: 40 }}
        shadows
        onPointerMissed={() => {
          onLeaveCell();
          onLeaveFact();
        }}
      >
        <color attach="background" args={["#f8fafc"]} />
        <fog attach="fog" args={["#f8fafc", 8, 20]} />
        <ambientLight intensity={1.05} />
        <directionalLight
          castShadow
          intensity={1.4}
          position={[7, 8, 6]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight intensity={14} position={[-5, 3, -2]} color="#06b6d4" />
        <pointLight intensity={10} position={[3, 5, 5]} color="#f59e0b" />
        <SceneRig
          activeCell={activeCell}
          drilledCell={drilledCell}
          maxHeight={maxHeight}
          controlsRef={controlsRef}
          shouldAnimateRef={shouldAnimateRef}
          overviewDistance={overviewDistance}
          overviewHeight={overviewHeight}
          drillOffset={drillOffset}
        />
        <gridHelper
          args={[Math.max(sceneWidth, sceneDepth), 10, "#7dd3fc", "#cbd5e1"]}
          position={[0, 0, 0]}
        />
        <CubeCells
          cells={sceneCells}
          drilledVoxels={drilledVoxels}
          measure={measure}
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          drilledCellId={drilledCellId}
          hoveredFactIndex={hoveredFactIndex}
          selectedFactIndex={selectedFactIndex}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
          onToggleDrill={onToggleDrillCell}
          onHoverFact={onHoverFact}
          onLeaveFact={onLeaveFact}
          onSelectFact={onSelectFact}
          onFocusScene={focusScene}
        />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
          <planeGeometry args={[sceneWidth + 2, sceneDepth + 2]} />
          <shadowMaterial opacity={0.14} />
        </mesh>
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableDamping
          minDistance={4.2}
          maxDistance={orbitMaxDistance}
          maxPolarAngle={Math.PI / 2.08}
          onStart={() => {
            shouldAnimateRef.current = false;
          }}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-4 text-xs text-slate-500">
        <span>{xValues.length} x-axis buckets</span>
        <span>{zValues.length} z-axis buckets</span>
        <span>{drilledCell ? `${drilledCell.count} detail voxels open` : `${sceneCells.length} visible cells`}</span>
      </div>
    </div>
  );
}
