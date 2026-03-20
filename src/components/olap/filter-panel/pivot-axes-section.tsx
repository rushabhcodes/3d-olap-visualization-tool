import { ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DimensionKey } from "@/data/mock-cube";

import { AxisSelect } from "./axis-select";

type PivotAxesSectionProps = {
  xDimension: DimensionKey;
  yDimension: DimensionKey;
  zDimension: DimensionKey;
  onAxisChange: (axis: "x" | "y" | "z", value: DimensionKey) => void;
  onSwapAxes: () => void;
};

export function PivotAxesSection({
  xDimension,
  yDimension,
  zDimension,
  onAxisChange,
  onSwapAxes,
}: PivotAxesSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pivot Axes</p>
          <p className="text-xs text-muted-foreground">Re-map the cube surface without changing the facts.</p>
        </div>
        <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onSwapAxes}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Swap
        </Button>
      </div>
      <div className="grid gap-3">
        <AxisSelect label="X Axis" value={xDimension} onChange={(value) => onAxisChange("x", value)} />
        <AxisSelect label="Y Axis" value={yDimension} onChange={(value) => onAxisChange("y", value)} />
        <AxisSelect label="Z Axis" value={zDimension} onChange={(value) => onAxisChange("z", value)} />
      </div>
    </section>
  );
}
