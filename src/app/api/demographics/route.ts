import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state")?.toUpperCase();
  const offense = searchParams.get("offense") || "violent-crime";
  const variable = searchParams.get("variable") || "race";

  if (!state) {
    return NextResponse.json({ error: "state param required" }, { status: 400 });
  }

  const db = getDb();

  const rows = db.prepare(`
    SELECT value, count
    FROM nibrs_demographics
    WHERE geo_level = 'state' AND geo_code = ? AND offense = ? AND variable = ?
    ORDER BY count DESC
  `).all(state, offense, variable) as { value: string; count: number }[];

  return NextResponse.json({ state, offense, variable, data: rows });
}
