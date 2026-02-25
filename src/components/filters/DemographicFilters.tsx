"use client";

interface Props {
  variable: string;
  onChange: (v: string) => void;
}

const VARIABLES = [
  { value: "", label: "None" },
  { value: "race", label: "Race" },
  { value: "sex", label: "Sex" },
  { value: "age", label: "Age Group" },
  { value: "ethnicity", label: "Ethnicity" },
];

export default function DemographicFilters({ variable, onChange }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        Demographic Breakdown
      </label>
      <select
        value={variable}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {VARIABLES.map((v) => (
          <option key={v.value} value={v.value}>{v.label}</option>
        ))}
      </select>
    </div>
  );
}
