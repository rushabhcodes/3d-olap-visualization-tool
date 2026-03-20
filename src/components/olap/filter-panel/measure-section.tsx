import { measures, type Measure } from "@/data/mock-cube";

import { FilterChip } from "./filter-chip";

type MeasureSectionProps = {
  selectedMeasure: Measure;
  onMeasureChange: (value: Measure) => void;
};

export function MeasureSection({
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
            key={measure}
            active={selectedMeasure === measure}
            label={measure}
            onClick={() => onMeasureChange(measure)}
          />
        ))}
      </div>
    </section>
  );
}
