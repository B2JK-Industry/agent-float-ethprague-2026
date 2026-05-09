export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <header className="flex flex-col items-center gap-3">
        <h1 className="text-5xl font-bold tracking-tight">Upgrade Siren</h1>
        <p className="text-lg text-[color:var(--color-text-muted)]">
          No source, no upgrade.
        </p>
      </header>

      <p className="max-w-xl text-sm text-[color:var(--color-text-muted)]">
        Scaffold (US-037). The ENS lookup form (US-038), public-read input
        (US-039), and verdict UI (US-042) ship in subsequent items.
      </p>

      <section
        aria-label="Verdict palette preview"
        className="flex flex-wrap items-center justify-center gap-3 pt-2"
      >
        <span className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-safe)] px-3 py-1 text-sm text-[color:var(--color-safe)]">
          <span aria-hidden>✓</span>
          SAFE
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-review)] px-3 py-1 text-sm text-[color:var(--color-review)]">
          <span aria-hidden>!</span>
          REVIEW
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-siren)] px-3 py-1 text-sm text-[color:var(--color-siren)]">
          <span aria-hidden>×</span>
          SIREN
        </span>
      </section>
    </main>
  );
}
