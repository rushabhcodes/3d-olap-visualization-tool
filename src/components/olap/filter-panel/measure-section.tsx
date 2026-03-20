import type { Measure, MeasureOption } from "@/data/mock-cube";

import { FilterChip } from "./filter-chip";

type MeasureSectionProps = {
  measures: MeasureOption[];
  selectedMeasure: Measure;
  onMeasureChange: (value: Measure) => void;
};

export function MeasureSection({
  measures,
  selectedMeasure,
  onMeasureChange,
}: MeasureSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium">Measure</p>
        <p className="text-xs text-muted-foreground">Height and totals follow the selected KPI.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {measures.map((measure) => (
          <FilterChip
            key={measure.key}
            active={selectedMeasure === measure.key}
            label={measure.label}
            onClick={() => onMeasureChange(measure.key)}
          />
        ))}
      </div>
    </section>
  );
}
