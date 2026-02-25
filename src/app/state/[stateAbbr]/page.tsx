"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { STATE_ABBRS, OFFENSE_TYPES, formatNumber, formatRate } from "@/lib/utils";
import { fetchJson } from "@/lib/data";
import TrendLineChart from "@/components/charts/TrendLineChart";
import DemographicBarChart from "@/components/charts/DemographicBarChart";
import OffenseBreakdownChart from "@/components/charts/OffenseBreakdownChart";
import DataCompletenessIndicator from "@/components/data/DataCompletenessIndicator";
import AgencyTable from "@/components/data/AgencyTable";
import StatsCard from "@/components/data/StatsCard";
import Link from "next/link";

type Tab = "trends" | "demographics" | "offenses" | "agencies";

interface StateData {
  stateAbbr: string;
  estimates: any[];
  nationalEstimates: any[];
  summaryCounts: any[];
  demographics: any[];
  agencies: any[];
  participation: any[];
}

export default function StatePage() {
  const params = useParams();
  const stateAbbr = (params.stateAbbr as string).toUpperCase();
  const stateName = STATE_ABBRS[stateAbbr] || stateAbbr;

  const [data, setData] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("trends");
  const [offense, setOffense] = useState("violent-crime");

  useEffect(() => {
    setLoading(true);
    fetchJson<StateData>(`state/${stateAbbr}.json`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stateAbbr]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          Loading state data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Failed to load data for {stateAbbr}.</p>
      </div>
    );
  }

  const offenseCol: Record<string, string> = {
    "violent-crime": "violent_crime",
    "homicide": "homicide",
    "rape-legacy": "rape_legacy",
    "robbery": "robbery",
    "aggravated-assault": "aggravated_assault",
    "property-crime": "property_crime",
  };

  const col = offenseCol[offense] || "violent_crime";
  const nationalMap = new Map(
    data.nationalEstimates.map((n: any) => [n.year, n])
  );

  const trendData = data.estimates.map((e: any) => {
    const natl = nationalMap.get(e.year);
    return {
      year: e.year,
      stateRate: e.population > 0 ? (e[col] / e.population) * 100000 : 0,
      nationalRate: natl && natl.population > 0
        ? (natl[col] / natl.population) * 100000
        : undefined,
    };
  });

  const latest = data.estimates[data.estimates.length - 1];
  const prev = data.estimates.length > 1 ? data.estimates[data.estimates.length - 2] : null;
  const latestRate = latest?.population > 0 ? (latest[col] / latest.population) * 100000 : 0;
  const prevRate = prev?.population > 0 ? (prev[col] / prev.population) * 100000 : 0;
  const pctChange = prevRate > 0 ? (latestRate - prevRate) / prevRate : 0;

  const demoByVar = (variable: string) =>
    data.demographics
      .filter((d: any) => d.offense === offense && d.variable === variable)
      .map((d: any) => ({ value: d.value, count: d.count }));

  const offenseBreakdown = latest
    ? [
        { name: "Homicide", value: latest.homicide || 0 },
        { name: "Rape", value: latest.rape_legacy || 0 },
        { name: "Robbery", value: latest.robbery || 0 },
        { name: "Agg. Assault", value: latest.aggravated_assault || 0 },
      ]
    : [];

  const offenseLabel = OFFENSE_TYPES.find((o) => o.value === offense)?.label || offense;

  const tabs: { id: Tab; label: string }[] = [
    { id: "trends", label: "Trends" },
    { id: "demographics", label: "Demographics" },
    { id: "offenses", label: "Offenses" },
    { id: "agencies", label: "Agencies" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to national map
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{stateName}</h1>
      </div>

      <div className="mb-6">
        <DataCompletenessIndicator participation={data.participation} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard
          title={`${offenseLabel} Rate`}
          value={formatRate(latestRate)}
          subtitle="per 100k"
          change={pctChange}
        />
        <StatsCard
          title={`Total ${offenseLabel}`}
          value={formatNumber(latest?.[col] || 0)}
        />
        <StatsCard
          title="Population"
          value={formatNumber(latest?.population || 0)}
          subtitle={`${latest?.year || ""}`}
        />
        <StatsCard
          title="Agencies"
          value={formatNumber(data.agencies.length)}
          subtitle={`${data.agencies.filter((a: any) => a.nibrs).length} NIBRS`}
        />
      </div>

      <div className="mb-4">
        <select
          value={offense}
          onChange={(e) => setOffense(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {OFFENSE_TYPES.filter((o) => offenseCol[o.value]).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trends" && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">{offenseLabel} Rate Over Time</h2>
          <TrendLineChart data={trendData} stateName={stateName} offenseLabel={offenseLabel} />
        </div>
      )}

      {tab === "demographics" && (
        <div className="space-y-6">
          {["race", "sex", "age", "ethnicity"].map((v) => {
            const d = demoByVar(v);
            return d.length > 0 ? (
              <div key={v} className="rounded-lg border border-border bg-card p-4">
                <DemographicBarChart data={d} title={`Offender ${v.charAt(0).toUpperCase() + v.slice(1)}`} />
              </div>
            ) : null;
          })}
        </div>
      )}

      {tab === "offenses" && (
        <div className="rounded-lg border border-border bg-card p-4">
          <OffenseBreakdownChart data={offenseBreakdown} title={`Violent Crime Breakdown (${latest?.year || ""})`} />
        </div>
      )}

      {tab === "agencies" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Agencies in {stateName}</h2>
          <AgencyTable agencies={data.agencies} />
        </div>
      )}
    </div>
  );
}
