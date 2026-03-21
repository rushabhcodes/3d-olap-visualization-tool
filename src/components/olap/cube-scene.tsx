import { useEffect, useMemo, useRef, useState, type ComponentProps, type MutableRefObject } from "react";
import { Edges, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChevronRight, Maximize2, Minimize2, Undo2 } from "lucide-react";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createMeasureScale,
  type DatasetSchema,
  formatMeasureValue,
  getDimensionLabel,
  getDimensionValue,
  getMeasureLabel,
  getMeasureMagnitudeRatio,
  getMeasureSignedRatio,
  getMeasureValue,
  type CubeFact,
  type DimensionKey,
  type Measure,
  type PivotCell,
} from "@/data/mock-cube";
import { cn } from "@/lib/utils";

type ViewPreset = "isometric" | "top" | "front" | "side";
type CameraTargetMode = "selection" | "scene";
type ProjectionMode = "perspective" | "orthographic";

type CubeSceneProps = {
  schema: DatasetSchema;
  cells: PivotCell[];
  measure: Measure;
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  xValues: string[];
  yValues: string[];
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
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  magnitudeRatio: number;
  signedRatio: number;
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
  colorLabel: string;
  fact: CubeFact;
};

type InteractiveMeshProps = ComponentProps<"mesh">;

function InteractiveMesh(props: InteractiveMeshProps) {
  return <mesh {...props} />;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPresetVector(viewPreset: ViewPreset) {
  switch (viewPreset) {
    case "top":
      return new THREE.Vector3(0.001, 1.85, 0.001).normalize();
    case "front":
      return new THREE.Vector3(0.001, 0.5, 1.6).normalize();
    case "side":
      return new THREE.Vector3(1.6, 0.5, 0.001).normalize();
    default:
      return new THREE.Vector3(1, 0.72, 1.08).normalize();
  }
}

function hashLabel(label: string) {
  return Array.from(label).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function getCategoryColor(label: string) {
  const hue = Math.abs(hashLabel(label)) % 360;

  return `hsl(${hue} 82% 61%)`;
}

function getDetailColor(label: string) {
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

function getAggregateColor(signedRatio: number, magnitudeRatio: number, active: boolean, hovered: boolean) {
  const emphasis = active ? 8 : hovered ? 4 : 0;

  if (signedRatio < 0) {
    const saturation = 52 + magnitudeRatio * 28 + emphasis;
    const lightness = 82 - magnitudeRatio * 24 - emphasis;

    return `hsl(8 ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
  }

  if (signedRatio > 0) {
    const saturation = 54 + magnitudeRatio * 32 + emphasis;
    const lightness = 77 - magnitudeRatio * 28 - emphasis;

    return `hsl(192 ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
  }

  return `hsl(210 22% ${Math.round(84 - emphasis)}%)`;
}

function collectLegendLabels(cells: PivotCell[], dimension: DimensionKey | null) {
  if (!dimension) {
    return [];
  }

  const labels = new Set<string>();

  for (const cell of cells) {
    for (const fact of cell.facts) {
      labels.add(getDimensionValue(fact, dimension));
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

function buildDetailVoxels(cell: SceneCell | null, colorDimension: DimensionKey | null): DetailVoxel[] {
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
      id: `${cell.id}-${index}`,
      factIndex: index,
      column,
      row,
      layer,
      x,
      y,
      z,
      size,
      color: getDetailColor(colorDimension ? getDimensionValue(fact, colorDimension) : `Fact ${index + 1}`),
      colorLabel: colorDimension ? getDimensionValue(fact, colorDimension) : `Fact ${index + 1}`,
      fact,
    });
  }

  return voxels;
}

function SceneRig({
  activeCell,
  drilledCell,
  maxHeight,
  sceneHeight,
  sceneSpan,
  controlsRef,
  shouldAnimateRef,
  overviewDistance,
  overviewHeight,
  drillOffset,
  orthoZoom,
  projectionMode,
  cameraTargetMode,
  viewPreset,
}: {
  activeCell: SceneCell | null;
  drilledCell: SceneCell | null;
  maxHeight: number;
  sceneHeight: number;
  sceneSpan: number;
  controlsRef: MutableRefObject<any>;
  shouldAnimateRef: MutableRefObject<boolean>;
  overviewDistance: number;
  overviewHeight: number;
  drillOffset: number;
  orthoZoom: number;
  projectionMode: ProjectionMode;
  cameraTargetMode: CameraTargetMode;
  viewPreset: ViewPreset;
}) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const desiredZoom = useRef(orthoZoom);

  useEffect(() => {
    const focusCell =
      cameraTargetMode === "selection"
        ? drilledCell ?? activeCell
        : null;
    const focusY = focusCell
      ? drilledCell
        ? Math.max(0.9, (focusCell.height ?? 1) * 0.58)
        : maxHeight * 0.36
      : maxHeight * 0.3;
    const targetY = focusCell ? (focusCell.y ?? 0) + focusY : maxHeight * 0.3;

    desiredTarget.current.set(focusCell?.x ?? 0, targetY, focusCell?.z ?? 0);

    const baseDistance = focusCell
      ? drilledCell
        ? Math.max(drillOffset * 1.12, sceneSpan * 0.44, 4.8)
        : Math.max(sceneSpan * 0.74, 6.2)
      : Math.max(overviewDistance, sceneSpan * 0.92);
    const direction = getPresetVector(viewPreset);
    const nextPosition = desiredTarget.current.clone().add(direction.multiplyScalar(baseDistance));

    if (!focusCell && viewPreset === "isometric") {
      nextPosition.set(overviewDistance, Math.max(overviewHeight, sceneHeight + 3.2), overviewDistance * 1.08);
    }

    desiredPosition.current.copy(nextPosition);
    desiredZoom.current = focusCell ? orthoZoom * 1.18 : orthoZoom;
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
    drilledCell?.y,
    maxHeight,
    sceneHeight,
    sceneSpan,
    shouldAnimateRef,
    overviewDistance,
    overviewHeight,
    drillOffset,
    orthoZoom,
    projectionMode,
    cameraTargetMode,
    viewPreset,
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

    if ("isOrthographicCamera" in camera && camera.isOrthographicCamera) {
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, desiredZoom.current, 0.1);
      camera.updateProjectionMatrix();
    }

    const targetDistance = controlsRef.current?.target.distanceToSquared(desiredTarget.current) ?? 0;

    const zoomSettled =
      "isOrthographicCamera" in camera && camera.isOrthographicCamera
        ? Math.abs(camera.zoom - desiredZoom.current) < 0.01
        : true;

    if (camera.position.distanceToSquared(desiredPosition.current) < 0.0025 && targetDistance < 0.0025 && zoomSettled) {
      camera.position.copy(desiredPosition.current);

      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTarget.current);
        controlsRef.current.update();
      } else {
        camera.lookAt(desiredTarget.current);
      }

      if ("isOrthographicCamera" in camera && camera.isOrthographicCamera) {
        camera.zoom = desiredZoom.current;
        camera.updateProjectionMatrix();
      }

      shouldAnimateRef.current = false;
    }
  });

  return null;
}

function DetailCloud({
  cell,
  voxels,
  hoveredFactIndex,
  selectedFactIndex,
  onHoverFact,
  onLeaveFact,
  onSelectFact,
  onFocusScene,
  onFocusSelection,
}: {
  cell: SceneCell;
  voxels: DetailVoxel[];
  hoveredFactIndex: number | null;
  selectedFactIndex: number | null;
  onHoverFact: (factIndex: number) => void;
  onLeaveFact: () => void;
  onSelectFact: (factIndex: number) => void;
  onFocusScene: () => void;
  onFocusSelection: () => void;
}) {
  return (
    <group position={[0, cell.height / 2, 0]}>
      <mesh position={[0, 0, 0]} raycast={() => null}>
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
          <InteractiveMesh
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
                onFocusSelection();
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
          </InteractiveMesh>
        );
      })}
    </group>
  );
}

function CubeCells({
  cells,
  drilledVoxels,
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
  onFocusSelection,
}: {
  cells: SceneCell[];
  drilledVoxels: DetailVoxel[];
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
  onFocusSelection: () => void;
}) {
  return (
    <>
      {cells.map((cell) => {
        const active = cell.id === activeCellId;
        const hovered = cell.id === hoveredCellId;
        const drilled = cell.id === drilledCellId;
        const aggregateColor = getAggregateColor(cell.signedRatio, cell.magnitudeRatio, active || drilled, hovered);
        const emissiveColor =
          active || drilled
            ? cell.signedRatio < 0
              ? "#b91c1c"
              : "#0f766e"
            : hovered
              ? cell.signedRatio < 0
                ? "#dc2626"
                : "#0891b2"
              : getAggregateColor(cell.signedRatio, Math.max(cell.magnitudeRatio - 0.2, 0), false, false);

        return (
          <group key={cell.id} position={[cell.x, cell.y, cell.z]}>
            <InteractiveMesh
              position={[0, cell.height / 2, 0]}
              castShadow
              receiveShadow
              raycast={drilled ? () => null : undefined}
              onPointerOver={
                drilled
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      onHoverCell(cell.id);
                    }
              }
              onPointerOut={
                drilled
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      onLeaveCell();
                    }
              }
              onClick={
                drilled
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      onFocusSelection();
                      onFocusScene();
                      onSelectCell(cell.id);
                      onToggleDrill(cell.id);
                    }
              }
            >
              <boxGeometry args={[cell.width, cell.height, cell.depth]} />
              <meshStandardMaterial
                color={aggregateColor}
                emissive={emissiveColor}
                emissiveIntensity={active || drilled ? 0.28 : hovered ? 0.24 : 0.11}
                metalness={0.2}
                roughness={0.22}
                transparent
                opacity={drilled ? 0.12 : active ? 0.96 : hovered ? 0.9 : 0.8}
              />
              {(active || hovered || drilled) ? (
                <Edges color={active || drilled ? "#ecfeff" : "#a5f3fc"} linewidth={1.2} />
              ) : null}
            </InteractiveMesh>
            {drilled ? (
              <DetailCloud
                cell={cell}
                voxels={drilledVoxels}
                hoveredFactIndex={hoveredFactIndex}
                selectedFactIndex={selectedFactIndex}
                onHoverFact={(factIndex) => {
                  onHoverCell(cell.id);
                  onHoverFact(factIndex);
                }}
                onLeaveFact={onLeaveFact}
                onSelectFact={onSelectFact}
                onFocusScene={onFocusScene}
                onFocusSelection={onFocusSelection}
              />
            ) : null}
          </group>
        );
      })}
    </>
  );
}

export function CubeScene({
  schema,
  cells,
  measure,
  xDimension,
  yDimension,
  zDimension,
  xValues,
  yValues,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewPreset, setViewPreset] = useState<ViewPreset>("isometric");
  const [cameraTargetMode, setCameraTargetMode] = useState<CameraTargetMode>("selection");
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>("perspective");
  const xOffset = (xValues.length - 1) / 2;
  const yLayerSpacing = 2.35;
  const zOffset = (zValues.length - 1) / 2;
  const measureScale = useMemo(() => createMeasureScale(cells.map((cell) => cell.value)), [cells]);
  const xIndexMap = useMemo(() => new Map(xValues.map((value, index) => [value, index])), [xValues]);
  const yIndexMap = useMemo(() => new Map(yValues.map((value, index) => [value, index])), [yValues]);
  const zIndexMap = useMemo(() => new Map(zValues.map((value, index) => [value, index])), [zValues]);
  const sceneCells: SceneCell[] = useMemo(
    () =>
      cells.map((cell) => {
        const magnitudeRatio = getMeasureMagnitudeRatio(cell.value, measureScale);
        const signedRatio = getMeasureSignedRatio(cell.value, measureScale);

        return {
          ...cell,
          x: ((xIndexMap.get(cell.xValue) ?? 0) - xOffset) * 1.85,
          y: (yIndexMap.get(cell.yValue) ?? 0) * yLayerSpacing,
          z: ((zIndexMap.get(cell.zValue) ?? 0) - zOffset) * 1.85,
          width: 0.72 + magnitudeRatio * 0.56,
          depth: 0.72 + magnitudeRatio * 0.56,
          height: 0.72 + magnitudeRatio * 1.32,
          magnitudeRatio,
          signedRatio,
        };
      }),
    [cells, measureScale, xIndexMap, xOffset, yIndexMap, yLayerSpacing, zIndexMap, zOffset],
  );

  const sceneCellMap = useMemo(() => new Map(sceneCells.map((cell) => [cell.id, cell])), [sceneCells]);
  const activeCell = (activeCellId ? sceneCellMap.get(activeCellId) : null) ?? null;
  const drilledCell = (drilledCellId ? sceneCellMap.get(drilledCellId) : null) ?? null;
  const detailColorDimension = schema.dimensions.find((dimension) => ![xDimension, yDimension, zDimension].includes(dimension.key))?.key
    ?? schema.detailColorDimension
    ?? null;
  const drilledVoxels = useMemo(
    () => buildDetailVoxels(drilledCell, detailColorDimension),
    [detailColorDimension, drilledCell],
  );
  const selectedVoxel = drilledVoxels.find((voxel) => voxel.factIndex === selectedFactIndex) ?? null;
  const hoveredVoxel =
    selectedFactIndex === null
      ? drilledVoxels.find((voxel) => voxel.factIndex === hoveredFactIndex) ?? null
      : null;
  const detailVoxel = selectedVoxel ?? hoveredVoxel;
  const detailColorLabels = useMemo(
    () => collectLegendLabels(cells, detailColorDimension),
    [cells, detailColorDimension],
  );
  const maxHeight = Math.max(...sceneCells.map((cell) => cell.height), 2.2);
  const sceneHeight = Math.max(2.8, (yValues.length - 1) * yLayerSpacing + maxHeight);
  const sceneWidth = Math.max(7.2, xValues.length * 2 + 1.8);
  const sceneDepth = Math.max(7.2, zValues.length * 2 + 1.8);
  const sceneSpan = Math.max(sceneWidth, sceneDepth);
  const overviewDistance = Math.max(7.2, sceneSpan * 0.78);
  const overviewHeight = Math.max(6.8, sceneHeight + sceneSpan * 0.16);
  const drillOffset = Math.max(2.6, sceneSpan * 0.2);
  const orbitMaxDistance = Math.max(16, sceneSpan * 1.95);
  const orthoZoom = Math.max(24, 84 - sceneSpan * 3.4);

  function focusScene() {
    sceneRef.current?.focus();
  }

  function handleResetCamera() {
    setViewPreset("isometric");
    setCameraTargetMode("selection");
    setProjectionMode("perspective");
    shouldAnimateRef.current = true;
    focusScene();
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === sceneRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isFullscreen]);

  async function handleToggleFullscreen() {
    const element = sceneRef.current;

    if (!element) {
      return;
    }

    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
      return;
    }

    await element.requestFullscreen();
    focusScene();
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
      className="relative h-[760px] w-full overflow-hidden rounded-[1.75rem] border border-cyan-200 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 data-[fullscreen=true]:h-screen data-[fullscreen=true]:rounded-none"
      data-fullscreen={isFullscreen}
      role="application"
      aria-label="3D cube scene"
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
          <div className="flex flex-wrap gap-2">
            {(["selection", "scene"] as const).map((mode) => (
              <Button
                key={mode}
                variant="outline"
                size="sm"
                className={cn(
                  "border-slate-200 bg-white text-slate-700",
                  cameraTargetMode === mode && "border-cyan-400 bg-cyan-50 text-cyan-900",
                )}
                onClick={() => {
                  setCameraTargetMode(mode);
                  shouldAnimateRef.current = true;
                  focusScene();
                }}
              >
                {mode === "selection" ? "Selected" : "Scene"}
              </Button>
            ))}
            {(["isometric", "top", "front", "side"] as const).map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className={cn(
                  "border-slate-200 bg-white text-slate-700",
                  viewPreset === preset && "border-cyan-400 bg-cyan-50 text-cyan-900",
                )}
                onClick={() => {
                  setViewPreset(preset);
                  shouldAnimateRef.current = true;
                  focusScene();
                }}
              >
                {preset === "isometric"
                  ? "Iso"
                  : preset.charAt(0).toUpperCase() + preset.slice(1)}
              </Button>
            ))}
            {(["perspective", "orthographic"] as const).map((mode) => (
              <Button
                key={mode}
                variant="outline"
                size="sm"
                className={cn(
                  "border-slate-200 bg-white text-slate-700",
                  projectionMode === mode && "border-cyan-400 bg-cyan-50 text-cyan-900",
                )}
                onClick={() => {
                  setProjectionMode(mode);
                  shouldAnimateRef.current = true;
                  focusScene();
                }}
              >
                {mode === "perspective" ? "Perspective" : "Ortho"}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={handleResetCamera}>
              Reset Camera
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              X: {getDimensionLabel(schema, xDimension)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              Y: {getDimensionLabel(schema, yDimension)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              Z: {getDimensionLabel(schema, zDimension)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              {getMeasureLabel(schema, measure)} {measureScale.hasNegative ? "signed scale" : "intensity"}
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-700">
              {projectionMode === "perspective" ? "Perspective" : "Orthographic"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">Aggregate</span>
              <div
                className="h-2 w-24 rounded-full"
                style={{
                  backgroundImage: measureScale.hasNegative
                    ? "linear-gradient(90deg,#fca5a5 0%,#e2e8f0 50%,#67e8f9 100%)"
                    : "linear-gradient(90deg,#d9f99d 0%,#67e8f9 45%,#0f766e 100%)",
                }}
              />
              <span>{measureScale.hasNegative ? "negative" : "low"}</span>
              <span>{measureScale.hasNegative ? "positive" : "high"}</span>
            </div>
            {detailColorLabels.length > 0 && detailColorDimension ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{getDimensionLabel(schema, detailColorDimension)}</span>
                {detailColorLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getDetailColor(label) }}
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
                  {getDimensionLabel(schema, xDimension)}: {drilledCell.xValue}
                </Badge>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
                  {getDimensionLabel(schema, yDimension)}: {drilledCell.yValue}
                </Badge>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
                  {getDimensionLabel(schema, zDimension)}: {drilledCell.zValue}
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
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="pointer-events-auto inline-flex h-10 items-center justify-center rounded-xl border border-white/70 bg-white/85 px-3 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            onClick={() => {
              void handleToggleFullscreen();
            }}
          >
            {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <div className="pointer-events-none rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm backdrop-blur">
            {drilledCell ? `${drilledCell.count} contributing voxel(s)` : `${cells.length} visible cube cell(s)`}
          </div>
        </div>
      </div>
      {detailVoxel ? (
        <div className="pointer-events-none absolute right-5 top-44 z-10 w-[240px] rounded-2xl border border-cyan-200 bg-white/95 px-4 py-3 text-[11px] text-slate-700 shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {schema.dimensions
                  .slice(0, 2)
                  .map((dimension) => getDimensionValue(detailVoxel.fact, dimension.key))
                  .join(" • ")}
              </p>
              {schema.dimensions.slice(2).length > 0 ? (
                <p className="mt-1 text-slate-600">
                  {schema.dimensions
                    .slice(2)
                    .map((dimension) => `${dimension.label}: ${getDimensionValue(detailVoxel.fact, dimension.key)}`)
                    .join(" / ")}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-800">
              {selectedVoxel ? "Pinned" : "Preview"}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {schema.measures.map((measureOption) => (
              <div key={measureOption.key} className="rounded-xl bg-slate-100 px-3 py-2">
                <p className="uppercase tracking-[0.12em] text-slate-500">{measureOption.label}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatMeasureValue(getMeasureValue(detailVoxel.fact, measureOption.key), measureOption.key, schema)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-cyan-700">
            {getMeasureLabel(schema, measure)} contributes {formatMeasureValue(getMeasureValue(detailVoxel.fact, measure), measure, schema)}.
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Use arrow keys to move across neighboring voxels.</p>
        </div>
      ) : null}
      {sceneCells.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-slate-600">
          No facts match the current slice. Adjust a filter or upload a wider dataset.
        </div>
      ) : null}
      <Canvas
        key={`${isFullscreen ? "fullscreen" : "inline"}-${projectionMode}`}
        orthographic={projectionMode === "orthographic"}
        camera={
          projectionMode === "orthographic"
            ? { position: [overviewDistance, overviewHeight, overviewDistance * 1.08], zoom: orthoZoom, near: 0.1, far: 200 }
            : { position: [overviewDistance, overviewHeight, overviewDistance * 1.08], fov: 40, near: 0.1, far: 200 }
        }
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
          sceneHeight={sceneHeight}
          sceneSpan={sceneSpan}
          controlsRef={controlsRef}
          shouldAnimateRef={shouldAnimateRef}
          overviewDistance={overviewDistance}
          overviewHeight={overviewHeight}
          drillOffset={drillOffset}
          orthoZoom={orthoZoom}
          projectionMode={projectionMode}
          cameraTargetMode={cameraTargetMode}
          viewPreset={viewPreset}
        />
        <gridHelper
          args={[Math.max(sceneWidth, sceneDepth), 10, "#7dd3fc", "#cbd5e1"]}
          position={[0, 0, 0]}
        />
        <CubeCells
          cells={sceneCells}
          drilledVoxels={drilledVoxels}
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
          onFocusSelection={() => setCameraTargetMode("selection")}
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
        <span>{yValues.length} y-axis buckets</span>
        <span>{zValues.length} z-axis buckets</span>
        <span>{drilledCell ? `${drilledCell.count} detail voxels open` : `${sceneCells.length} visible cells`}</span>
      </div>
    </div>
  );
}
