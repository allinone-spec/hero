"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { HERO_METADATA_TAGS } from "@/lib/metadata-tags";

type StackItem = { key: string; label: string };

const COUNTRIES = [
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "UK", flag: "🇬🇧", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "IN", flag: "🇮🇳", name: "India" },
] as const;

const US_BRANCHES = [
  { branch: "", label: "All services" },
  { branch: "U.S. Army", label: "U.S. Army" },
  { branch: "U.S. Navy", label: "U.S. Navy" },
  { branch: "U.S. Marine Corps", label: "U.S. Marine Corps" },
  { branch: "U.S. Air Force", label: "U.S. Air Force" },
  { branch: "U.S. Coast Guard", label: "U.S. Coast Guard" },
  { branch: "U.S. Space Force", label: "U.S. Space Force" },
] as const;

type Phase = "country" | "branch" | "specialty" | "done";

/** Shared hover / click motion for drill-down options */
const choiceMotion =
  "transition-all duration-200 ease-out motion-safe:hover:border-[var(--color-gold)] motion-safe:hover:bg-[var(--color-gold)]/8 motion-safe:hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]";

export default function ExploreNavigator() {
  const router = useRouter();
  const [stack, setStack] = useState<StackItem[]>([]);
  const [phase, setPhase] = useState<Phase>("country");
  const [country, setCountry] = useState<string | null>(null);
  /** US branch filter; empty string = all services */
  const [branch, setBranch] = useState<string>("");
  /** null = any specialty; else tag id */
  const [tag, setTag] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (phase === "done") {
      setPhase("specialty");
      setTag(null);
      setStack((s) => s.slice(0, -1));
      return;
    }
    if (phase === "specialty") {
      if (country === "US") {
        setPhase("branch");
        setStack((s) => s.slice(0, 1));
      } else {
        setPhase("country");
        setCountry(null);
        setStack([]);
      }
      return;
    }
    if (phase === "branch") {
      setPhase("country");
      setCountry(null);
      setBranch("");
      setStack([]);
      return;
    }
    setPhase("country");
    setCountry(null);
    setBranch("");
    setTag(null);
    setStack([]);
  }, [phase, country]);

  const pickCountry = (code: string, name: string) => {
    setCountry(code);
    setBranch("");
    setTag(null);
    setStack([{ key: code, label: name }]);
    if (code === "US") setPhase("branch");
    else setPhase("specialty");
  };

  const pickBranch = (b: string, label: string) => {
    setBranch(b);
    setTag(null);
    setStack((s) => [...s.slice(0, 1), { key: b || "all", label: label || "All services" }]);
    setPhase("specialty");
  };

  const pickSpecialty = (t: string | null, label: string) => {
    setTag(t);
    setStack((s) => [...s.slice(0, country === "US" ? 2 : 1), { key: t ?? "any", label }]);
    setPhase("done");
  };

  const viewResults = () => {
    if (!country) return;
    const q = new URLSearchParams();
    q.set("country", country);
    if (branch) q.set("branch", branch);
    if (tag) q.set("tag", tag);
    router.push(`/explore/heroes?${q.toString()}`);
  };

  return (
    <div
      className="max-w-xl mx-auto rounded-xl border p-6 space-y-6"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Browse heroes</h2>
        {phase !== "country" && (
          <button
            type="button"
            onClick={goBack}
            className="text-sm rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-gold)] transition-all duration-200 hover:border-[var(--color-gold)]/50 hover:bg-[var(--color-gold)]/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40"
          >
            ← Back
          </button>
        )}
      </div>

      {stack.length > 0 && (
        <ol className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
          {stack.map((s, i) => (
            <li key={`${s.key}-${i}`}>
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      )}

      {phase === "country" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => pickCountry(c.code, c.name)}
              className={`h-full min-h-[5.25rem] flex items-stretch gap-3 rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-left ${choiceMotion}`}
              style={{ borderColor: "var(--color-border)" }}
            >
              <span
                className="flex w-11 shrink-0 items-center justify-center text-3xl leading-none select-none"
                aria-hidden
              >
                {c.flag}
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 border-l border-[var(--color-border)]/60 pl-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {c.code}
                </span>
                <span className="text-sm font-semibold leading-snug text-[var(--color-text)]">{c.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {phase === "branch" && (
        <div className="grid grid-cols-1 gap-2">
          {US_BRANCHES.map((b) => (
            <button
              key={b.branch || "all"}
              type="button"
              onClick={() => pickBranch(b.branch, b.label)}
              className={`flex min-h-[3rem] w-full items-center rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] ${choiceMotion}`}
              style={{ borderColor: "var(--color-border)" }}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {phase === "specialty" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => pickSpecialty(null, "Any specialty")}
            className={`flex min-h-[3rem] w-full items-center rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] ${choiceMotion}`}
            style={{ borderColor: "var(--color-border)" }}
          >
            Any specialty (all tags)
          </button>
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {HERO_METADATA_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickSpecialty(t.id, t.label)}
                className={`flex min-h-[3.5rem] w-full flex-col justify-center rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-left text-sm ${choiceMotion}`}
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="font-semibold text-[var(--color-text)]">{t.label}</span>
                <span className="mt-1 text-xs leading-snug text-[var(--color-text-muted)]">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Open the top 20 heroes for this drill-down (sorted by score).
          </p>
          <button
            type="button"
            onClick={viewResults}
            className="w-full rounded-lg py-3 text-sm font-bold transition-all duration-200 motion-safe:hover:brightness-105 motion-safe:hover:shadow-lg motion-safe:hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            style={{
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
              color: "#1a1a2e",
            }}
          >
            Show top 20
          </button>
        </div>
      )}
    </div>
  );
}
