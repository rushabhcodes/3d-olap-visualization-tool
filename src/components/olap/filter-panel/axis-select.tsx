import { dimensionOptions, type DimensionKey } from "@/data/mock-cube";

type AxisSelectProps = {
  label: string;
  value: DimensionKey;
  onChange: (value: DimensionKey) => void;
};

export function AxisSelect({
  label,
  value,
  onChange,
}: AxisSelectProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
        value={value}
        onChange={(event) => onChange(event.target.value as DimensionKey)}
      >
        {dimensionOptions.map((dimension) => (
          <option key={dimension.key} value={dimension.key}>
            {dimension.label}
          </option>
        ))}
      </select>
    </label>
  );
}
