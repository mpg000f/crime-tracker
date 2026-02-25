import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Crime Tracker",
  description: "Data sources, definitions, and known limitations of the Crime Tracker.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Methodology</h1>

      <div className="prose prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">Data Source</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            All data comes from the{" "}
            <a
              href="https://crime-data-explorer.fr.cloud.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline"
            >
              FBI Crime Data Explorer API
            </a>
            , which aggregates crime statistics reported by law enforcement agencies
            nationwide through the Uniform Crime Reporting (UCR) Program.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">UCR vs. NIBRS</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            The FBI collects crime data through two systems. The legacy{" "}
            <strong className="text-foreground">Summary Reporting System (SRS)</strong>{" "}
            counts offenses by type (the numbers shown in trends and maps). The newer{" "}
            <strong className="text-foreground">National Incident-Based Reporting System (NIBRS)</strong>{" "}
            captures detailed information about each incident, including offender demographics
            like race, sex, age, and ethnicity. Not all agencies report through NIBRS, which is
            why demographic breakdowns may not be fully representative.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Race vs. Ethnicity</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            In FBI data, <strong className="text-foreground">race</strong> and{" "}
            <strong className="text-foreground">ethnicity</strong> are separate fields.
            Race categories include White, Black or African American, American Indian or Alaska Native,
            Asian, and Native Hawaiian or Other Pacific Islander. Ethnicity is separately recorded
            as Hispanic/Latino or Not Hispanic/Latino. A person of any race can be of Hispanic ethnicity.
            Ethnicity data has lower coverage than race data — many agencies do not report it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Crime Rates</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Crime rates are calculated as{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">(crime count / population) &times; 100,000</code>.
            This normalizes for population differences, making states and agencies comparable.
            Population figures come from FBI estimates, which may differ slightly from Census numbers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Known Limitations</h2>
          <ul className="mt-2 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Incomplete reporting:</strong> Not all agencies report
              every year. Coverage varies by state and can change over time.
            </li>
            <li>
              <strong className="text-foreground">Reporting changes:</strong> The FBI transitioned
              to NIBRS-only in 2021, causing some agencies to temporarily drop out of reporting.
              2021 data in particular has significant gaps.
            </li>
            <li>
              <strong className="text-foreground">Demographic data gaps:</strong> NIBRS demographic
              breakdowns are only available from agencies that report through NIBRS. In states
              with low NIBRS adoption, demographics may reflect a small, non-representative
              subset of agencies.
            </li>
            <li>
              <strong className="text-foreground">Unknown values:</strong> Many demographic records
              include &quot;Unknown&quot; categories where the offender&apos;s information was not
              reported or identified.
            </li>
            <li>
              <strong className="text-foreground">Estimates vs. actuals:</strong> National and state
              estimates are adjusted by the FBI to account for non-reporting agencies. Actual counts
              reflect only what was reported.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            This site is an independent project and is not affiliated with, endorsed by, or connected
            to the FBI, the U.S. Department of Justice, or any government agency. Data is presented
            as-is from public APIs. Always refer to official FBI publications for authoritative statistics.
          </p>
        </section>
      </div>
    </div>
  );
}
