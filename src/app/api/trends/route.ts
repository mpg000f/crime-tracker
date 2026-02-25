import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const states = searchParams.get("states")?.split(",").map((s) => s.toUpperCase()) || [];
  const offense = searchParams.get("offense") || "violent-crime";
  const yearMin = parseInt(searchParams.get("yearMin") || "2000");
  const yearMax = parseInt(searchParams.get("yearMax") || "2022");

  const db = getDb();

  const offenseCol: Record<string, string> = {
    "violent-crime": "violent_crime",
    "homicide": "homicide",
    "rape-legacy": "rape_legacy",
    "robbery": "robbery",
    "aggravated-assault": "aggravated_assault",
    "property-crime": "property_crime",
    "burglary": "burglary",
    "larceny": "larceny",
    "motor-vehicle-theft": "motor_vehicle_theft",
    "arson": "arson",
  };
  const col = offenseCol[offense] || "violent_crime";

  // National trend
  const national = db.prepare(`
    SELECT year, population, ${col} as count
    FROM estimates
    WHERE geo_level = 'national' AND year BETWEEN ? AND ?
    ORDER BY year
  `).all(yearMin, yearMax) as any[];

  const nationalTrend = national.map((r: any) => ({
    year: r.year,
    rate: r.population > 0 ? (r.count / r.population) * 100000 : 0,
  }));

  // State trends
  const stateTrends: Record<string, { year: number; rate: number }[]> = {};

  if (states.length > 0) {
    const placeholders = states.map(() => "?").join(",");
    const rows = db.prepare(`
      SELECT geo_code as state, year, population, ${col} as count
      FROM estimates
      WHERE geo_level = 'state' AND geo_code IN (${placeholders}) AND year BETWEEN ? AND ?
      ORDER BY geo_code, year
    `).all(...states, yearMin, yearMax) as any[];

    for (const r of rows) {
      if (!stateTrends[r.state]) stateTrends[r.state] = [];
      stateTrends[r.state].push({
        year: r.year,
        rate: r.population > 0 ? (r.count / r.population) * 100000 : 0,
      });
    }
  }

  // Demographics if requested
  const demoVar = searchParams.get("demoVar");
  let demographics: any[] = [];
  if (demoVar && states.length > 0) {
    const placeholders = states.map(() => "?").join(",");
    demographics = db.prepare(`
      SELECT geo_code as state, value, SUM(count) as count
      FROM nibrs_demographics
      WHERE geo_level = 'state' AND geo_code IN (${placeholders})
        AND offense = ? AND variable = ?
      GROUP BY geo_code, value
      ORDER BY count DESC
    `).all(...states, offense, demoVar) as any[];
  }

  return NextResponse.json({ nationalTrend, stateTrends, demographics });
}
