"use client";

import { useEffect, useState, useCallback } from "react";
import USChoropleth from "@/components/map/USChoropleth";
import StatsCard from "@/components/data/StatsCard";
import RankingTable from "@/components/data/RankingTable";
import { OFFENSE_TYPES, formatNumber, formatRate } from "@/lib/utils";
import { fetchJson } from "@/lib/data";

interface StateData {
  state: string;
  rate: number;
  count: number;
  population: number;
}

interface StatesFile {
  states: Record<string, StateData[]>;
  national: Record<string, { population: number; count: number; rate: number; pctChange: number }>;
  years: number[];
}

export default function Home() {
  const [year, setYear] = useState(2024);
  const [offense, setOffense] = useState("violent-crime");
  const [data, setData] = useState<StatesFile | null>(null);
  const [loading, setLoading] = useState(true);

  const offenseLabel = OFFENSE_TYPES.find((o) => o.value === offense)?.label || offense;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchJson<StatesFile>(`states/${year}.json`);
      setData(json);
    } catch (err) {
      console.error("Failed to fetch state data:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const states = data?.states[offense] || [];
  const national = data?.national[offense];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nationwide Crime Tracker</h1>
        <p className="mt-1 text-muted-foreground">
          FBI crime data across all 50 states. Click a state to drill in.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Offense Type</label>
          <select
            value={offense}
            onChange={(e) => setOffense(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {OFFENSE_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {(data?.years || [2024]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {national && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatsCard
            title={`National ${offenseLabel}`}
            value={formatNumber(national.count)}
            subtitle={`${formatRate(national.rate)} per 100k`}
            change={national.pctChange}
          />
          <StatsCard
            title="U.S. Population"
            value={formatNumber(national.population)}
          />
          <StatsCard
            title="Highest Rate"
            value={(() => {
              const top = [...states].sort((a, b) => b.rate - a.rate)[0];
              return top ? `${top.state} — ${formatRate(top.rate)}` : "—";
            })()}
          />
          <StatsCard
            title="Lowest Rate"
            value={(() => {
              const bottom = [...states].sort((a, b) => a.rate - b.rate)[0];
              return bottom ? `${bottom.state} — ${formatRate(bottom.rate)}` : "—";
            })()}
          />
        </div>
      )}

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        {loading ? (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            Loading map data...
          </div>
        ) : states.length > 0 ? (
          <USChoropleth data={states} offenseLabel={offenseLabel} />
        ) : (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            No data available for this year
          </div>
        )}
      </div>

      {states.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">State Rankings</h2>
          <RankingTable data={states} offenseLabel={offenseLabel} />
        </div>
      )}
    </div>
  );
}
