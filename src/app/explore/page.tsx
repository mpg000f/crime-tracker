"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import CrimeTypeSelect from "@/components/filters/CrimeTypeSelect";
import YearRangeSlider from "@/components/filters/YearRangeSlider";
import StateSelect from "@/components/filters/StateSelect";
import DemographicFilters from "@/components/filters/DemographicFilters";
import DemographicBarChart from "@/components/charts/DemographicBarChart";
import { STATE_ABBRS, OFFENSE_TYPES } from "@/lib/utils";

const LINE_COLORS = [
  "#e55039", "#2e86ab", "#f5c542", "#78e08f", "#e77f67",
  "#8854d0", "#20bf6b", "#aaa69d", "#fc5c65", "#4b7bec",
];

interface TrendPoint {
  year: number;
  rate: number;
}

interface ApiResponse {
  nationalTrend: TrendPoint[];
  stateTrends: Record<string, TrendPoint[]>;
  demographics: { state: string; value: string; count: number }[];
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex h-96 items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filters from URL
  const [offense, setOffense] = useState(searchParams.get("offense") || "violent-crime");
  const [yearRange, setYearRange] = useState<[number, number]>([
    parseInt(searchParams.get("yearMin") || "2000"),
    parseInt(searchParams.get("yearMax") || "2022"),
  ]);
  const [selectedStates, setSelectedStates] = useState<string[]>(
    searchParams.get("states")?.split(",").filter(Boolean) || []
  );
  const [demoVar, setDemoVar] = useState(searchParams.get("demoVar") || "");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync filters to URL
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("offense", offense);
    params.set("yearMin", String(yearRange[0]));
    params.set("yearMax", String(yearRange[1]));
    if (selectedStates.length) params.set("states", selectedStates.join(","));
    if (demoVar) params.set("demoVar", demoVar);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [offense, yearRange, selectedStates, demoVar, router]);

  // Fetch data whenever filters change
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offense,
        yearMin: String(yearRange[0]),
        yearMax: String(yearRange[1]),
      });
      if (selectedStates.length) params.set("states", selectedStates.join(","));
      if (demoVar) params.set("demoVar", demoVar);

      const res = await fetch(`/api/trends?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    } finally {
      setLoading(false);
    }
  }, [offense, yearRange, selectedStates, demoVar]);

  useEffect(() => {
    fetchData();
    updateUrl();
  }, [fetchData, updateUrl]);

  // Build chart data — merge national + state trends by year
  const chartData = data
    ? data.nationalTrend.map((n) => {
        const point: Record<string, any> = { year: n.year, National: n.rate };
        for (const [state, trend] of Object.entries(data.stateTrends)) {
          const match = trend.find((t) => t.year === n.year);
          point[state] = match?.rate || 0;
        }
        return point;
      })
    : [];

  const allLines = ["National", ...selectedStates];
  const offenseLabel = OFFENSE_TYPES.find((o) => o.value === offense)?.label || offense;

  // Aggregate demographics across selected states
  const demoData = data?.demographics
    ? Object.values(
        data.demographics.reduce<Record<string, { value: string; count: number }>>(
          (acc, d) => {
            if (!acc[d.value]) acc[d.value] = { value: d.value, count: 0 };
            acc[d.value].count += d.count;
            return acc;
          },
          {}
        )
      ).sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Explore Crime Data</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters sidebar */}
        <div className="w-full space-y-5 lg:w-72 lg:flex-shrink-0">
          <CrimeTypeSelect value={offense} onChange={setOffense} />
          <YearRangeSlider min={2000} max={2022} value={yearRange} onChange={setYearRange} />
          <StateSelect selected={selectedStates} onChange={setSelectedStates} />
          <DemographicFilters variable={demoVar} onChange={setDemoVar} />
        </div>

        {/* Charts */}
        <div className="flex-1 space-y-6">
          {/* Trend chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-lg font-semibold">
              {offenseLabel} Rate Trends
            </h2>
            {loading ? (
              <div className="flex h-80 items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="year" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240 10% 6%)",
                        border: "1px solid hsl(240 3.7% 15.9%)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#999" }}
                    />
                    <Legend />
                    {allLines.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key === "National" ? "National Avg" : (STATE_ABBRS[key] || key)}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={key === "National" ? 2 : 1.5}
                        strokeDasharray={key === "National" ? "5 5" : undefined}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Demographics chart */}
          {demoVar && demoData.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <DemographicBarChart
                data={demoData}
                title={`Offender ${demoVar.charAt(0).toUpperCase() + demoVar.slice(1)} — ${offenseLabel}${selectedStates.length ? ` (${selectedStates.join(", ")})` : " (select states)"}`}
              />
            </div>
          )}

          {!selectedStates.length && (
            <p className="text-center text-sm text-muted-foreground">
              Select one or more states from the sidebar to compare trends.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
