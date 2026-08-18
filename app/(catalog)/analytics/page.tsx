import { summarize } from "@/lib/telemetry-report";

// Reads the event store on every request — a cached page would show a stale
// funnel seconds after a hook fires, which is the opposite of useful during a test.
export const dynamic = "force-dynamic";

const TOKENS = {
  usage: "--color-positive",
  skills: "--color-accent",
  devices: "--color-info",
  dormant: "--color-negative",
} as const;

function Kpi({
  label,
  value,
  sub,
  token,
  icon,
  delay,
}: {
  label: string;
  value: number | string;
  sub?: string;
  token: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const c = `var(${token})`;
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-card-border bg-card/40 p-4 backdrop-blur-xl"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`,
          color: c,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-in-up rounded-2xl border border-card-border bg-card/40 backdrop-blur-xl" style={{ animationFillMode: "both" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-card-border px-5 py-3.5">
        <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h2>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ row }: { row: { usage: number; dormant: boolean; untouched: boolean } }) {
  const [label, token] = row.usage > 0
    ? (["Used", "--color-positive"] as const)
    : row.dormant
      ? (["Dormant", "--color-negative"] as const)
      : (["Untouched", "--color-text-muted"] as const);
  const c = `var(${token})`;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`,
        color: c,
      }}
    >
      {label}
    </span>
  );
}

const SURFACE_LABELS: Record<string, string> = { cli: "CLI", desktop: "Desktop", unknown: "Unknown" };

function surfaceLabel(surface: string): string {
  return SURFACE_LABELS[surface] ?? surface;
}

function when(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default async function AnalyticsPage() {
  const { totals, rows, recent, bySurface } = await summarize();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          Usage Analytics
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Portal actions and runtime usage, joined into the download&rarr;usage funnel. Reads the local
          event store; swaps to Supabase in Phase 2.
        </p>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Usage events"
          value={totals.usage}
          sub={`${totals.events} events total`}
          token={TOKENS.usage}
          delay={0}
          icon={<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></>}
        />
        <Kpi
          label="Skills used"
          value={`${totals.skillsUsed}/${totals.skillsIndexed}`}
          sub="have ever been run"
          token={TOKENS.skills}
          delay={60}
          icon={<><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>}
        />
        <Kpi
          label="Unique devices"
          value={totals.uniqueDevices}
          sub="anonymous ids"
          token={TOKENS.devices}
          delay={120}
          icon={<><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></>}
        />
        <Kpi
          label="Dormant"
          value={totals.dormant}
          sub="taken, never run"
          token={TOKENS.dormant}
          delay={180}
          icon={<><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>}
        />
      </div>

      {totals.events === 0 && (
        <div className="mb-7 rounded-2xl border border-accent/25 bg-accent/[0.07] p-5 backdrop-blur-xl">
          <p className="text-sm font-semibold text-accent" style={{ fontFamily: "var(--font-heading)" }}>
            No events yet
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            Nothing has reached the store. Either browse a skill and hit Download to produce a portal
            event, or run the Phase&nbsp;0 hook test:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-card-border bg-surface p-3 text-xs text-text-secondary">
            <code>{`claude --plugin-dir .\n# then, inside the session:\n/mobskills:verify-plan`}</code>
          </pre>
          <p className="mt-2 text-xs text-text-muted">
            Full steps in <code className="rounded bg-surface px-1">plans/telemetry-spike-runbook.md</code>.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Per-skill funnel" hint="views · copies · downloads · runs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-[11px] uppercase tracking-wider text-text-muted">
                    <th className="px-5 py-2.5 font-medium">Skill</th>
                    <th className="px-3 py-2.5 text-right font-medium">Views</th>
                    <th className="px-3 py-2.5 text-right font-medium">Copies</th>
                    <th className="px-3 py-2.5 text-right font-medium">Downloads</th>
                    <th className="px-3 py-2.5 text-right font-medium">Runs</th>
                    <th className="px-3 py-2.5 text-right font-medium">Devices</th>
                    <th className="px-3 py-2.5 text-right font-medium">Last run</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.slug} className="border-b border-card-border/60 last:border-0 transition hover:bg-card-hover/40">
                      <td className="px-5 py-3">
                        <span className="font-medium text-text-primary">{r.slug}</span>
                        {r.version && <span className="ml-2 text-xs text-text-muted">v{r.version}</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-text-secondary">{r.views}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-text-secondary">{r.copies}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-text-secondary">{r.downloads}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-text-primary">{r.usage}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-text-secondary">{r.uniqueDevices}</td>
                      <td className="px-3 py-3 text-right text-xs text-text-muted">{when(r.lastUsedAt)}</td>
                      <td className="px-5 py-3"><StatusBadge row={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Runtime surface" hint="the Phase 0 gate">
            <div className="px-5 py-4">
              {bySurface.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No runtime events yet. This panel is the answer to &ldquo;do hooks fire in Desktop?&rdquo;
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {bySurface.map((s) => (
                    <li key={s.surface} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-secondary">{surfaceLabel(s.surface)}</span>
                      <span className="tabular-nums text-sm font-semibold text-text-primary">{s.usage}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-card-border pt-3 text-xs leading-relaxed text-text-muted">
                Detected from the client&apos;s entrypoint. &ldquo;unknown&rdquo; means we do not
                recognise it yet. The raw value rides along on each event as
                <code className="mx-1 rounded bg-surface px-1">session_kind</code>, which is how
                Desktop&apos;s value will reveal itself on its first run.
              </p>
            </div>
          </Panel>

          <Panel title="Recent events" hint={`last ${recent.length}`}>
            {recent.length === 0 ? (
              <p className="px-5 py-4 text-sm text-text-muted">Nothing yet.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-2 border-b border-card-border/60 px-5 py-2.5 text-xs last:border-0">
                    <span className="font-mono font-medium text-text-primary">{e.type}</span>
                    <span className="truncate text-text-secondary">{e.slug}</span>
                    <span className="ml-auto shrink-0 text-text-muted">{when(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-text-muted">
        Events are metadata only (plan §7): skill slug, version, event type, surface, outcome, and an
        anonymous device id. No prompt text, file contents, tool arguments, or paths are collected.
      </p>
    </div>
  );
}
