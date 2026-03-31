import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { normalizeBranch } from "@/lib/hero-taxonomy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Categories",
  description:
    "Browse decorated U.S. military heroes by service branch, combat specialty, and special rankings.",
  openGraph: {
    title: "Browse Categories — Medals N Bongs",
    description:
      "Explore heroes by branch, combat specialty, and more.",
  },
};

const BRANCH_CARDS = [
  { label: "Army", branch: "U.S. Army", icon: "⚔" },
  { label: "Navy", branch: "U.S. Navy", icon: "⚓" },
  { label: "Marines", branch: "U.S. Marine Corps", icon: "🦅" },
  { label: "Air Force", branch: "U.S. Air Force", icon: "✈" },
  { label: "Coast Guard", branch: "U.S. Coast Guard", icon: "🛟" },
];

const SPECIALTY_LABELS: Record<string, string> = {
  infantry: "Infantry",
  armor: "Armor / Cavalry",
  artillery: "Artillery",
  aviation: "Pilots",
  airborne: "Airborne",
  special_operations: "Special Ops",
  submarine: "Submariners",
  surface: "Surface Naval",
  amphibious: "Amphibious",
  reconnaissance: "Recon / Scout",
  air_defense: "Air Defense",
  engineering: "Combat Engineering",
  signal: "Signal / Comms",
  intelligence: "Intelligence",
  medical: "Combat Medical",
  logistics: "Logistics",
  chemical: "CBRN",
  electronic_warfare: "Electronic Warfare",
  cyber: "Cyber Warfare",
  military_police: "Military Police",
  ordnance: "Ordnance / EOD",
  sniper: "Sniper",
  marine: "Marine",
};

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div>
        <h2 className="text-xl font-bold leading-none">{title}</h2>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
    </div>
  );
}

export default async function CategoriesPage() {
  await dbConnect();

  /* Fetch minimal data to build counts */
  const heroes = await Hero.find({ published: true })
    .select("branch combatAchievements.type medals")
    .lean();

  const plain: { branch: string; specialty: string; medalCount: number }[] = (
    heroes as any[]
  ).map((h) => ({
    branch: h.branch ?? "",
    specialty: h.combatAchievements?.type ?? "none",
    medalCount: (h.medals ?? []).reduce(
      (s: number, m: any) => s + (m.count ?? 1),
      0
    ),
  }));

  /* Branch counts (canonical so US Army / U.S. Army merge for card totals) */
  const branchCounts: Record<string, number> = {};
  for (const h of plain) {
    if (h.branch) {
      const b = normalizeBranch(h.branch);
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    }
  }

  /* Specialty counts (only those present in DB, skip "none") */
  const specCounts: Record<string, number> = {};
  for (const h of plain) {
    if (h.specialty && h.specialty !== "none") {
      specCounts[h.specialty] = (specCounts[h.specialty] || 0) + 1;
    }
  }
  const activeSpecialties = Object.keys(specCounts).sort(
    (a, b) => specCounts[b] - specCounts[a]
  );

  const totalHeroes = plain.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">Browse Categories</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Explore {totalHeroes} decorated heroes by service branch, combat specialty, and special rankings.
        </p>
      </div>

      {/* ── By Service Branch ─────────────────────────────── */}
      <section>
        <SectionTitle title="By Service Branch" sub="Filter heroes by military branch" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {BRANCH_CARDS.map((card) => {
            const count = branchCounts[card.branch] || 0;
            return (
              <Link
                key={card.branch}
                href={`/rankings?branch=${encodeURIComponent(card.branch)}`}
                className="hero-card p-4 sm:p-5 text-center group hover:border-[var(--color-gold)] transition-all"
              >
                <div className="text-2xl sm:text-3xl mb-2">{card.icon}</div>
                <div className="font-semibold text-sm sm:text-base group-hover:text-[var(--color-gold)] transition-colors">
                  {card.label}
                </div>
                {count > 0 && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {count} {count === 1 ? "hero" : "heroes"}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── By Combat Specialty ───────────────────────────── */}
      {activeSpecialties.length > 0 && (
        <section>
          <SectionTitle
            title="By Combat Specialty"
            sub="Filter heroes by their primary combat role"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {activeSpecialties.map((key) => (
              <Link
                key={key}
                href={`/rankings?specialty=${key}`}
                className="hero-card px-4 py-3 sm:py-4 group hover:border-[var(--color-gold)] transition-all flex items-center justify-between gap-2"
              >
                <span className="font-medium text-sm group-hover:text-[var(--color-gold)] transition-colors truncate">
                  {SPECIALTY_LABELS[key] || key}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0"
                  style={{
                    backgroundColor: "var(--color-gold)",
                    color: "var(--color-badge-text)",
                  }}
                >
                  {specCounts[key]}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Special Lists ─────────────────────────────────── */}
      <section>
        <SectionTitle title="Special Rankings" sub="Sort and discover heroes by different criteria" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link
            href="/rankings?sort=medals_desc"
            className="hero-card p-5 group hover:border-[var(--color-gold)] transition-all"
          >
            <div className="text-2xl mb-2">🎖</div>
            <div className="font-semibold group-hover:text-[var(--color-gold)] transition-colors">
              Most Medals
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Heroes ranked by total medal count
            </p>
          </Link>
          <Link
            href="/rankings?sort=score_desc"
            className="hero-card p-5 group hover:border-[var(--color-gold)] transition-all"
          >
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-semibold group-hover:text-[var(--color-gold)] transition-colors">
              Highest Scored
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Heroes ranked by USM-25 score
            </p>
          </Link>
        </div>
      </section>

      {/* ── Quick Lookups ─────────────────────────────────── */}
      {activeSpecialties.length > 0 && (
        <section>
          <SectionTitle title="Quick Lookups" sub="Popular compound filters" />
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {BRANCH_CARDS.filter((c) => branchCounts[c.branch]).map((card) => (
              <Link
                key={`top-${card.branch}`}
                href={`/rankings?branch=${encodeURIComponent(card.branch)}&sort=medals_desc`}
                className="hero-card px-3 py-2 text-xs sm:text-sm font-medium hover:border-[var(--color-gold)] transition-all hover:text-[var(--color-gold)]"
              >
                Most Decorated {card.label}
              </Link>
            ))}
            {activeSpecialties.slice(0, 4).map((key) => (
              <Link
                key={`spec-medals-${key}`}
                href={`/rankings?specialty=${key}&sort=medals_desc`}
                className="hero-card px-3 py-2 text-xs sm:text-sm font-medium hover:border-[var(--color-gold)] transition-all hover:text-[var(--color-gold)]"
              >
                Most Decorated {SPECIALTY_LABELS[key] || key}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}