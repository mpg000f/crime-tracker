import Database from "better-sqlite3";
import path from "path";

const BASE_URL = "https://api.usa.gov/crime/fbi/sapi/api";
const API_KEY = process.env.FBI_API_KEY;
if (!API_KEY) {
  console.error("Set FBI_API_KEY env var. Get one at https://api.data.gov/signup/");
  process.exit(1);
}

const db = new Database(path.join(process.cwd(), "data", "crime.db"));
db.pragma("journal_mode = WAL");

const STATE_ABBRS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
];

const OFFENSES = [
  "violent-crime", "homicide", "rape-legacy", "robbery",
  "aggravated-assault", "property-crime", "burglary",
  "larceny", "motor-vehicle-theft", "arson",
];

const DEMO_VARS = ["age", "sex", "race", "ethnicity"] as const;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(endpoint: string): Promise<any> {
  const url = `${BASE_URL}${endpoint}?API_KEY=${API_KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.log("  Rate limited, waiting...");
        await sleep(3000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${endpoint}`);
        return null;
      }
      return await res.json();
    } catch (err: any) {
      console.warn(`  Fetch error: ${err.message}`);
      if (attempt < 2) await sleep(2000);
    }
  }
  return null;
}

// --- Prepared statements ---
const insertEstimate = db.prepare(`
  INSERT OR REPLACE INTO estimates
    (geo_level, geo_code, year, population, violent_crime, homicide,
     rape_legacy, rape_revised, robbery, aggravated_assault,
     property_crime, burglary, larceny, motor_vehicle_theft, arson)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAgency = db.prepare(`
  INSERT OR REPLACE INTO agencies
    (ori, agency_name, state_abbr, county_name, agency_type, nibrs, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSummary = db.prepare(`
  INSERT OR REPLACE INTO summary_counts
    (geo_level, geo_code, offense, year, actual, cleared)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertDemo = db.prepare(`
  INSERT OR REPLACE INTO nibrs_demographics
    (geo_level, geo_code, offense, variable, value, count)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertParticipation = db.prepare(`
  INSERT OR REPLACE INTO participation
    (state_abbr, year, population, population_covered, nibrs_population_covered)
  VALUES (?, ?, ?, ?, ?)
`);

// --- Ingest functions ---
async function ingestNationalEstimates() {
  console.log("Fetching national estimates...");
  const data = await apiFetch("/estimates/national");
  if (!data?.results) return;
  const tx = db.transaction(() => {
    for (const r of data.results) {
      insertEstimate.run(
        "national", "", r.year, r.population,
        r.violent_crime, r.homicide, r.rape_legacy, r.rape_revised,
        r.robbery, r.aggravated_assault, r.property_crime,
        r.burglary, r.larceny, r.motor_vehicle_theft, r.arson
      );
    }
  });
  tx();
  console.log(`  Inserted ${data.results.length} national estimate rows`);
}

async function ingestStateEstimates(state: string) {
  const data = await apiFetch(`/estimates/state/${state}`);
  if (!data?.results) return;
  const tx = db.transaction(() => {
    for (const r of data.results) {
      insertEstimate.run(
        "state", state, r.year, r.population,
        r.violent_crime, r.homicide, r.rape_legacy, r.rape_revised,
        r.robbery, r.aggravated_assault, r.property_crime,
        r.burglary, r.larceny, r.motor_vehicle_theft, r.arson
      );
    }
  });
  tx();
}

async function ingestAgencies(state: string) {
  const data = await apiFetch(`/agencies/byStateAbbr/${state}`);
  if (!data?.results) return;
  const tx = db.transaction(() => {
    for (const a of data.results) {
      insertAgency.run(
        a.ori, a.agency_name, state,
        a.county_name || null, a.agency_type_name || null,
        a.nibrs ? 1 : 0, a.latitude || null, a.longitude || null
      );
    }
  });
  tx();
  return data.results.length;
}

async function ingestSummary(state: string, offense: string) {
  const data = await apiFetch(`/summarized/state/${state}/${offense}`);
  if (!data?.results) return;
  const tx = db.transaction(() => {
    for (const r of data.results) {
      insertSummary.run("state", state, offense, r.year, r.actual, r.cleared);
    }
  });
  tx();
}

async function ingestDemographics(state: string, offense: string) {
  for (const variable of DEMO_VARS) {
    const data = await apiFetch(`/nibrs/${offense}/offender/states/${state}/${variable}`);
    if (!data?.data) continue;
    const tx = db.transaction(() => {
      for (const d of data.data) {
        insertDemo.run("state", state, offense, variable, d.key, d.value);
      }
    });
    tx();
    await sleep(200); // gentle rate limiting
  }
}

async function ingestParticipation(state: string) {
  const data = await apiFetch(`/participation/states/${state}`);
  if (!data?.results) return;
  const tx = db.transaction(() => {
    for (const r of data.results) {
      insertParticipation.run(
        state, r.year, r.population,
        r.population_covered, r.nibrs_population_covered
      );
    }
  });
  tx();
}

// --- Main ---
async function main() {
  console.log("=== FBI Crime Data Ingestion ===\n");

  await ingestNationalEstimates();

  for (let i = 0; i < STATE_ABBRS.length; i++) {
    const state = STATE_ABBRS[i];
    console.log(`\n[${i + 1}/${STATE_ABBRS.length}] ${state}`);

    console.log("  Estimates...");
    await ingestStateEstimates(state);
    await sleep(300);

    console.log("  Agencies...");
    const agencyCount = await ingestAgencies(state);
    console.log(`  ${agencyCount || 0} agencies`);
    await sleep(300);

    console.log("  Participation...");
    await ingestParticipation(state);
    await sleep(300);

    // Summary counts for each offense
    for (const offense of OFFENSES) {
      console.log(`  Summary: ${offense}...`);
      await ingestSummary(state, offense);
      await sleep(300);
    }

    // Demographics for violent crime + homicide only (to limit API calls)
    for (const offense of ["violent-crime", "homicide", "aggravated-assault", "robbery"]) {
      console.log(`  Demographics: ${offense}...`);
      await ingestDemographics(state, offense);
    }

    console.log(`  Done with ${state}.`);
  }

  // Final stats
  const counts = db.prepare("SELECT 'estimates' as t, COUNT(*) as c FROM estimates UNION ALL SELECT 'summary_counts', COUNT(*) FROM summary_counts UNION ALL SELECT 'nibrs_demographics', COUNT(*) FROM nibrs_demographics UNION ALL SELECT 'agencies', COUNT(*) FROM agencies UNION ALL SELECT 'participation', COUNT(*) FROM participation").all();
  console.log("\n=== Final counts ===");
  for (const row of counts as any[]) {
    console.log(`  ${row.t}: ${row.c}`);
  }

  db.close();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
