import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Honoring America's Decorated Heroes",
  description:
    "A comprehensive archive of decorated U.S. military heroes, objectively ranked by the Unified Scoring Matrix (USM-25). Explore rankings, medals, and stories of valor.",
  openGraph: {
    title: "Medals N Bongs — Honoring America's Decorated Heroes",
    description:
      "A comprehensive archive of decorated U.S. military heroes ranked by the USM-25 scoring system.",
  },
  keywords: ["military heroes", "Medal of Honor", "decorated veterans", "USM-25", "war heroes", "military rankings"],
};

const FEATURES = [
  {
    icon: "★",
    title: "Comprehensive Archive",
    desc: "Every decorated hero in one place — from the Revolutionary War to modern conflicts. Fully sourced from military records and official citations.",
  },
  {
    icon: "🎖",
    title: "Objective Rankings",
    desc: "Ranked by the USM-25 scoring matrix — a transparent, standardized methodology that evaluates awards, valor, and combat service.",
  },
  {
    icon: "📜",
    title: "Medal Catalog",
    desc: "Complete catalog of U.S. military decorations with point values, ribbon colors, and precedence order used in scoring.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Research",
    desc: "Heroes are sourced from military records, Congressional citations, and verified historical archives.",
  },
  {
    num: "02",
    title: "Score",
    desc: "The USM-25 matrix evaluates each hero's medals, valor devices, combat service, and leadership record.",
  },
  {
    num: "03",
    title: "Rank",
    desc: "Heroes are ranked by total score — creating an objective, defensible leaderboard of decorated service.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="max-w-3xl mx-auto animate-fade-in-up">
          <div
            className="text-5xl mb-6"
            style={{ filter: "drop-shadow(0 0 20px rgba(212,168,67,0.4))", color:"gold"}}
          >
            ★★★★★
          </div>
          <h1
            className="font-extrabold leading-tight mb-4"
            style={{
              color: "#ffffff",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
            }}
          >
            Honoring America&apos;s Most Decorated Heroes
          </h1>
          <p
            className="leading-relaxed mb-8 mx-auto"
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              maxWidth: 560,
            }}
          >
            A comprehensive archive of U.S. military heroes, objectively ranked
            using the Unified Scoring Matrix. From the Medal of Honor to the
            Purple Heart — every decoration counted.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/explore"
              className="px-6 py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                color: "#1a1a2e",
              }}
            >
              Explore by country
            </Link>
            <Link
              href="/rankings"
              className="px-6 py-3 rounded-lg text-sm font-bold transition-all border hover:scale-105"
              style={{
                borderColor: "rgba(255,255,255,0.35)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              Full rankings
            </Link>
            <Link
              href="/medals"
              className="px-6 py-3 rounded-lg text-sm font-semibold border transition-colors hover:bg-white/10"
              style={{
                borderColor: "rgba(255,255,255,0.3)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              View Medals
            </Link>
          </div>
        </div>
      </section>

      {/* ── What Is This? ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">
            What Is Medals <span style={{ color: "#3b82f6" }}>N</span> Bongs?
          </h2>
          <p
            className="text-sm max-w-xl mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            A data-driven tribute to the men and women who earned our nation&apos;s
            highest military decorations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="hero-card p-6 text-center animate-fade-in-up"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="landing-section-alt py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">How It Works</h2>
            <p
              className="text-sm max-w-lg mx-auto"
              style={{ color: "var(--color-text-muted)" }}
            >
              Three steps from historical record to ranked leaderboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full text-lg font-extrabold mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                    color: "#1a1a2e",
                  }}
                >
                  {step.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p
                  className="text-sm leading-relaxed max-w-xs mx-auto"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
