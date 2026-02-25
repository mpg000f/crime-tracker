import { STATE_ABBRS } from "@/lib/utils";

export function generateStaticParams() {
  return Object.keys(STATE_ABBRS).map((abbr) => ({
    stateAbbr: abbr,
  }));
}

export default function StateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
