import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { stateAbbr: string } }
) {
  const stateAbbr = params.stateAbbr.toUpperCase();
  const db = getDb();

  // Estimates time series
  const estimates = db.prepare(`
    SELECT year, population, violent_crime, homicide, rape_legacy,
           robbery, aggravated_assault, property_crime, burglary,
           larceny, motor_vehicle_theft, arson
    FROM estimates
    WHERE geo_level = 'state' AND geo_code = ?
    ORDER BY year
  `).all(stateAbbr) as any[];

  // National estimates for overlay
  const nationalEstimates = db.prepare(`
    SELECT year, population, violent_crime, homicide, rape_legacy,
           robbery, aggravated_assault
    FROM estimates
    WHERE geo_level = 'national'
    ORDER BY year
  `).all() as any[];

  // Summary counts by offense
  const summaryCounts = db.prepare(`
    SELECT offense, year, actual, cleared
    FROM summary_counts
    WHERE geo_level = 'state' AND geo_code = ?
    ORDER BY offense, year
  `).all(stateAbbr) as any[];

  // Demographics
  const demographics = db.prepare(`
    SELECT offense, variable, value, count
    FROM nibrs_demographics
    WHERE geo_level = 'state' AND geo_code = ?
  `).all(stateAbbr) as any[];

  // Agencies
  const agencies = db.prepare(`
    SELECT ori, agency_name, county_name, agency_type, nibrs
    FROM agencies
    WHERE state_abbr = ?
    ORDER BY agency_name
  `).all(stateAbbr) as any[];

  // Participation
  const participation = db.prepare(`
    SELECT year, population, population_covered, nibrs_population_covered
    FROM participation
    WHERE state_abbr = ?
    ORDER BY year DESC
    LIMIT 5
  `).all(stateAbbr) as any[];

  return NextResponse.json({
    stateAbbr,
    estimates,
    nationalEstimates,
    summaryCounts,
    demographics,
    agencies,
    participation,
  });
}
