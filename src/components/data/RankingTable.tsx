"use client";

import { useState } from "react";
import Link from "next/link";
import { STATE_ABBRS, formatNumber, formatRate } from "@/lib/utils";

interface StateRow {
  state: string;
  rate: number;
  count: number;
  population: number;
}

interface Props {
  data: StateRow[];
  offenseLabel: string;
}

type SortKey = "state" | "rate" | "count" | "population";

export default function RankingTable({ data, offenseLabel }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("rate");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "state") return dir * a.state.localeCompare(b.state);
    return dir * (a[sortKey] - b[sortKey]);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const headerClass = "cursor-pointer select-none px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground";

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">#</th>
            <th className={headerClass} onClick={() => toggleSort("state")}>
              State {sortKey === "state" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("rate")}>
              {offenseLabel} Rate {sortKey === "rate" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("count")}>
              Total {sortKey === "count" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("population")}>
              Population {sortKey === "population" && (sortAsc ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.state} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/state/${row.state}`} className="font-medium hover:underline">
                  {STATE_ABBRS[row.state] || row.state}
                </Link>
              </td>
              <td className="px-3 py-2 font-mono">{formatRate(row.rate)}</td>
              <td className="px-3 py-2 font-mono">{formatNumber(row.count)}</td>
              <td className="px-3 py-2 font-mono">{formatNumber(row.population)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
