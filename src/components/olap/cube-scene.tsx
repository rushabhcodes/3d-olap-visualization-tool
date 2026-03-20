import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { CubeFact, DimensionKey, Measure, PivotCell } from "@/data/mock-cube";

type CubeSceneProps = {
  cells: PivotCell[];
  measure: Measure;
  xDimension: DimensionKey;
  zDimension: DimensionKey;
  xValues: string[];
  zValues: string[];
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
};

type SceneCell = PivotCell & {
  x: number;
  z: number;
  height: number;
  normalizedValue: number;
};

type DetailVoxel = {
  id: string;
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

function buildDetailVoxels(cell: SceneCell | null): DetailVoxel[] {
  if (!cell || cell.facts.length === 0) {
    return [];
  }

  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(cell.facts.length))));
  const depth = Math.min(3, Math.max(1, Math.ceil(cell.facts.length / columns)));
  const layerCapacity = columns * depth;
  const layers = Math.max(1, Math.ceil(cell.facts.length / layerCapacity));
  const usableWidth = 0.82;
  const usableDepth = 0.82;
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
      x,
      y,
      z,
      size,
      color: getCategoryColor(fact.scenario),
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

    const targetDistance =
      controlsRef.current?.target.distanceToSquared(desiredTarget.current) ?? 0;

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
  hoveredVoxelId,
  onHoverVoxel,
  onLeaveVoxel,
}: {
  cell: SceneCell;
  hoveredVoxelId: string | null;
  onHoverVoxel: (voxelId: string) => void;
  onLeaveVoxel: () => void;
}) {
  const voxels = buildDetailVoxels(cell);
  const hoveredVoxel = voxels.find((voxel) => voxel.id === hoveredVoxelId) ?? null;

  return (
    <group position={[0, cell.height / 2, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.24, cell.height + 0.04, 1.24]} />
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
      {voxels.map((voxel) => (
        <mesh
          key={voxel.id}
          position={[voxel.x, voxel.y, voxel.z]}
          castShadow
          onPointerOver={(event) => {
            event.stopPropagation();
            onHoverVoxel(voxel.id);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            onLeaveVoxel();
          }}
        >
          <boxGeometry args={[voxel.size, voxel.size, voxel.size]} />
          <meshStandardMaterial
            color={voxel.color}
            emissive={voxel.color}
            emissiveIntensity={hoveredVoxelId === voxel.id ? 0.34 : 0.18}
            metalness={0.24}
            roughness={0.3}
          />
        </mesh>
      ))}
      {hoveredVoxel ? (
        <Html
          position={[hoveredVoxel.x, hoveredVoxel.y + hoveredVoxel.size * 1.5, hoveredVoxel.z]}
          center
          distanceFactor={7}
        >
          <div className="min-w-[180px] rounded-xl border border-cyan-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur">
            <p className="font-semibold text-slate-900">{hoveredVoxel.fact.month} • {hoveredVoxel.fact.scenario}</p>
            <p className="mt-1">{hoveredVoxel.fact.region} / {hoveredVoxel.fact.productLine}</p>
            <p className="mt-1 text-cyan-700">Represents one contributing fact row</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function CubeCells({
  cells,
  activeCellId,
  hoveredCellId,
  drilledCellId,
  hoveredVoxelId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
  onToggleDrill,
  onHoverVoxel,
  onLeaveVoxel,
}: {
  cells: SceneCell[];
  activeCellId: string | null;
  hoveredCellId: string | null;
  drilledCellId: string | null;
  hoveredVoxelId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
  onToggleDrill: (id: string) => void;
  onHoverVoxel: (voxelId: string) => void;
  onLeaveVoxel: () => void;
}) {
  return (
    <>
      {cells.map((cell, index) => {
        const active = cell.id === activeCellId;
        const hovered = cell.id === hoveredCellId;
        const drilled = cell.id === drilledCellId;
        const baseHue = 182 + index * 9;

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
                onSelectCell(cell.id);
                onToggleDrill(cell.id);
              }}
            >
              <boxGeometry args={[1.08, cell.height, 1.08]} />
              <meshStandardMaterial
                color={`hsl(${baseHue} 82% ${active ? "48%" : hovered ? "52%" : "60%"})`}
                emissive={active ? "#0f766e" : hovered ? "#22d3ee" : "#083344"}
                emissiveIntensity={active ? 0.26 : hovered ? 0.24 : 0.1}
                metalness={0.2}
                roughness={0.22}
                transparent
                opacity={active ? 0.94 : hovered ? 0.9 : 0.78}
              />
              {(active || hovered) ? (
                <Edges color={active ? "#f8fafc" : "#a5f3fc"} linewidth={1.2} />
              ) : null}
            </mesh>
            {drilled ? (
              <DetailCloud
                cell={cell}
                hoveredVoxelId={hoveredVoxelId}
                onHoverVoxel={onHoverVoxel}
                onLeaveVoxel={onLeaveVoxel}
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
  onHoverCell,
  onLeaveCell,
  onSelectCell,
}: CubeSceneProps) {
  const [drilledCellId, setDrilledCellId] = useState<string | null>(null);
  const [hoveredVoxelId, setHoveredVoxelId] = useState<string | null>(null);
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
      height: 0.85 + normalizedValue * 3.4,
      normalizedValue,
    };
  });

  const activeCell = sceneCells.find((cell) => cell.id === activeCellId) ?? null;
  const drilledCell = sceneCells.find((cell) => cell.id === drilledCellId) ?? null;
  const maxHeight = Math.max(...sceneCells.map((cell) => cell.height), 2.2);
  const sceneWidth = Math.max(7.2, xValues.length * 2 + 1.8);
  const sceneDepth = Math.max(7.2, zValues.length * 2 + 1.8);
  const sceneSpan = Math.max(sceneWidth, sceneDepth);
  const overviewDistance = Math.max(7.2, sceneSpan * 0.78);
  const overviewHeight = Math.max(5.6, maxHeight + sceneSpan * 0.16);
  const drillOffset = Math.max(2.6, sceneSpan * 0.2);
  const orbitMaxDistance = Math.max(16, sceneSpan * 1.95);

  useEffect(() => {
    setDrilledCellId((current) => {
      if (!current) {
        return null;
      }

      return cells.some((cell) => cell.id === current) ? current : null;
    });
    setHoveredVoxelId(null);
  }, [cells]);

  return (
    <div className="relative h-[600px] overflow-hidden rounded-[1.75rem] border border-cyan-200 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 text-xs text-slate-600">
        <span>
          {getDimensionLabel(xDimension)} by {getDimensionLabel(zDimension)}
        </span>
        <span>{measure} intensity</span>
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
          setDrilledCellId(null);
          setHoveredVoxelId(null);
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
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          drilledCellId={drilledCellId}
          hoveredVoxelId={hoveredVoxelId}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
          onToggleDrill={(id) => {
            setDrilledCellId((current) => (current === id ? null : id));
            setHoveredVoxelId(null);
          }}
          onHoverVoxel={setHoveredVoxelId}
          onLeaveVoxel={() => setHoveredVoxelId(null)}
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
