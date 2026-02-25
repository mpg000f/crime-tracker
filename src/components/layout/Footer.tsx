export default function Footer() {
  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4">
        <p>
          Data sourced from the{" "}
          <a
            href="https://crime-data-explorer.fr.cloud.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            FBI Crime Data Explorer
          </a>
          . Not affiliated with the FBI or U.S. government.
        </p>
      </div>
    </footer>
  );
}
