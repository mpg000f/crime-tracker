/**
 * Imports all downloaded FBI CIUS data (2020-2024) + CORGIS historical data into SQLite.
 */

import Database from "better-sqlite3";
import XLSX from "xlsx";
import path from "path";
import fs from "fs";

const db = new Database(path.join(process.cwd(), "data", "crime.db"));
db.pragma("journal_mode = WAL");

const RAW = path.join(process.cwd(), "data", "raw");

function readSheet(filePath: string): any[][] {
  const wb = XLSX.readFile(filePath);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
}

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "" || v === " " || v === "--") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

const STATE_TO_ABBR: Record<string, string> = {
  "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
  "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
  "DISTRICT OF COLUMBIA": "DC", "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI",
  "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA",
  "KANSAS": "KS", "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME",
  "MARYLAND": "MD", "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN",
  "MISSISSIPPI": "MS", "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE",
  "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM",
  "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH",
  "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX",
  "UTAH": "UT", "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA",
  "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY",
};

function stateAbbr(name: string): string | null {
  const clean = name.replace(/[\d,]+$/g, "").trim().toUpperCase();
  return STATE_TO_ABBR[clean] || null;
}

// Prepared statements
const insertEst = db.prepare(`
  INSERT OR REPLACE INTO estimates
    (geo_level, geo_code, year, population, violent_crime, homicide,
     rape_legacy, rape_revised, robbery, aggravated_assault,
     property_crime, burglary, larceny, motor_vehicle_theft, arson)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSum = db.prepare(`
  INSERT OR REPLACE INTO summary_counts
    (geo_level, geo_code, offense, year, actual, cleared)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertDemo = db.prepare(`
  INSERT OR REPLACE INTO nibrs_demographics
    (geo_level, geo_code, offense, variable, value, count)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// ============================================================
console.log("Clearing existing data...");
db.exec("DELETE FROM estimates");
db.exec("DELETE FROM summary_counts");
db.exec("DELETE FROM nibrs_demographics");

// ============================================================
// Find and import all Table 1 files (national trends)
// ============================================================
console.log("\n=== National Trends (Table 1) ===");
const t1Files = [
  path.join(RAW, "cius", "CIUS_Table_1_Crime_in_the_United_States_by_Volume_and_Rate_per_100000_Inhabitants_2005-2024.xlsx"),
  path.join(RAW, "cius-2023", "Table_1_Crime_in_the_United_States_by_Volume_and_Rate_per_100000_Inhabitants_2004-2023.xlsx"),
  path.join(RAW, "cius-2022", "Table_1_Crime_in_the_United_States_by_Volume_and_Rate_per_100000_Inhabitants_2003-2022.xlsx"),
  path.join(RAW, "cius-2020", "Table_01_Crime_in_the_United_States_by_Volume_and_Rate_per_100000_Inhabitants_2001-2020.xls"),
];

// Use the most recent file — it has the longest span
for (const f of t1Files) {
  if (!fs.existsSync(f)) continue;
  console.log(`  Reading ${path.basename(f)}...`);
  const rows = readSheet(f);
  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const year = parseNum(row[0]);
      if (year < 1990 || year > 2030) continue;
      const pop = parseNum(row[1]);
      if (pop === 0) continue;
      insertEst.run(
        "national", "", year, pop,
        parseNum(row[2]), parseNum(row[4]),
        parseNum(row[8]), parseNum(row[6]),
        parseNum(row[10]), parseNum(row[12]),
        parseNum(row[14]), parseNum(row[16]),
        parseNum(row[18]), parseNum(row[20]), 0
      );
      count++;
    }
    console.log(`  Inserted ${count} national rows`);
  });
  tx();
  break; // only need the most recent (broadest range)
}

// ============================================================
// Import all Table 5 files (state crime by year)
// ============================================================
console.log("\n=== State Crime (Table 5) ===");

interface T5Config {
  dir: string;
  file: string;
  year: number;
}

const t5Configs: T5Config[] = [
  { dir: "cius", file: "CIUS_Table_5_Crime_in_the_United_States_by_State_2024.xlsx", year: 2024 },
  { dir: "cius-2023", file: "Table_5_Crime_in_the_United_States_by_State_2023.xlsx", year: 2023 },
  { dir: "cius-2022", file: "Table_5_Crime_in_the_United_States_by_State_2022.xlsx", year: 2022 },
  { dir: "cius-2020", file: "Table_05_Crime_in_the_United_States_by_State_2020.xls", year: 2020 },
];

for (const cfg of t5Configs) {
  const fp = path.join(RAW, cfg.dir, cfg.file);
  if (!fs.existsSync(fp)) { console.log(`  Skipping ${cfg.year} (file not found)`); continue; }
  console.log(`  Reading ${cfg.year}...`);
  const rows = readSheet(fp);

  const tx = db.transaction(() => {
    let currentState: string | null = null;
    let count = 0;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();

      if (col0 && col1.startsWith("Metropolitan")) {
        currentState = stateAbbr(col0);
      }
      if (col1 === "State Total" && currentState) {
        const pop = parseNum(row[3]);
        insertEst.run(
          "state", currentState, cfg.year, pop,
          parseNum(row[4]), parseNum(row[5]),
          parseNum(row[6]), parseNum(row[6]),
          parseNum(row[7]), parseNum(row[8]),
          parseNum(row[9]), parseNum(row[10]),
          parseNum(row[11]), parseNum(row[12]), 0
        );
        count++;
      }
    }
    console.log(`  Inserted ${count} state rows for ${cfg.year}`);
  });
  tx();
}

// ============================================================
// Import all Table 4 files (state 2-year comparisons — fills gaps)
// ============================================================
console.log("\n=== State 2-Year Comparisons (Table 4) ===");

const t4Configs = [
  { dir: "cius", file: "CIUS_Table_4_Crime_in_the_United_States_by_Region_Geographic_Division_and_State_2023-2024.xlsx" },
  { dir: "cius-2023", file: "Table_4_Crime_in_the_United_States_by_Region_Geographic_Division_and_State_2022-2023.xlsx" },
  { dir: "cius-2022", file: "Table_4_Crime_in_the_United_States_by_Region_Geographic_Division_and_State_2021-2022.xlsx" },
  { dir: "cius-2020", file: "Table_04_Crime_in_the_United_States_by_Region_Geographic_Division_and_State_2019-2020.xls" },
];

for (const cfg of t4Configs) {
  const fp = path.join(RAW, cfg.dir, cfg.file);
  if (!fs.existsSync(fp)) { console.log(`  Skipping ${cfg.file} (not found)`); continue; }
  console.log(`  Reading ${path.basename(fp)}...`);
  const rows = readSheet(fp);

  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      if (!col0) continue;
      const abbr = stateAbbr(col0);
      if (!abbr) continue;

      const year = parseNum(row[1]);
      const pop = parseNum(row[2]);
      if (year < 2000 || year > 2030 || pop < 50000) continue;

      // INSERT OR IGNORE so Table 5 data (more detailed) takes priority
      db.prepare(`
        INSERT OR IGNORE INTO estimates
          (geo_level, geo_code, year, population, violent_crime, homicide,
           rape_legacy, rape_revised, robbery, aggravated_assault,
           property_crime, burglary, larceny, motor_vehicle_theft, arson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "state", abbr, year, pop,
        parseNum(row[3]), parseNum(row[5]),
        parseNum(row[7]), parseNum(row[7]),
        parseNum(row[9]), parseNum(row[11]),
        parseNum(row[13]), parseNum(row[15]),
        parseNum(row[17]), parseNum(row[19]), 0
      );
      count++;
    }
    console.log(`  Inserted ${count} state-year rows`);
  });
  tx();
}

// ============================================================
// CORGIS historical data (fills 1960-2019)
// ============================================================
async function fetchCorgis() {
  console.log("\n=== CORGIS Historical Data (1960-2019) ===");
  const CORGIS_URL = "https://corgis-edu.github.io/corgis/datasets/csv/state_crime/state_crime.csv";

  const CORGIS_STATE: Record<string, string> = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
    "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  };

  const res = await fetch(CORGIS_URL);
  const csv = await res.text();
  const lines = csv.split("\n").slice(1).filter(l => l.trim());

  const tx = db.transaction(() => {
    let count = 0;
    for (const line of lines) {
      const parts = line.match(/(".*?"|[^,]+)/g)?.map(s => s.replace(/"/g, "")) || [];
      const abbr = CORGIS_STATE[parts[0]];
      const year = parseInt(parts[1]);
      const pop = parseInt(parts[2]);

      if (!abbr || !year || !pop || year >= 2019) continue;

      // INSERT OR IGNORE — don't overwrite CIUS data
      db.prepare(`
        INSERT OR IGNORE INTO estimates
          (geo_level, geo_code, year, population, violent_crime, homicide,
           rape_legacy, rape_revised, robbery, aggravated_assault,
           property_crime, burglary, larceny, motor_vehicle_theft, arson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "state", abbr, year, pop,
        parseNum(parts[16]), parseNum(parts[18]),
        parseNum(parts[19]), parseNum(parts[19]),
        parseNum(parts[20]), parseNum(parts[17]),
        parseNum(parts[11]), parseNum(parts[12]),
        parseNum(parts[13]), parseNum(parts[14]), 0
      );
      count++;
    }
    console.log(`  Inserted ${count} historical rows`);
  });
  tx();
}

// ============================================================
// Import all Table 69 files (arrests by state)
// ============================================================
console.log("\n=== Arrests by State (Table 69) ===");

function importTable69(filePath: string, year: number) {
  if (!fs.existsSync(filePath)) { console.log(`  Skipping ${year} (not found)`); return; }
  console.log(`  Reading ${year}...`);
  const rows = readSheet(filePath);

  const tx = db.transaction(() => {
    let count = 0;
    let currentState: string | null = null;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();

      if (col0 && col1 === "Under 18") {
        currentState = stateAbbr(col0);
      }
      if (col1 === "Total all ages" && currentState) {
        const offenses: [string, number][] = [
          ["violent-crime", parseNum(row[3])],
          ["homicide", parseNum(row[5])],
          ["rape-legacy", parseNum(row[6])],
          ["robbery", parseNum(row[7])],
          ["aggravated-assault", parseNum(row[8])],
          ["property-crime", parseNum(row[4])],
          ["burglary", parseNum(row[9])],
          ["larceny", parseNum(row[10])],
          ["motor-vehicle-theft", parseNum(row[11])],
          ["arson", parseNum(row[12])],
        ];
        for (const [offense, actual] of offenses) {
          if (actual > 0) {
            insertSum.run("state", currentState, offense, year, actual, 0);
            count++;
          }
        }
      }
    }
    console.log(`  Inserted ${count} rows for ${year}`);
  });
  tx();
}

importTable69(path.join(RAW, "arrests", "CIUS_Table_69_Arrest_by_State_2024.xlsx"), 2024);
importTable69(path.join(RAW, "arrests-2023", "Table_69_Arrest_by_State_2023.xlsx"), 2023);
importTable69(path.join(RAW, "arrests-2022", "Table_69_Arrest_by_State_2022.xlsx"), 2022);
importTable69(path.join(RAW, "arrests-2021", "Table_69_Arrest_by_State_2021.xls"), 2021);
importTable69(path.join(RAW, "arrests-2020", "Table_69_Arrest_by_State_2020.xls"), 2020);

// ============================================================
// National demographics from 2024 tables
// ============================================================
console.log("\n=== National Demographics (2024) ===");

const offenseMap: Record<string, string> = {
  "Murder and nonnegligent manslaughter": "homicide",
  "Rape": "rape-legacy",
  "Robbery": "robbery",
  "Aggravated assault": "aggravated-assault",
  "Burglary": "burglary",
  "Larceny-theft": "larceny",
  "Motor vehicle theft": "motor-vehicle-theft",
  "Arson": "arson",
};

// Table 43A — Race/Ethnicity
const t43aFile = path.join(RAW, "arrests", "CIUS_Table_43A_Arrests_by_Race_and_Ethnicity_2024.xlsx");
if (fs.existsSync(t43aFile)) {
  console.log("  Race/Ethnicity...");
  const rows = readSheet(t43aFile);
  const raceLabels = ["White", "Black or African American", "American Indian or Alaska Native", "Asian", "Native Hawaiian or Other Pacific Islander"];

  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const offense = offenseMap[String(row[0] || "").trim()];
      if (!offense) continue;
      raceLabels.forEach((label, i) => {
        const val = parseNum(row[2 + i]);
        if (val > 0) { insertDemo.run("national", "", offense, "race", label, val); count++; }
      });
      const hisp = parseNum(row[14]);
      const notHisp = parseNum(row[15]);
      if (hisp > 0) { insertDemo.run("national", "", offense, "ethnicity", "Hispanic or Latino", hisp); count++; }
      if (notHisp > 0) { insertDemo.run("national", "", offense, "ethnicity", "Not Hispanic or Latino", notHisp); count++; }
    }
    console.log(`  ${count} race/ethnicity rows`);
  });
  tx();
}

// Table 42 — Sex
const t42File = path.join(RAW, "arrests", "CIUS_Table_42_Arrests_by_Sex_2024.xlsx");
if (fs.existsSync(t42File)) {
  console.log("  Sex...");
  const rows = readSheet(t42File);
  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const offense = offenseMap[String(row[0] || "").trim()];
      if (!offense) continue;
      const male = parseNum(row[2]);
      const female = parseNum(row[3]);
      if (male > 0) { insertDemo.run("national", "", offense, "sex", "Male", male); count++; }
      if (female > 0) { insertDemo.run("national", "", offense, "sex", "Female", female); count++; }
    }
    console.log(`  ${count} sex rows`);
  });
  tx();
}

// Table 38 — Age
const t38File = path.join(RAW, "arrests", "CIUS_Table_38_Arrests_by_Age_2024.xlsx");
if (fs.existsSync(t38File)) {
  console.log("  Age...");
  const rows = readSheet(t38File);
  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const offense = offenseMap[String(row[0] || "").trim()];
      if (!offense) continue;
      const under18 = parseNum(row[2]);
      const a18_24 = [11, 12, 13, 14, 15, 16, 17].reduce((s, i) => s + parseNum(row[i]), 0);
      const a25_34 = parseNum(row[18]) + parseNum(row[19]);
      const a35_44 = parseNum(row[20]) + parseNum(row[21]);
      const a45_54 = parseNum(row[22]) + parseNum(row[23]);
      const a55_64 = parseNum(row[24]) + parseNum(row[25]);
      const a65plus = parseNum(row[26]);
      const buckets: [string, number][] = [
        ["Under 18", under18], ["18-24", a18_24], ["25-34", a25_34],
        ["35-44", a35_44], ["45-54", a45_54], ["55-64", a55_64], ["65+", a65plus],
      ];
      for (const [label, val] of buckets) {
        if (val > 0) { insertDemo.run("national", "", offense, "age", label, val); count++; }
      }
    }
    console.log(`  ${count} age rows`);
  });
  tx();
}

// Expanded Homicide Table 3 — Offender demographics
const h3File = path.join(RAW, "homicide", "CIUS_Expanded_Homicide_Data_Table_3_Murder_Offenders_by_Age_Sex_Race_and_Ethnicity_2024.xlsx");
if (fs.existsSync(h3File)) {
  console.log("  Homicide offender demographics...");
  const rows = readSheet(h3File);
  const totalRow = rows[5];
  if (totalRow) {
    const tx = db.transaction(() => {
      insertDemo.run("national", "", "homicide-offender", "sex", "Male", parseNum(totalRow[2]));
      insertDemo.run("national", "", "homicide-offender", "sex", "Female", parseNum(totalRow[3]));
      insertDemo.run("national", "", "homicide-offender", "sex", "Unknown", parseNum(totalRow[4]));
      insertDemo.run("national", "", "homicide-offender", "race", "White", parseNum(totalRow[5]));
      insertDemo.run("national", "", "homicide-offender", "race", "Black or African American", parseNum(totalRow[6]));
      insertDemo.run("national", "", "homicide-offender", "race", "Other", parseNum(totalRow[7]));
      insertDemo.run("national", "", "homicide-offender", "race", "Unknown", parseNum(totalRow[8]));
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Hispanic or Latino", parseNum(totalRow[9]));
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Not Hispanic or Latino", parseNum(totalRow[10]));
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Unknown", parseNum(totalRow[11]));
      console.log("  Homicide offender done");
    });
    tx();
  }
}

// ============================================================
// Main — run async parts then summary
// ============================================================
async function main() {
  try {
    await fetchCorgis();
  } catch (err) {
    console.warn("  Could not fetch CORGIS data:", err);
  }

  // Summary
  const counts = db.prepare(`
    SELECT 'estimates' as t, COUNT(*) as c FROM estimates
    UNION ALL SELECT 'summary_counts', COUNT(*) FROM summary_counts
    UNION ALL SELECT 'nibrs_demographics', COUNT(*) FROM nibrs_demographics
  `).all() as { t: string; c: number }[];

  console.log("\n=== Import Complete ===");
  for (const row of counts) {
    console.log(`  ${row.t}: ${row.c}`);
  }

  // Year coverage
  const years = db.prepare(`
    SELECT geo_level, MIN(year) as min_yr, MAX(year) as max_yr, COUNT(DISTINCT year) as yrs, COUNT(DISTINCT geo_code) as geos
    FROM estimates GROUP BY geo_level
  `).all() as any[];
  console.log("\nEstimate coverage:");
  for (const y of years) {
    console.log(`  ${y.geo_level}: ${y.min_yr}-${y.max_yr} (${y.yrs} years, ${y.geos} geos)`);
  }

  const sumYears = db.prepare(`
    SELECT MIN(year) as min_yr, MAX(year) as max_yr, COUNT(DISTINCT year) as yrs, COUNT(DISTINCT geo_code) as states
    FROM summary_counts
  `).get() as any;
  console.log(`\nArrest data: ${sumYears.min_yr}-${sumYears.max_yr} (${sumYears.yrs} years, ${sumYears.states} states)`);

  // Spot checks
  const ga = db.prepare("SELECT year, violent_crime, population FROM estimates WHERE geo_code='GA' ORDER BY year DESC LIMIT 3").all() as any[];
  console.log("\nGeorgia spot check:");
  ga.forEach((r: any) => console.log(`  ${r.year}: violent=${r.violent_crime}, rate=${((r.violent_crime/r.population)*100000).toFixed(1)}`));

  db.close();
}

main();
