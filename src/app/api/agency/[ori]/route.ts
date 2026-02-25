import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { ori: string } }
) {
  const ori = params.ori;
  const db = getDb();

  const agency = db.prepare(`
    SELECT ori, agency_name, state_abbr, county_name, agency_type, nibrs,
           latitude, longitude
    FROM agencies
    WHERE ori = ?
  `).get(ori) as any;

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  // Get state-level data as proxy (individual agency data would come from real API)
  const estimates = db.prepare(`
    SELECT year, population, violent_crime, homicide, rape_legacy,
           robbery, aggravated_assault, property_crime
    FROM estimates
    WHERE geo_level = 'state' AND geo_code = ?
    ORDER BY year
  `).all(agency.state_abbr) as any[];

  const demographics = db.prepare(`
    SELECT offense, variable, value, count
    FROM nibrs_demographics
    WHERE geo_level = 'state' AND geo_code = ?
  `).all(agency.state_abbr) as any[];

  return NextResponse.json({ agency, estimates, demographics });
}
