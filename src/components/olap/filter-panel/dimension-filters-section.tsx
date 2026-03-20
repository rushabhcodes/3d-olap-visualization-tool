import type { DimensionKey, DimensionOption } from "@/data/mock-cube";

import { FilterChip } from "./filter-chip";

type DimensionFiltersSectionProps = {
  dimensions: DimensionOption[];
  filters: Record<DimensionKey, string | "All">;
  availableValues: Record<DimensionKey, string[]>;
  onFilterChange: (dimension: DimensionKey, value: string | "All") => void;
};

export function DimensionFiltersSection({
  dimensions,
  filters,
  availableValues,
  onFilterChange,
}: DimensionFiltersSectionProps) {
  return (
    <>
      {dimensions.map((dimension) => (
        <section key={dimension.key} className="space-y-3">
          <div>
            <p className="text-sm font-medium">{dimension.label}</p>
            <p className="text-xs text-muted-foreground">Filter visible cells and raw fact rows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filters[dimension.key] === "All"}
              label="All"
              onClick={() => onFilterChange(dimension.key, "All")}
            />
            {availableValues[dimension.key].map((value) => (
              <FilterChip
                key={value}
                active={filters[dimension.key] === value}
                label={value}
                onClick={() => onFilterChange(dimension.key, value)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
