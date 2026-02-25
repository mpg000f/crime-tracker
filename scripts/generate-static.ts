/**
 * Generates static JSON files from SQLite for GitHub Pages deployment.
 * Output goes to public/data/ so Next.js static export can serve them.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database(path.join(process.cwd(), "data", "crime.db"));
db.pragma("journal_mode = WAL");

const OUT = path.join(process.cwd(), "public", "data");
fs.mkdirSync(OUT, { recursive: true });

function write(filename: string, data: any) {
  fs.writeFileSync(path.join(OUT, filename), JSON.stringify(data));
  console.log(`  ${filename} (${JSON.stringify(data).length} bytes)`);
}

// Get all available years
const years = (db.prepare(`
  SELECT DISTINCT year FROM estimates WHERE geo_level = 'state' ORDER BY year
`).all() as { year: number }[]).map(r => r.year);

console.log(`Years available: ${years[0]}-${years[years.length - 1]} (${years.length} years)`);

// Offense column mapping
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

const offenses = Object.keys(offenseCol);

// ============================================================
// States data: one file per year (used by homepage map)
// ============================================================
console.log("\nGenerating states data by year...");
fs.mkdirSync(path.join(OUT, "states"), { recursive: true });

for (const year of years) {
  const estimates = db.prepare(`
    SELECT geo_code as state, year, population, violent_crime, homicide,
           rape_legacy, robbery, aggravated_assault, property_crime,
           burglary, larceny, motor_vehicle_theft, arson
    FROM estimates
    WHERE geo_level = 'state' AND year = ?
    ORDER BY geo_code
  `).all(year) as any[];

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

  // Pre-compute rates for each offense
  const statesData: Record<string, any[]> = {};
  for (const offense of offenses) {
    const col = offenseCol[offense];
    statesData[offense] = estimates.map((row: any) => ({
      state: row.state,
      count: row[col] || 0,
      rate: row.population > 0 ? +((row[col] / row.population) * 100000).toFixed(1) : 0,
      population: row.population,
    }));
  }

  // National stats per offense
  const nationalStats: Record<string, any> = {};
  for (const offense of offenses) {
    const col = offenseCol[offense];
    const count = national?.[col] || 0;
    const prevCount = prevNational?.[col] || 0;
    nationalStats[offense] = {
      population: national?.population || 0,
      count,
      rate: national?.population > 0 ? +((count / national.population) * 100000).toFixed(1) : 0,
      pctChange: prevCount > 0 ? +((count - prevCount) / prevCount).toFixed(4) : 0,
    };
  }

  write(`states/${year}.json`, { states: statesData, national: nationalStats, years });
}

// ============================================================
// State detail: one file per state
// ============================================================
console.log("\nGenerating state detail files...");
fs.mkdirSync(path.join(OUT, "state"), { recursive: true });

const allStates = (db.prepare(`
  SELECT DISTINCT geo_code FROM estimates WHERE geo_level = 'state' ORDER BY geo_code
`).all() as { geo_code: string }[]).map(r => r.geo_code);

const nationalEstimates = db.prepare(`
  SELECT year, population, violent_crime, homicide, rape_legacy,
         robbery, aggravated_assault
  FROM estimates
  WHERE geo_level = 'national'
  ORDER BY year
`).all() as any[];

for (const stateAbbr of allStates) {
  const estimates = db.prepare(`
    SELECT year, population, violent_crime, homicide, rape_legacy,
           robbery, aggravated_assault, property_crime, burglary,
           larceny, motor_vehicle_theft, arson
    FROM estimates
    WHERE geo_level = 'state' AND geo_code = ?
    ORDER BY year
  `).all(stateAbbr) as any[];

  const summaryCounts = db.prepare(`
    SELECT offense, year, actual, cleared
    FROM summary_counts
    WHERE geo_level = 'state' AND geo_code = ?
    ORDER BY offense, year
  `).all(stateAbbr) as any[];

  const demographics = db.prepare(`
    SELECT offense, variable, value, count
    FROM nibrs_demographics
    WHERE geo_level = 'state' AND geo_code = ?
  `).all(stateAbbr) as any[];

  // Use national demographics if state has none
  const demoData = demographics.length > 0 ? demographics : db.prepare(`
    SELECT offense, variable, value, count
    FROM nibrs_demographics
    WHERE geo_level = 'national' AND geo_code = ''
  `).all() as any[];

  const agencies = db.prepare(`
    SELECT ori, agency_name, county_name, agency_type, nibrs
    FROM agencies
    WHERE state_abbr = ?
    ORDER BY agency_name
  `).all(stateAbbr) as any[];

  const participation = db.prepare(`
    SELECT year, population, population_covered, nibrs_population_covered
    FROM participation
    WHERE state_abbr = ?
    ORDER BY year DESC
    LIMIT 5
  `).all(stateAbbr) as any[];

  write(`state/${stateAbbr}.json`, {
    stateAbbr,
    estimates,
    nationalEstimates,
    summaryCounts,
    demographics: demoData,
    agencies,
    participation,
  });
}

// ============================================================
// Trends data: national + all states for explore page
// ============================================================
console.log("\nGenerating trends data...");

const trendsData: Record<string, any> = {};

// National trends per offense
for (const offense of offenses) {
  const col = offenseCol[offense];
  const national = db.prepare(`
    SELECT year, population, ${col} as count
    FROM estimates
    WHERE geo_level = 'national'
    ORDER BY year
  `).all() as any[];

  trendsData[offense] = {
    national: national.map((r: any) => ({
      year: r.year,
      rate: r.population > 0 ? +((r.count / r.population) * 100000).toFixed(1) : 0,
    })),
    states: {} as Record<string, any[]>,
  };

  // Per-state trends
  for (const stateAbbr of allStates) {
    const rows = db.prepare(`
      SELECT year, population, ${col} as count
      FROM estimates
      WHERE geo_level = 'state' AND geo_code = ?
      ORDER BY year
    `).all(stateAbbr) as any[];

    trendsData[offense].states[stateAbbr] = rows.map((r: any) => ({
      year: r.year,
      rate: r.population > 0 ? +((r.count / r.population) * 100000).toFixed(1) : 0,
    }));
  }
}

write("trends.json", trendsData);

// ============================================================
// Demographics (national level)
// ============================================================
console.log("\nGenerating demographics data...");

const demoRows = db.prepare(`
  SELECT offense, variable, value, count
  FROM nibrs_demographics
  WHERE geo_level = 'national'
  ORDER BY offense, variable, count DESC
`).all() as any[];

// Group by offense → variable → [{value, count}]
const demographics: Record<string, Record<string, { value: string; count: number }[]>> = {};
for (const row of demoRows) {
  if (!demographics[row.offense]) demographics[row.offense] = {};
  if (!demographics[row.offense][row.variable]) demographics[row.offense][row.variable] = [];
  demographics[row.offense][row.variable].push({ value: row.value, count: row.count });
}

write("demographics.json", demographics);

// ============================================================
// Agency list
// ============================================================
console.log("\nGenerating agency data...");
fs.mkdirSync(path.join(OUT, "agency"), { recursive: true });

const agencyList = db.prepare(`
  SELECT ori, agency_name, state_abbr, county_name, agency_type, nibrs
  FROM agencies
  ORDER BY state_abbr, agency_name
`).all() as any[];

// One file per agency (only if we have agencies)
if (agencyList.length > 0) {
  for (const agency of agencyList) {
    write(`agency/${agency.ori}.json`, {
      agency,
      // State-level data as proxy
      estimates: db.prepare(`
        SELECT year, population, violent_crime, homicide, rape_legacy,
               robbery, aggravated_assault, property_crime
        FROM estimates
        WHERE geo_level = 'state' AND geo_code = ?
        ORDER BY year
      `).all(agency.state_abbr),
      demographics: db.prepare(`
        SELECT offense, variable, value, count
        FROM nibrs_demographics
        WHERE geo_level = 'national'
      `).all(),
    });
  }
}

// ============================================================
// Meta file (years, states list)
// ============================================================
write("meta.json", {
  years,
  states: allStates,
  offenses: offenses.map(o => ({
    value: o,
    label: o.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
  })),
});

console.log("\nDone! Static files in public/data/");
db.close();
