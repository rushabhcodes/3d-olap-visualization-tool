import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function FilterChip({
  active,
  label,
  onClick,
}: FilterChipProps) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn("justify-start rounded-full", !active && "bg-card/40")}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
