import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatRate(n: number): string {
  return n.toFixed(1);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export const STATE_ABBRS: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export const OFFENSE_TYPES = [
  { value: "violent-crime", label: "Violent Crime" },
  { value: "homicide", label: "Homicide" },
  { value: "rape-legacy", label: "Rape" },
  { value: "robbery", label: "Robbery" },
  { value: "aggravated-assault", label: "Aggravated Assault" },
  { value: "property-crime", label: "Property Crime" },
  { value: "burglary", label: "Burglary" },
  { value: "larceny", label: "Larceny" },
  { value: "motor-vehicle-theft", label: "Motor Vehicle Theft" },
  { value: "arson", label: "Arson" },
] as const;

export type OffenseType = (typeof OFFENSE_TYPES)[number]["value"];
