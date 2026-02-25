import { STATE_ABBRS } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { stateAbbr: string } }) {
  const abbr = params.stateAbbr.toUpperCase();
  const name = STATE_ABBRS[abbr] || abbr;
  return {
    title: `${name} Crime Data — Crime Tracker`,
    description: `Explore violent crime rates, trends, and demographic breakdowns for ${name}. Data from the FBI Crime Data Explorer.`,
  };
}

export default function StateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
