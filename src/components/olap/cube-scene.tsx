import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";

import type { DimensionKey, Measure, PivotCell } from "@/data/mock-cube";

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

type Point = {
  id: string;
  label: string;
  value: number;
  count: number;
  x: number;
  z: number;
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

function CubeBlocks({
  points,
  maxValue,
  activeCellId,
  hoveredCellId,
  onHoverCell,
  onLeaveCell,
  onSelectCell,
}: {
  points: Point[];
  maxValue: number;
  activeCellId: string | null;
  hoveredCellId: string | null;
  onHoverCell: (id: string) => void;
  onLeaveCell: () => void;
  onSelectCell: (id: string) => void;
}) {
  return (
    <>
      {points.map((point, index) => {
        const height = 0.55 + (point.value / maxValue) * 3.1;
        const active = point.id === activeCellId;
        const hovered = point.id === hoveredCellId;
        const hue = active ? 38 : hovered ? 194 : 187 + index * 7;

        return (
          <Float key={point.id} speed={1.4} rotationIntensity={0.12} floatIntensity={0.22}>
            <mesh
              position={[point.x, height / 2 - 0.4, point.z]}
              castShadow
              receiveShadow
              onPointerOver={(event) => {
                event.stopPropagation();
                onHoverCell(point.id);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                onLeaveCell();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectCell(point.id);
              }}
            >
              <boxGeometry args={[1.05, height, 1.05]} />
              <meshStandardMaterial
                color={`hsl(${hue} 80% ${active ? "60%" : hovered ? "58%" : "55%"})`}
                emissive={active ? "#f59e0b" : hovered ? "#22d3ee" : "#083344"}
                emissiveIntensity={active ? 0.35 : hovered ? 0.3 : 0.15}
                metalness={0.25}
                roughness={0.24}
              />
            </mesh>
          </Float>
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
  const xOffset = (xValues.length - 1) / 2;
  const zOffset = (zValues.length - 1) / 2;
  const points: Point[] = cells.map((cell) => ({
    id: cell.id,
    label: `${cell.xValue} / ${cell.zValue}`,
    value: cell.value,
    count: cell.count,
    x: (xValues.indexOf(cell.xValue) - xOffset) * 1.8,
    z: (zValues.indexOf(cell.zValue) - zOffset) * 1.8,
  }));

  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.9))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 text-xs text-slate-300">
        <span>{getDimensionLabel(xDimension)} by {getDimensionLabel(zDimension)}</span>
        <span>{measure} intensity</span>
      </div>
      {points.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-slate-300">
          No facts match the current slice. Adjust a filter or upload a wider dataset.
        </div>
      ) : null}
      <Canvas
        camera={{ position: [6.2, 5.4, 7.4], fov: 44 }}
        shadows
        onPointerMissed={() => {
          if (points[0]) {
            onSelectCell(points[0].id);
          }
        }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 8, 18]} />
        <ambientLight intensity={1.25} />
        <directionalLight
          castShadow
          intensity={1.9}
          position={[6, 8, 5]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight intensity={18} position={[-4, 3, -2]} color="#22d3ee" />
        <gridHelper args={[12, 12, "#164e63", "#0f172a"]} position={[0, -0.4, 0]} />
        <CubeBlocks
          points={points}
          maxValue={maxValue}
          activeCellId={activeCellId}
          hoveredCellId={hoveredCellId}
          onHoverCell={onHoverCell}
          onLeaveCell={onLeaveCell}
          onSelectCell={onSelectCell}
        />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
          <planeGeometry args={[14, 14]} />
          <shadowMaterial opacity={0.22} />
        </mesh>
        <OrbitControls enablePan={false} minDistance={5} maxDistance={13} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-4 text-xs text-slate-400">
        <span>{xValues.length} x-axis buckets</span>
        <span>{zValues.length} z-axis buckets</span>
        <span>{points.length} visible cells</span>
      </div>
    </div>
  );
}
