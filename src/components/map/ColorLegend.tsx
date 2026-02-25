"use client";

interface Props {
  min: number;
  max: number;
  colors: string[];
  label: string;
}

export default function ColorLegend({ min, max, colors, label }: Props) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <div className="flex h-4 w-64 overflow-hidden rounded">
        {colors.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex w-64 justify-between text-xs text-muted-foreground">
        <span>{min.toFixed(0)}</span>
        <span className="text-center">{label}</span>
        <span>{max.toFixed(0)}</span>
      </div>
    </div>
  );
}
