"use client";

import { OFFENSE_TYPES } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function CrimeTypeSelect({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        Crime Type
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {OFFENSE_TYPES.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
