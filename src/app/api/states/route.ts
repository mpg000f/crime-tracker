import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2022");
  const offense = searchParams.get("offense") || "violent-crime";

  const db = getDb();

  // Get estimate data for all states for this year
  const estimates = db.prepare(`
    SELECT geo_code as state, year, population, violent_crime, homicide,
           rape_legacy, robbery, aggravated_assault, property_crime,
           burglary, larceny, motor_vehicle_theft, arson
    FROM estimates
    WHERE geo_level = 'state' AND year = ?
    ORDER BY geo_code
  `).all(year) as any[];

  // Map offense name to column
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

  const states = estimates.map((row) => ({
    state: row.state,
    year: row.year,
    population: row.population,
    count: row[col],
    rate: row.population > 0 ? (row[col] / row.population) * 100000 : 0,
  }));

  // National totals
  const national = db.prepare(`
    SELECT population, violent_crime, homicide, rape_legacy, robbery,
           aggravated_assault, property_crime, burglary, larceny,
           motor_vehicle_theft, arson
    FROM estimates
    WHERE geo_level = 'national' AND year = ?
  `).get(year) as any;

  const prevNational = db.prepare(`
    SELECT population, violent_crime, homicide, rape_legacy, robbery,
           aggravated_assault, property_crime
    FROM estimates
    WHERE geo_level = 'national' AND year = ?
  `).get(year - 1) as any;

  const nationalCount = national?.[col] || 0;
  const prevCount = prevNational?.[col] || 0;
  const pctChange = prevCount > 0 ? ((nationalCount - prevCount) / prevCount) : 0;

  // Available years
  const years = db.prepare(`
    SELECT DISTINCT year FROM estimates WHERE geo_level = 'state' ORDER BY year DESC
  `).all() as { year: number }[];

  return NextResponse.json({
    states,
    national: {
      population: national?.population || 0,
      count: nationalCount,
      rate: national?.population > 0 ? (nationalCount / national.population) * 100000 : 0,
      pctChange,
    },
    years: years.map((y) => y.year),
  });
}
