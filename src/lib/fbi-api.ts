const BASE_URL = "https://api.usa.gov/crime/fbi/sapi/api";

function getApiKey(): string {
  const key = process.env.FBI_API_KEY;
  if (!key) throw new Error("FBI_API_KEY not set — get one at https://api.data.gov/signup/");
  return key;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fbiFetch<T>(endpoint: string, retries = 3): Promise<T> {
  const url = `${BASE_URL}${endpoint}?API_KEY=${getApiKey()}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`FBI API ${res.status}: ${res.statusText} for ${endpoint}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${endpoint}`);
}

// Estimate data for a state (or national)
export interface EstimateRow {
  year: number;
  population: number;
  violent_crime: number;
  homicide: number;
  rape_legacy: number;
  rape_revised: number;
  robbery: number;
  aggravated_assault: number;
  property_crime: number;
  burglary: number;
  larceny: number;
  motor_vehicle_theft: number;
  arson: number;
}

export interface EstimatesResponse {
  results: EstimateRow[];
}

export async function fetchEstimates(stateAbbr?: string): Promise<EstimateRow[]> {
  const geo = stateAbbr ? `/state/${stateAbbr}` : "/national";
  const data = await fbiFetch<EstimatesResponse>(`/estimates${geo}`);
  return data.results || [];
}

// Agency list
export interface AgencyInfo {
  ori: string;
  agency_name: string;
  state_abbr: string;
  county_name: string;
  agency_type_name: string;
  nibrs: boolean;
  latitude: number;
  longitude: number;
}

export interface AgenciesResponse {
  results: AgencyInfo[];
}

export async function fetchAgencies(stateAbbr: string): Promise<AgencyInfo[]> {
  const data = await fbiFetch<AgenciesResponse>(`/agencies/byStateAbbr/${stateAbbr}`);
  return data.results || [];
}

// Summary offense data (SRS/UCR)
export interface SummaryCount {
  year: number;
  actual: number;
  cleared: number;
}

export interface SummaryResponse {
  results: SummaryCount[];
}

export async function fetchSummaryCounts(
  stateAbbr: string,
  offense: string
): Promise<SummaryCount[]> {
  const data = await fbiFetch<SummaryResponse>(
    `/summarized/state/${stateAbbr}/${offense}`
  );
  return data.results || [];
}

// NIBRS participation
export interface ParticipationRow {
  year: number;
  state_abbr: string;
  population: number;
  population_covered: number;
  nibrs_population_covered: number;
}

export interface ParticipationResponse {
  results: ParticipationRow[];
}

export async function fetchParticipation(stateAbbr: string): Promise<ParticipationRow[]> {
  const data = await fbiFetch<ParticipationResponse>(
    `/participation/states/${stateAbbr}`
  );
  return data.results || [];
}

// NIBRS demographics (offender breakdown)
export interface DemographicCount {
  key: string;
  value: number;
}

export interface DemographicResponse {
  data: DemographicCount[];
}

export async function fetchOffenderDemographics(
  stateAbbr: string,
  offense: string,
  variable: "age" | "sex" | "race" | "ethnicity"
): Promise<DemographicCount[]> {
  const data = await fbiFetch<DemographicResponse>(
    `/nibrs/${offense}/offender/states/${stateAbbr}/${variable}`
  );
  return data.data || [];
}
