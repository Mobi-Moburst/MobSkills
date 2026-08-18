import "server-only";
import { getAllSkills } from "@/lib/skills";
import { readEvents, type TelemetryEvent } from "@/lib/telemetry-store";

// Aggregation shared by the /analytics dashboard and GET /api/telemetry.
// The join against getAllSkills() is the point: a skill nobody has touched has
// no events, so iterating events alone would hide exactly the skills we most
// want to see. Every indexed skill gets a row, used or not.

export type SkillRow = {
  slug: string;
  name: string;
  version: string | null;
  views: number;
  copies: number;
  downloads: number;
  /** Runtime "skill was used" events — the signal the plugin hook produces. */
  usage: number;
  errors: number;
  uniqueDevices: number;
  lastUsedAt: string | null;
  /** Downloaded/copied at least once but never actually run (plan §6). */
  dormant: boolean;
  /** No events at all — not even a portal view. */
  untouched: boolean;
};

export type TelemetrySummary = {
  totals: {
    events: number;
    usage: number;
    downloads: number;
    uniqueDevices: number;
    skillsIndexed: number;
    skillsUsed: number;
    dormant: number;
  };
  rows: SkillRow[];
  recent: TelemetryEvent[];
  /** Runtime events grouped by surface, so we can see whether Desktop reports. */
  bySurface: { surface: string; usage: number }[];
};

export async function summarize(): Promise<TelemetrySummary> {
  const events = await readEvents();
  const skills = getAllSkills();

  type Acc = {
    views: number;
    copies: number;
    downloads: number;
    usage: number;
    errors: number;
    devices: Set<string>;
    lastUsedAt: string | null;
    any: boolean;
  };
  const blank = (): Acc => ({
    views: 0,
    copies: 0,
    downloads: 0,
    usage: 0,
    errors: 0,
    devices: new Set(),
    lastUsedAt: null,
    any: false,
  });

  const acc = new Map<string, Acc>();
  const surfaces = new Map<string, number>();
  const allDevices = new Set<string>();

  for (const e of events) {
    const row = acc.get(e.slug) ?? blank();
    row.any = true;
    if (e.type === "view") row.views += 1;
    if (e.type === "copy") row.copies += 1;
    if (e.type === "download") row.downloads += 1;
    if (e.type === "usage") {
      row.usage += 1;
      if (!row.lastUsedAt || e.created_at > row.lastUsedAt) row.lastUsedAt = e.created_at;
      const key = e.surface ?? "unknown";
      surfaces.set(key, (surfaces.get(key) ?? 0) + 1);
    }
    if (e.outcome === "error") row.errors += 1;
    if (e.device_id) {
      row.devices.add(e.device_id);
      allDevices.add(e.device_id);
    }
    acc.set(e.slug, row);
  }

  // Start from the indexed skills, then append any event slug we don't recognise
  // (a stale install, or a typo in a hook's --slug) so nothing is silently lost.
  const known = new Set(skills.map((s) => s.slug));
  const orphans = [...acc.keys()].filter((slug) => !known.has(slug));

  const rows: SkillRow[] = [
    ...skills.map((s) => ({ slug: s.slug, name: s.name, version: s.version })),
    ...orphans.map((slug) => ({ slug, name: `${slug} (not indexed)`, version: null })),
  ].map(({ slug, name, version }) => {
    const a = acc.get(slug) ?? blank();
    const reached = a.downloads + a.copies > 0;
    return {
      slug,
      name,
      version,
      views: a.views,
      copies: a.copies,
      downloads: a.downloads,
      usage: a.usage,
      errors: a.errors,
      uniqueDevices: a.devices.size,
      lastUsedAt: a.lastUsedAt,
      dormant: reached && a.usage === 0,
      untouched: !a.any,
    };
  });

  rows.sort((x, y) => y.usage - x.usage || y.downloads - x.downloads || x.slug.localeCompare(y.slug));

  return {
    totals: {
      events: events.length,
      usage: rows.reduce((n, r) => n + r.usage, 0),
      downloads: rows.reduce((n, r) => n + r.downloads, 0),
      uniqueDevices: allDevices.size,
      skillsIndexed: skills.length,
      skillsUsed: rows.filter((r) => r.usage > 0).length,
      dormant: rows.filter((r) => r.dormant).length,
    },
    rows,
    recent: events.slice(-25).reverse(),
    bySurface: [...surfaces.entries()]
      .map(([surface, usage]) => ({ surface, usage }))
      .sort((a, b) => b.usage - a.usage),
  };
}
