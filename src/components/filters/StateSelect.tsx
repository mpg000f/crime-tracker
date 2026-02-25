"use client";

import { useState } from "react";
import { STATE_ABBRS } from "@/lib/utils";

interface Props {
  selected: string[];
  onChange: (states: string[]) => void;
}

const allStates = Object.entries(STATE_ABBRS).sort((a, b) => a[1].localeCompare(b[1]));

export default function StateSelect({ selected, onChange }: Props) {
  const [search, setSearch] = useState("");

  const filtered = allStates.filter(([abbr, name]) =>
    name.toLowerCase().includes(search.toLowerCase()) ||
    abbr.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(abbr: string) {
    if (selected.includes(abbr)) {
      onChange(selected.filter((s) => s !== abbr));
    } else {
      onChange([...selected, abbr]);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        States ({selected.length} selected)
      </label>
      <input
        type="text"
        placeholder="Search states..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1">
        {filtered.map(([abbr, name]) => (
          <label
            key={abbr}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={selected.includes(abbr)}
              onChange={() => toggle(abbr)}
              className="rounded border-border"
            />
            <span>{name}</span>
            <span className="text-xs text-muted-foreground">{abbr}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
