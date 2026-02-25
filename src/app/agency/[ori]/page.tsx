"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { STATE_ABBRS, OFFENSE_TYPES, formatNumber, formatRate } from "@/lib/utils";
import TrendLineChart from "@/components/charts/TrendLineChart";
import DemographicBarChart from "@/components/charts/DemographicBarChart";
import StatsCard from "@/components/data/StatsCard";
import Link from "next/link";

interface AgencyData {
  agency: {
    ori: string;
    agency_name: string;
    state_abbr: string;
    county_name: string;
    agency_type: string;
    nibrs: number;
  };
  estimates: any[];
  demographics: any[];
}

type Tab = "trends" | "demographics";

export default function AgencyPage() {
  const params = useParams();
  const ori = params.ori as string;
  const [data, setData] = useState<AgencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("trends");
  const [offense, setOffense] = useState("violent-crime");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agency/${ori}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ori]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-96 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!data?.agency) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Agency not found.</p>
      </div>
    );
  }

  const { agency } = data;
  const stateName = STATE_ABBRS[agency.state_abbr] || agency.state_abbr;

  const offenseCol: Record<string, string> = {
    "violent-crime": "violent_crime",
    "homicide": "homicide",
    "rape-legacy": "rape_legacy",
    "robbery": "robbery",
    "aggravated-assault": "aggravated_assault",
    "property-crime": "property_crime",
  };
  const col = offenseCol[offense] || "violent_crime";
  const offenseLabel = OFFENSE_TYPES.find((o) => o.value === offense)?.label || offense;

  const trendData = data.estimates.map((e: any) => ({
    year: e.year,
    stateRate: e.population > 0 ? (e[col] / e.population) * 100000 : 0,
  }));

  const latest = data.estimates[data.estimates.length - 1];
  const latestRate = latest?.population > 0 ? (latest[col] / latest.population) * 100000 : 0;

  const demoByVar = (variable: string) =>
    data.demographics
      .filter((d: any) => d.offense === offense && d.variable === variable)
      .map((d: any) => ({ value: d.value, count: d.count }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">&larr; National</Link>
          <span>/</span>
          <Link href={`/state/${agency.state_abbr}`} className="hover:text-foreground">
            {stateName}
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{agency.agency_name}</h1>
        <p className="mt-1 text-muted-foreground">
          {agency.county_name} &middot; {agency.agency_type} &middot;{" "}
          {agency.nibrs ? "NIBRS Reporting" : "SRS Only"} &middot; ORI: {agency.ori}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatsCard
          title={`${offenseLabel} Rate (State)`}
          value={formatRate(latestRate)}
          subtitle="per 100k (state-level data)"
        />
        <StatsCard title="State" value={stateName} />
        <StatsCard title="Type" value={agency.agency_type} />
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
        {(["trends", "demographics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "trends" && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">{offenseLabel} Rate (State-Level Trend)</h2>
          <TrendLineChart data={trendData} stateName={stateName} offenseLabel={offenseLabel} />
          <p className="mt-2 text-xs text-muted-foreground">
            Note: Showing state-level data. Agency-specific trends require the full FBI API ingestion.
          </p>
        </div>
      )}

      {tab === "demographics" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <DemographicBarChart data={demoByVar("race")} title="Offender Race (State)" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <DemographicBarChart data={demoByVar("sex")} title="Offender Sex (State)" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <DemographicBarChart data={demoByVar("age")} title="Offender Age Group (State)" />
          </div>
        </div>
      )}
    </div>
  );
}
