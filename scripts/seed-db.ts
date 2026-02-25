import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "crime.db");
console.log(`Creating database at ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS agencies (
    ori TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL,
    state_abbr TEXT NOT NULL,
    county_name TEXT,
    agency_type TEXT,
    nibrs INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geo_level TEXT NOT NULL,       -- 'national' or 'state'
    geo_code TEXT NOT NULL,        -- '' for national, state abbr for state
    year INTEGER NOT NULL,
    population INTEGER,
    violent_crime INTEGER,
    homicide INTEGER,
    rape_legacy INTEGER,
    rape_revised INTEGER,
    robbery INTEGER,
    aggravated_assault INTEGER,
    property_crime INTEGER,
    burglary INTEGER,
    larceny INTEGER,
    motor_vehicle_theft INTEGER,
    arson INTEGER,
    UNIQUE(geo_level, geo_code, year)
  );

  CREATE TABLE IF NOT EXISTS summary_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geo_level TEXT NOT NULL,
    geo_code TEXT NOT NULL,
    offense TEXT NOT NULL,
    year INTEGER NOT NULL,
    actual INTEGER,
    cleared INTEGER,
    UNIQUE(geo_level, geo_code, offense, year)
  );

  CREATE TABLE IF NOT EXISTS nibrs_demographics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    geo_level TEXT NOT NULL,
    geo_code TEXT NOT NULL,
    offense TEXT NOT NULL,
    variable TEXT NOT NULL,         -- 'age', 'sex', 'race', 'ethnicity'
    value TEXT NOT NULL,
    count INTEGER NOT NULL,
    UNIQUE(geo_level, geo_code, offense, variable, value)
  );

  CREATE TABLE IF NOT EXISTS participation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_abbr TEXT NOT NULL,
    year INTEGER NOT NULL,
    population INTEGER,
    population_covered INTEGER,
    nibrs_population_covered INTEGER,
    UNIQUE(state_abbr, year)
  );

  CREATE INDEX IF NOT EXISTS idx_estimates_geo ON estimates(geo_level, geo_code);
  CREATE INDEX IF NOT EXISTS idx_summary_geo ON summary_counts(geo_level, geo_code, offense);
  CREATE INDEX IF NOT EXISTS idx_nibrs_geo ON nibrs_demographics(geo_level, geo_code, offense, variable);
  CREATE INDEX IF NOT EXISTS idx_agencies_state ON agencies(state_abbr);
`);

console.log("Database schema created successfully.");
db.close();
