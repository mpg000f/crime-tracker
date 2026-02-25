/**
 * Imports real FBI CIUS data from downloaded Excel files into SQLite.
 *
 * Sources:
 * - CIUS Estimations: Table 1 (national trends), Table 4 (state 2023-2024), Table 5 (state 2024)
 * - Persons Arrested: Table 38 (age), Table 42 (sex), Table 43A (race/ethnicity), Table 69 (by state)
 * - Expanded Homicide: Table 3 (offenders by age/sex/race/ethnicity)
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

// State name → abbreviation
const STATE_TO_ABBR: Record<string, string> = {
  "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
  "CALIFORNIA": "CA", "CALIFORNIA ": "CA", "COLORADO": "CO", "CONNECTICUT": "CT",
  "DELAWARE": "DE", "DISTRICT OF COLUMBIA": "DC", "FLORIDA": "FL", "GEORGIA": "GA",
  "HAWAII": "HI", "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN",
  "IOWA": "IA", "KANSAS": "KS", "KENTUCKY": "KY", "LOUISIANA": "LA",
  "MAINE": "ME", "MARYLAND": "MD", "MASSACHUSETTS": "MA", "MICHIGAN": "MI",
  "MINNESOTA": "MN", "MISSISSIPPI": "MS", "MISSOURI": "MO", "MONTANA": "MT",
  "NEBRASKA": "NE", "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
  "OHIO": "OH", "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA",
  "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD",
  "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT", "VERMONT": "VT",
  "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
  "WISCONSIN": "WI", "WYOMING": "WY",
};

function stateAbbr(name: string): string | null {
  // Strip footnote numbers and trim
  const clean = name.replace(/\d+,?\d*$/g, "").trim().toUpperCase();
  return STATE_TO_ABBR[clean] || null;
}

// ============================================================
// Clear existing data
// ============================================================
console.log("Clearing existing data...");
db.exec("DELETE FROM estimates");
db.exec("DELETE FROM summary_counts");
db.exec("DELETE FROM nibrs_demographics");

// ============================================================
// Table 1: National crime trends 2005-2024
// ============================================================
console.log("\nImporting Table 1 (National trends 2005-2024)...");
const t1File = path.join(RAW, "cius", "CIUS_Table_1_Crime_in_the_United_States_by_Volume_and_Rate_per_100000_Inhabitants_2005-2024.xlsx");
if (fs.existsSync(t1File)) {
  const rows = readSheet(t1File);
  const insertEst = db.prepare(`
    INSERT OR REPLACE INTO estimates
      (geo_level, geo_code, year, population, violent_crime, homicide,
       rape_legacy, rape_revised, robbery, aggravated_assault,
       property_crime, burglary, larceny, motor_vehicle_theft, arson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const year = parseNum(row[0]);
      if (year < 2000 || year > 2030) continue;
      const pop = parseNum(row[1]);
      if (pop === 0) continue;
      insertEst.run(
        "national", "", year, pop,
        parseNum(row[2]),  // violent crime
        parseNum(row[4]),  // murder
        parseNum(row[8]),  // rape legacy
        parseNum(row[6]),  // rape revised
        parseNum(row[10]), // robbery
        parseNum(row[12]), // aggravated assault
        parseNum(row[14]), // property crime
        parseNum(row[16]), // burglary
        parseNum(row[18]), // larceny
        parseNum(row[20]), // motor vehicle theft
        0                  // arson (not in this table)
      );
      count++;
    }
    console.log(`  Inserted ${count} national estimate rows`);
  });
  tx();
}

// ============================================================
// Table 5: Crime by State, 2024
// ============================================================
console.log("\nImporting Table 5 (Crime by State 2024)...");
const t5File = path.join(RAW, "cius", "CIUS_Table_5_Crime_in_the_United_States_by_State_2024.xlsx");
if (fs.existsSync(t5File)) {
  const rows = readSheet(t5File);
  const insertEst = db.prepare(`
    INSERT OR REPLACE INTO estimates
      (geo_level, geo_code, year, population, violent_crime, homicide,
       rape_legacy, rape_revised, robbery, aggravated_assault,
       property_crime, burglary, larceny, motor_vehicle_theft, arson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let currentState: string | null = null;
    let count = 0;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();

      // Detect state name (first column has a value, second says "Metropolitan...")
      if (col0 && col1.startsWith("Metropolitan")) {
        currentState = stateAbbr(col0);
      }

      // Look for "State Total" row
      if (col1 === "State Total" && currentState) {
        const pop = parseNum(row[3]);
        insertEst.run(
          "state", currentState, 2024, pop,
          parseNum(row[4]),  // violent crime
          parseNum(row[5]),  // murder
          parseNum(row[6]),  // rape
          parseNum(row[6]),  // rape revised = same
          parseNum(row[7]),  // robbery
          parseNum(row[8]),  // aggravated assault
          parseNum(row[9]),  // property crime
          parseNum(row[10]), // burglary
          parseNum(row[11]), // larceny
          parseNum(row[12]), // motor vehicle theft
          0
        );
        count++;
      }
    }
    console.log(`  Inserted ${count} state estimate rows for 2024`);
  });
  tx();
}

// ============================================================
// Table 4: Crime by State, 2023-2024 (get 2023 data)
// ============================================================
console.log("\nImporting Table 4 (State data 2023-2024)...");
const t4File = path.join(RAW, "cius", "CIUS_Table_4_Crime_in_the_United_States_by_Region_Geographic_Division_and_State_2023-2024.xlsx");
if (fs.existsSync(t4File)) {
  const rows = readSheet(t4File);
  const insertEst = db.prepare(`
    INSERT OR REPLACE INTO estimates
      (geo_level, geo_code, year, population, violent_crime, homicide,
       rape_legacy, rape_revised, robbery, aggravated_assault,
       property_crime, burglary, larceny, motor_vehicle_theft, arson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // This table has columns for both 2023 and 2024
  // Let's peek at the structure
  const header = rows.find((r: any[]) => r.some((c: any) => String(c).includes("Population")));
  console.log("  Header:", JSON.stringify(header));

  // Table 4 layout: [Area, Year, Population, ViolentCount, ViolentRate, MurderCount, MurderRate, RapeCount, RapeRate, RobberyCount, RobberyRate, AssaultCount, AssaultRate, PropertyCount, PropertyRate, BurglaryCount, BurglaryRate, LarcenyCount, LarcenyRate, MVTCount, MVTRate]
  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      if (!col0) continue;
      const abbr = stateAbbr(col0);
      if (!abbr) continue;

      const year = parseNum(row[1]);
      const pop = parseNum(row[2]);
      if (year < 2000 || year > 2030 || pop < 100000) continue;

      insertEst.run(
        "state", abbr, year, pop,
        parseNum(row[3]),  // violent crime count
        parseNum(row[5]),  // murder count
        parseNum(row[7]),  // rape count
        parseNum(row[7]),
        parseNum(row[9]),  // robbery count
        parseNum(row[11]), // assault count
        parseNum(row[13]), // property crime count
        parseNum(row[15]), // burglary count
        parseNum(row[17]), // larceny count
        parseNum(row[19]), // MVT count
        0
      );
      count++;
    }
    console.log(`  Inserted ${count} state rows from Table 4`);
  });
  tx();
}

// ============================================================
// CORGIS historical data (1960-2019) for trend lines
// ============================================================
async function main() {
console.log("\nFetching CORGIS historical data (1960-2019)...");
const CORGIS_URL = "https://corgis-edu.github.io/corgis/datasets/csv/state_crime/state_crime.csv";

const CORGIS_STATE_TO_ABBR: Record<string, string> = {
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
  "United States": "US",
};

async function fetchCorgis() {
  const res = await fetch(CORGIS_URL);
  const csv = await res.text();
  const lines = csv.split("\n").slice(1).filter(l => l.trim());

  const insertEst = db.prepare(`
    INSERT OR IGNORE INTO estimates
      (geo_level, geo_code, year, population, violent_crime, homicide,
       rape_legacy, rape_revised, robbery, aggravated_assault,
       property_crime, burglary, larceny, motor_vehicle_theft, arson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let count = 0;
    for (const line of lines) {
      // CSV: State, Year, Population, Rates..., Totals...
      const parts = line.match(/(".*?"|[^,]+)/g)?.map(s => s.replace(/"/g, "")) || [];
      const stateName = parts[0];
      const year = parseInt(parts[1]);
      const pop = parseInt(parts[2]);
      const abbr = CORGIS_STATE_TO_ABBR[stateName];

      if (!abbr || !year || !pop) continue;
      // Only import years we don't already have from CIUS
      if (year >= 2023) continue;

      const geoLevel = abbr === "US" ? "national" : "state";
      const geoCode = abbr === "US" ? "" : abbr;

      // Totals are in columns 16-19
      insertEst.run(
        geoLevel, geoCode, year, pop,
        parseNum(parts[16]), // violent total
        parseNum(parts[18]), // murder total
        parseNum(parts[19]), // rape total
        parseNum(parts[19]),
        parseNum(parts[20]), // robbery total
        parseNum(parts[17]), // assault total
        parseNum(parts[11]), // property total
        parseNum(parts[12]), // burglary total
        parseNum(parts[13]), // larceny total
        parseNum(parts[14]), // MVT total
        0
      );
      count++;
    }
    console.log(`  Inserted ${count} historical state-year rows`);
  });
  tx();
}

try {
  await fetchCorgis();
} catch (err) {
  console.warn("  Could not fetch CORGIS data:", err);
}

// ============================================================
// Table 43A: National arrests by race & ethnicity
// ============================================================
console.log("\nImporting Table 43A (Arrests by Race/Ethnicity)...");
const t43aFile = path.join(RAW, "arrests", "CIUS_Table_43A_Arrests_by_Race_and_Ethnicity_2024.xlsx");
if (fs.existsSync(t43aFile)) {
  const rows = readSheet(t43aFile);
  const insertDemo = db.prepare(`
    INSERT OR REPLACE INTO nibrs_demographics
      (geo_level, geo_code, offense, variable, value, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

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

  const raceLabels = [
    "White", "Black or African American",
    "American Indian or Alaska Native", "Asian",
    "Native Hawaiian or Other Pacific Islander"
  ];

  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const offense = offenseMap[String(row[0] || "").trim()];
      if (!offense) continue;

      // Race columns: Total(1), White(2), Black(3), AIAN(4), Asian(5), NHOPI(6)
      raceLabels.forEach((label, i) => {
        const val = parseNum(row[2 + i]);
        if (val > 0) {
          insertDemo.run("national", "", offense, "race", label, val);
          count++;
        }
      });

      // Ethnicity columns: Total(13), Hispanic(14), Not Hispanic(15)
      const hisp = parseNum(row[14]);
      const notHisp = parseNum(row[15]);
      if (hisp > 0) {
        insertDemo.run("national", "", offense, "ethnicity", "Hispanic or Latino", hisp);
        count++;
      }
      if (notHisp > 0) {
        insertDemo.run("national", "", offense, "ethnicity", "Not Hispanic or Latino", notHisp);
        count++;
      }
    }
    console.log(`  Inserted ${count} national race/ethnicity rows`);
  });
  tx();
}

// ============================================================
// Table 42: National arrests by sex
// ============================================================
console.log("\nImporting Table 42 (Arrests by Sex)...");
const t42File = path.join(RAW, "arrests", "CIUS_Table_42_Arrests_by_Sex_2024.xlsx");
if (fs.existsSync(t42File)) {
  const rows = readSheet(t42File);
  const insertDemo = db.prepare(`
    INSERT OR REPLACE INTO nibrs_demographics
      (geo_level, geo_code, offense, variable, value, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const offenseMap: Record<string, string> = {
    "Murder and nonnegligent manslaughter": "homicide",
    "Rape": "rape-legacy",
    "Robbery": "robbery",
    "Aggravated assault": "aggravated-assault",
    "Burglary": "burglary",
    "Larceny-theft": "larceny",
    "Motor vehicle theft": "motor-vehicle-theft",
  };

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
    console.log(`  Inserted ${count} national sex rows`);
  });
  tx();
}

// ============================================================
// Table 38: National arrests by age
// ============================================================
console.log("\nImporting Table 38 (Arrests by Age)...");
const t38File = path.join(RAW, "arrests", "CIUS_Table_38_Arrests_by_Age_2024.xlsx");
if (fs.existsSync(t38File)) {
  const rows = readSheet(t38File);
  const insertDemo = db.prepare(`
    INSERT OR REPLACE INTO nibrs_demographics
      (geo_level, geo_code, offense, variable, value, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const offenseMap: Record<string, string> = {
    "Murder and nonnegligent manslaughter": "homicide",
    "Rape": "rape-legacy",
    "Robbery": "robbery",
    "Aggravated assault": "aggravated-assault",
    "Burglary": "burglary",
    "Larceny-theft": "larceny",
    "Motor vehicle theft": "motor-vehicle-theft",
  };

  // Age columns: Under 18 (col 3), 18+ (col 4), then individual ages...
  // We'll bucket: Under 18, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  // Col indices from header: Under10(5), 10-12(6), 13-14(7), 15(8), 16(9), 17(10),
  //   18(11), 19(12), 20(13), 21(14), 22(15), 23(16), 24(17),
  //   25-29(18), 30-34(19), 35-39(20), 40-44(21), 45-49(22), 50-54(23),
  //   55-59(24), 60-64(25), 65+(26)

  const tx = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const offense = offenseMap[String(row[0] || "").trim()];
      if (!offense) continue;

      const under18 = parseNum(row[2]); // "Ages under 18" col
      const age18to24 = [11, 12, 13, 14, 15, 16, 17].reduce((s, i) => s + parseNum(row[i]), 0);
      const age25to34 = parseNum(row[18]) + parseNum(row[19]);
      const age35to44 = parseNum(row[20]) + parseNum(row[21]);
      const age45to54 = parseNum(row[22]) + parseNum(row[23]);
      const age55to64 = parseNum(row[24]) + parseNum(row[25]);
      const age65plus = parseNum(row[26]);

      const buckets: [string, number][] = [
        ["Under 18", under18],
        ["18-24", age18to24],
        ["25-34", age25to34],
        ["35-44", age35to44],
        ["45-54", age45to54],
        ["55-64", age55to64],
        ["65+", age65plus],
      ];

      for (const [label, val] of buckets) {
        if (val > 0) {
          insertDemo.run("national", "", offense, "age", label, val);
          count++;
        }
      }
    }
    console.log(`  Inserted ${count} national age rows`);
  });
  tx();
}

// ============================================================
// Table 69: Arrests by state (for state-level totals)
// ============================================================
console.log("\nImporting Table 69 (Arrests by State)...");
const t69File = path.join(RAW, "arrests", "CIUS_Table_69_Arrest_by_State_2024.xlsx");
if (fs.existsSync(t69File)) {
  const rows = readSheet(t69File);
  const insertSum = db.prepare(`
    INSERT OR REPLACE INTO summary_counts
      (geo_level, geo_code, offense, year, actual, cleared)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let count = 0;
    let currentState: string | null = null;
    for (const row of rows) {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();

      // State name appears on the "Under 18" row
      if (col0 && col1 === "Under 18") {
        currentState = stateAbbr(col0);
      }

      // Data is on the "Total all ages" row (col0 is null)
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
            insertSum.run("state", currentState, offense, 2024, actual, 0);
            count++;
          }
        }
      }
    }
    console.log(`  Inserted ${count} state arrest rows`);
  });
  tx();
}

// ============================================================
// Expanded Homicide Table 3: Offenders by demographics
// ============================================================
console.log("\nImporting Expanded Homicide Table 3 (Offender demographics)...");
const h3File = path.join(RAW, "homicide", "CIUS_Expanded_Homicide_Data_Table_3_Murder_Offenders_by_Age_Sex_Race_and_Ethnicity_2024.xlsx");
if (fs.existsSync(h3File)) {
  const rows = readSheet(h3File);
  const insertDemo = db.prepare(`
    INSERT OR REPLACE INTO nibrs_demographics
      (geo_level, geo_code, offense, variable, value, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Row 5 has the totals: Total, Male, Female, Unknown, White, Black, Other, Unknown, Hispanic, Not Hispanic, Unknown
  const totalRow = rows[5];
  if (totalRow) {
    const tx = db.transaction(() => {
      // Sex
      insertDemo.run("national", "", "homicide-offender", "sex", "Male", parseNum(totalRow[2]));
      insertDemo.run("national", "", "homicide-offender", "sex", "Female", parseNum(totalRow[3]));
      insertDemo.run("national", "", "homicide-offender", "sex", "Unknown", parseNum(totalRow[4]));

      // Race
      insertDemo.run("national", "", "homicide-offender", "race", "White", parseNum(totalRow[5]));
      insertDemo.run("national", "", "homicide-offender", "race", "Black or African American", parseNum(totalRow[6]));
      insertDemo.run("national", "", "homicide-offender", "race", "Other", parseNum(totalRow[7]));
      insertDemo.run("national", "", "homicide-offender", "race", "Unknown", parseNum(totalRow[8]));

      // Ethnicity
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Hispanic or Latino", parseNum(totalRow[9]));
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Not Hispanic or Latino", parseNum(totalRow[10]));
      insertDemo.run("national", "", "homicide-offender", "ethnicity", "Unknown", parseNum(totalRow[11]));

      // Age buckets from individual rows
      const ageBuckets: [string, number[]][] = [
        ["Under 18", [7]],    // row index for "Under 18"
        ["18-24", [8]],       // "Under 22" minus "Under 18" approximation — use row 15-16 instead
      ];

      // Better: sum from individual age rows
      let under18 = 0, age18to24 = 0, age25to34 = 0, age35to44 = 0, age45plus = 0;
      for (const row of rows) {
        const label = String(row[0] || "").trim();
        const total = parseNum(row[1]);
        if (label === "Under 184" || label === "Under 18") under18 = total;
        if (label === "17 to 19") age18to24 += total;
        if (label === "20 to 24") age18to24 += total;
        if (label === "25 to 29" || label === "30 to 34") age25to34 += total;
        if (label === "35 to 39" || label === "40 to 44") age35to44 += total;
        if (label === "45 to 49" || label === "50 to 54" || label === "55 to 59" ||
            label === "60 to 64" || label === "65 to 69" || label === "70 to 74" ||
            label === "75 and over") age45plus += total;
      }

      insertDemo.run("national", "", "homicide-offender", "age", "Under 18", under18);
      insertDemo.run("national", "", "homicide-offender", "age", "18-24", age18to24);
      insertDemo.run("national", "", "homicide-offender", "age", "25-34", age25to34);
      insertDemo.run("national", "", "homicide-offender", "age", "35-44", age35to44);
      insertDemo.run("national", "", "homicide-offender", "age", "45+", age45plus);

      console.log("  Inserted homicide offender demographics");
    });
    tx();
  }
}

// ============================================================
// Summary
// ============================================================
const counts = db.prepare(`
  SELECT 'estimates' as t, COUNT(*) as c FROM estimates
  UNION ALL SELECT 'summary_counts', COUNT(*) FROM summary_counts
  UNION ALL SELECT 'nibrs_demographics', COUNT(*) FROM nibrs_demographics
`).all() as { t: string; c: number }[];

console.log("\n=== Import Complete ===");
for (const row of counts) {
  console.log(`  ${row.t}: ${row.c}`);
}

// Spot check
const ga2024 = db.prepare("SELECT * FROM estimates WHERE geo_level='state' AND geo_code='GA' AND year=2024").get() as any;
if (ga2024) {
  console.log(`\nSpot check — Georgia 2024: pop=${ga2024.population}, violent=${ga2024.violent_crime}, rate=${((ga2024.violent_crime/ga2024.population)*100000).toFixed(1)}`);
}

db.close();
} // end main

main().catch(err => { console.error(err); process.exit(1); });
