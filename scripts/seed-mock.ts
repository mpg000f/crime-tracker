import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "crime.db"));
db.pragma("journal_mode = WAL");

const STATES: Record<string, { name: string; pop: number }> = {
  AL: { name: "Alabama", pop: 5024279 }, AK: { name: "Alaska", pop: 733391 },
  AZ: { name: "Arizona", pop: 7151502 }, AR: { name: "Arkansas", pop: 3011524 },
  CA: { name: "California", pop: 39538223 }, CO: { name: "Colorado", pop: 5773714 },
  CT: { name: "Connecticut", pop: 3605944 }, DE: { name: "Delaware", pop: 989948 },
  FL: { name: "Florida", pop: 21538187 }, GA: { name: "Georgia", pop: 10711908 },
  HI: { name: "Hawaii", pop: 1455271 }, ID: { name: "Idaho", pop: 1839106 },
  IL: { name: "Illinois", pop: 12812508 }, IN: { name: "Indiana", pop: 6732219 },
  IA: { name: "Iowa", pop: 3190369 }, KS: { name: "Kansas", pop: 2937880 },
  KY: { name: "Kentucky", pop: 4505836 }, LA: { name: "Louisiana", pop: 4657757 },
  ME: { name: "Maine", pop: 1362359 }, MD: { name: "Maryland", pop: 6177224 },
  MA: { name: "Massachusetts", pop: 7029917 }, MI: { name: "Michigan", pop: 10077331 },
  MN: { name: "Minnesota", pop: 5706494 }, MS: { name: "Mississippi", pop: 2961279 },
  MO: { name: "Missouri", pop: 6154913 }, MT: { name: "Montana", pop: 1084225 },
  NE: { name: "Nebraska", pop: 1961504 }, NV: { name: "Nevada", pop: 3104614 },
  NH: { name: "New Hampshire", pop: 1377529 }, NJ: { name: "New Jersey", pop: 9288994 },
  NM: { name: "New Mexico", pop: 2117522 }, NY: { name: "New York", pop: 20201249 },
  NC: { name: "North Carolina", pop: 10439388 }, ND: { name: "North Dakota", pop: 779094 },
  OH: { name: "Ohio", pop: 11799448 }, OK: { name: "Oklahoma", pop: 3959353 },
  OR: { name: "Oregon", pop: 4237256 }, PA: { name: "Pennsylvania", pop: 13002700 },
  RI: { name: "Rhode Island", pop: 1097379 }, SC: { name: "South Carolina", pop: 5118425 },
  SD: { name: "South Dakota", pop: 886667 }, TN: { name: "Tennessee", pop: 6910840 },
  TX: { name: "Texas", pop: 29145505 }, UT: { name: "Utah", pop: 3271616 },
  VT: { name: "Vermont", pop: 643077 }, VA: { name: "Virginia", pop: 8631393 },
  WA: { name: "Washington", pop: 7614893 }, WV: { name: "West Virginia", pop: 1793716 },
  WI: { name: "Wisconsin", pop: 5893718 }, WY: { name: "Wyoming", pop: 576851 },
  DC: { name: "District of Columbia", pop: 689545 },
};

// Realistic base violent crime rates per 100k (roughly 2020 actuals)
const BASE_RATES: Record<string, number> = {
  AL: 453, AK: 838, AZ: 484, AR: 580, CA: 442, CO: 423, CT: 183, DE: 431,
  FL: 384, GA: 340, HI: 254, ID: 227, IL: 415, IN: 358, IA: 266, KS: 410,
  KY: 212, LA: 639, ME: 109, MD: 454, MA: 308, MI: 474, MN: 235, MS: 291,
  MO: 542, MT: 469, NE: 285, NV: 460, NH: 147, NJ: 206, NM: 780, NY: 363,
  NC: 419, ND: 282, OH: 309, OK: 432, OR: 292, PA: 306, RI: 218, SC: 530,
  SD: 501, TN: 673, TX: 446, UT: 261, VT: 173, VA: 208, WA: 312, WV: 355,
  WI: 294, WY: 234, DC: 999,
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rand = rng(6740);
function jitter(base: number, pct: number): number {
  return Math.round(base * (1 + (rand() - 0.5) * 2 * pct));
}

const YEARS = Array.from({ length: 23 }, (_, i) => 2000 + i); // 2000-2022

// --- Insert estimates ---
console.log("Seeding estimates...");
const insertEst = db.prepare(`
  INSERT OR REPLACE INTO estimates
    (geo_level, geo_code, year, population, violent_crime, homicide,
     rape_legacy, rape_revised, robbery, aggravated_assault,
     property_crime, burglary, larceny, motor_vehicle_theft, arson)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const estTx = db.transaction(() => {
  // National
  for (const year of YEARS) {
    const pop = jitter(330_000_000, 0.03);
    const vc = jitter(1200000, 0.1);
    insertEst.run(
      "national", "", year, pop, vc,
      jitter(16000, 0.15), jitter(85000, 0.1), jitter(80000, 0.1),
      jitter(250000, 0.1), jitter(800000, 0.1),
      jitter(6900000, 0.08), jitter(1100000, 0.1),
      jitter(4700000, 0.08), jitter(700000, 0.12), jitter(40000, 0.15)
    );
  }

  // States
  for (const [abbr, info] of Object.entries(STATES)) {
    const baseRate = BASE_RATES[abbr] || 350;
    for (const year of YEARS) {
      const pop = jitter(info.pop, 0.02);
      const vcRate = baseRate * (1 + (rand() - 0.5) * 0.3); // year-to-year variation
      const vc = Math.round((vcRate / 100000) * pop);
      const homicide = Math.round(vc * (0.01 + rand() * 0.02));
      const rape = Math.round(vc * (0.06 + rand() * 0.04));
      const robbery = Math.round(vc * (0.15 + rand() * 0.1));
      const assault = vc - homicide - rape - robbery;
      const pc = Math.round(vc * (3 + rand() * 2));
      insertEst.run(
        "state", abbr, year, pop, vc, homicide, rape, Math.round(rape * 1.1),
        robbery, assault, pc, Math.round(pc * 0.2), Math.round(pc * 0.6),
        Math.round(pc * 0.15), Math.round(pc * 0.01)
      );
    }
  }
});
estTx();

// --- Insert summary counts ---
console.log("Seeding summary counts...");
const OFFENSES = [
  "violent-crime", "homicide", "rape-legacy", "robbery",
  "aggravated-assault", "property-crime", "burglary",
  "larceny", "motor-vehicle-theft", "arson",
];

const insertSum = db.prepare(`
  INSERT OR REPLACE INTO summary_counts
    (geo_level, geo_code, offense, year, actual, cleared)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const sumTx = db.transaction(() => {
  for (const [abbr, info] of Object.entries(STATES)) {
    const baseRate = BASE_RATES[abbr] || 350;
    for (const offense of OFFENSES) {
      let multiplier = 1;
      if (offense === "homicide") multiplier = 0.015;
      else if (offense === "rape-legacy") multiplier = 0.08;
      else if (offense === "robbery") multiplier = 0.2;
      else if (offense === "aggravated-assault") multiplier = 0.7;
      else if (offense === "property-crime") multiplier = 5;
      else if (offense === "burglary") multiplier = 1;
      else if (offense === "larceny") multiplier = 3;
      else if (offense === "motor-vehicle-theft") multiplier = 0.8;
      else if (offense === "arson") multiplier = 0.05;

      for (const year of YEARS) {
        const base = Math.round((baseRate / 100000) * info.pop * multiplier);
        const actual = jitter(base, 0.15);
        const clearRate = offense === "homicide" ? 0.6 : 0.3 + rand() * 0.2;
        insertSum.run("state", abbr, offense, year, actual, Math.round(actual * clearRate));
      }
    }
  }
});
sumTx();

// --- Insert demographics ---
console.log("Seeding demographics...");
const insertDemo = db.prepare(`
  INSERT OR REPLACE INTO nibrs_demographics
    (geo_level, geo_code, offense, variable, value, count)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const raceValues = ["White", "Black or African American", "American Indian or Alaska Native", "Asian", "Native Hawaiian or Other Pacific Islander", "Unknown"];
const racePcts = [0.44, 0.37, 0.02, 0.01, 0.005, 0.155];
const sexValues = ["Male", "Female", "Unknown"];
const sexPcts = [0.72, 0.22, 0.06];
const ageValues = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Unknown"];
const agePcts = [0.08, 0.20, 0.25, 0.18, 0.12, 0.08, 0.03, 0.06];
const ethValues = ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"];
const ethPcts = [0.20, 0.65, 0.15];

const demoOffenses = ["violent-crime", "homicide", "aggravated-assault", "robbery"];

const demoTx = db.transaction(() => {
  for (const [abbr, info] of Object.entries(STATES)) {
    for (const offense of demoOffenses) {
      const baseCount = Math.round((BASE_RATES[abbr] / 100000) * info.pop * 0.5);

      raceValues.forEach((v, i) => {
        insertDemo.run("state", abbr, offense, "race", v, jitter(Math.round(baseCount * racePcts[i]), 0.2));
      });
      sexValues.forEach((v, i) => {
        insertDemo.run("state", abbr, offense, "sex", v, jitter(Math.round(baseCount * sexPcts[i]), 0.15));
      });
      ageValues.forEach((v, i) => {
        insertDemo.run("state", abbr, offense, "age", v, jitter(Math.round(baseCount * agePcts[i]), 0.2));
      });
      ethValues.forEach((v, i) => {
        insertDemo.run("state", abbr, offense, "ethnicity", v, jitter(Math.round(baseCount * ethPcts[i]), 0.25));
      });
    }
  }
});
demoTx();

// --- Insert agencies ---
console.log("Seeding agencies...");
const insertAg = db.prepare(`
  INSERT OR REPLACE INTO agencies
    (ori, agency_name, state_abbr, county_name, agency_type, nibrs, latitude, longitude)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const agTx = db.transaction(() => {
  let idx = 0;
  for (const [abbr, info] of Object.entries(STATES)) {
    const count = Math.max(3, Math.round(info.pop / 200000));
    for (let j = 0; j < count; j++) {
      idx++;
      const ori = `${abbr}${String(idx).padStart(5, "0")}00`;
      const name = j === 0 ? `${info.name} State Police` : `${info.name} PD #${j}`;
      insertAg.run(
        ori, name, abbr, `${info.name} County`, "City",
        rand() > 0.4 ? 1 : 0,
        30 + rand() * 18, -(70 + rand() * 50)
      );
    }
  }
});
agTx();

// --- Insert participation ---
console.log("Seeding participation...");
const insertPart = db.prepare(`
  INSERT OR REPLACE INTO participation
    (state_abbr, year, population, population_covered, nibrs_population_covered)
  VALUES (?, ?, ?, ?, ?)
`);

const partTx = db.transaction(() => {
  for (const [abbr, info] of Object.entries(STATES)) {
    for (const year of YEARS) {
      const pop = jitter(info.pop, 0.02);
      const covPct = 0.7 + rand() * 0.25;
      const nibrsPct = 0.3 + rand() * 0.5;
      insertPart.run(abbr, year, pop, Math.round(pop * covPct), Math.round(pop * nibrsPct));
    }
  }
});
partTx();

// Summary
const counts = db.prepare(`
  SELECT 'estimates' as t, COUNT(*) as c FROM estimates
  UNION ALL SELECT 'summary_counts', COUNT(*) FROM summary_counts
  UNION ALL SELECT 'nibrs_demographics', COUNT(*) FROM nibrs_demographics
  UNION ALL SELECT 'agencies', COUNT(*) FROM agencies
  UNION ALL SELECT 'participation', COUNT(*) FROM participation
`).all() as { t: string; c: number }[];

console.log("\n=== Mock data seeded ===");
for (const row of counts) {
  console.log(`  ${row.t}: ${row.c}`);
}
db.close();
