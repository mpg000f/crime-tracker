"use client";

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export default function YearRangeSlider({ min, max, value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        Year Range
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={min}
          max={value[1]}
          value={value[0]}
          onChange={(e) => onChange([Number(e.target.value), value[1]])}
          className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="number"
          min={value[0]}
          max={max}
          value={value[1]}
          onChange={(e) => onChange([value[0], Number(e.target.value)])}
          className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
