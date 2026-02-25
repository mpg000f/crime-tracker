"use client";

interface Props {
  participation: Array<{
    year: number;
    population: number;
    population_covered: number;
    nibrs_population_covered: number;
  }>;
}

export default function DataCompletenessIndicator({ participation }: Props) {
  if (!participation.length) return null;

  const latest = participation[0];
  const coveragePct = latest.population > 0
    ? (latest.population_covered / latest.population) * 100
    : 0;
  const nibrsPct = latest.population > 0
    ? (latest.nibrs_population_covered / latest.population) * 100
    : 0;

  const isLowCoverage = coveragePct < 70;
  const isLowNibrs = nibrsPct < 40;

  if (!isLowCoverage && !isLowNibrs) return null;

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
      <p className="font-medium text-yellow-400">Data Completeness Warning</p>
      <ul className="mt-1 space-y-1 text-yellow-300/80">
        {isLowCoverage && (
          <li>
            Only {coveragePct.toFixed(0)}% of this state&apos;s population is covered by
            reporting agencies ({latest.year}).
          </li>
        )}
        {isLowNibrs && (
          <li>
            NIBRS demographic data covers only {nibrsPct.toFixed(0)}% of the population.
            Race/sex/age breakdowns may not be representative.
          </li>
        )}
      </ul>
    </div>
  );
}
