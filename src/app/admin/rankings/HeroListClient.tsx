"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HeroCard from "@/components/heroes/HeroCard";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import Pagination from "@/components/ui/Pagination";
import {
  heroBranchMatchesFilter,
  heroWarsMatchFilter,
  normalizeBranch,
  normalizeWar,
} from "@/lib/hero-taxonomy";

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

const ITEMS_PER_PAGE = 10;

interface HeroData {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  branch: string;
  wars: string[];
  score: number;
  avatarUrl?: string;
  medals: {
    medalType: {
      name: string;
      precedenceOrder: number;
      ribbonColors: string[];
      ribbonImageUrl?: string;
    };
    count: number;
    hasValor: boolean;
    deviceImages?: { url: string; deviceType: string; count: number }[];
  }[];
  wikiRibbonRack?: {
    ribbonUrl: string;
    deviceUrls: string[];
    medalName: string;
    medalType?: string;
    count: number;
    hasValor: boolean;
    arrowheads: number;
    cellType?: "ribbon" | "other";
    imgWidth?: number;
    imgHeight?: number;
    scale?: number;
    row?: number;
  }[];
  ribbonMaxPerRow?: number;
  rackGap?: number;
  combatAchievements?: {
    type: string;
  };
}

type SortOption = "score_desc" | "score_asc" | "name" | "medals_desc";

/* ── Avatar search dropdown ──────────────────────────────── */
function AvatarSearch({
  heroes,
  onQueryChange,
}: {
  heroes: HeroData[];
  onQueryChange: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? heroes.filter((h) => h.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onQueryChange(v);
    setOpen(true);
    setCursor(0);
  };

  const select = (hero: HeroData) => {
    router.push(`/admin/rankings/${hero._id}`);
    setOpen(false);
    setQuery("");
    onQueryChange("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); select(results[cursor]); }
    if (e.key === "Escape")    { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search heroes by name..."
          className="admin-input !pl-10 pr-4 text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); onQueryChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden animate-scale-in">
          {results.map((hero, i) => (
            <button
              key={hero._id}
              onMouseDown={(e) => { e.preventDefault(); select(hero); }}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                cursor === i ? "bg-[var(--color-gold)]/10" : "hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                {hero.avatarUrl ? (
                  <SafeWikimediaImg src={hero.avatarUrl} alt={hero.name} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback name={hero.name} size={36} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{hero.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">{hero.rank} · {hero.branch}</p>
              </div>
              <span className="score-badge text-xs shrink-0">{hero.score} pts</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Filter pill button ──────────────────────────────────── */
function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text)]"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function HeroListClient({ heroes }: { heroes: HeroData[] }) {
  const searchParams = useSearchParams();
  const [search, setSearch]       = useState("");
  const [branch, setBranch]       = useState("All");
  const [war, setWar]             = useState("All");
  const [specialty, setSpecialty] = useState("All");
  const [sort, setSort]           = useState<SortOption>("score_desc");
  const [page, setPage]           = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const savePage = useCallback(() => sessionStorage.setItem("herolist-page", String(pageRef.current)), []);

  // Derive unique filter values (canonical labels so synonyms merge)
  const branches = [
    "All",
    ...Array.from(new Set(heroes.map((h) => normalizeBranch(h.branch)).filter(Boolean))).sort(),
  ];
  const wars = [
    "All",
    ...Array.from(
      new Set(heroes.flatMap((h) => (h.wars ?? []).map((w) => normalizeWar(w))).filter(Boolean))
    ).sort(),
  ];
  const ALL_SPECIALTIES = Object.keys(SPECIALTY_LABELS);
  const heroSpecialties = ALL_SPECIALTIES.filter((s) => heroes.some((h) => h.combatAchievements?.type === s));
  const specialties: string[] = ["All", ...heroSpecialties];

  // Seed filters from URL params on mount, or restore page from sessionStorage
  useEffect(() => {
    const pBranch = searchParams.get("branch");
    const pSpecialty = searchParams.get("specialty");
    const pSort = searchParams.get("sort");
    const pWar = searchParams.get("war");
    const hasUrlParams = pBranch || pSpecialty || pSort || pWar;

    if (pBranch) {
      const canonB = normalizeBranch(pBranch);
      if (branches.includes(canonB)) setBranch(canonB);
    }
    if (pSpecialty && (pSpecialty === "All" || SPECIALTY_LABELS[pSpecialty])) setSpecialty(pSpecialty);
    if (pSort && ["score_desc", "score_asc", "name", "medals_desc"].includes(pSort)) setSort(pSort as SortOption);
    if (pWar) {
      const canonW = normalizeWar(pWar);
      if (wars.includes(canonW)) setWar(canonW);
    }

    // Only restore page from sessionStorage if no URL params drove us here
    if (!hasUrlParams) {
      const saved = parseInt(sessionStorage.getItem("herolist-page") || "1", 10);
      if (saved > 1) setPage(saved);
    }
    sessionStorage.removeItem("herolist-page");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters
  const totalMedalCount = (h: HeroData) => (h.medals ?? []).reduce((s, m) => s + (m.count ?? 1), 0);

  const filtered = heroes
    .filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()))
    .filter((h) => heroBranchMatchesFilter(h.branch, branch))
    .filter((h) => heroWarsMatchFilter(h.wars, war))
    .filter((h) => specialty === "All" || h.combatAchievements?.type === specialty)
    .sort((a, b) => {
      if (sort === "score_desc") return b.score - a.score;
      if (sort === "score_asc")  return a.score - b.score;
      if (sort === "medals_desc") return totalMedalCount(b) - totalMedalCount(a);
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const startRank = (page - 1) * ITEMS_PER_PAGE;

  // Reset page when filters change
  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  // Sidebar stats
  const branchCounts = branches
    .filter((b) => b !== "All")
    .map((b) => ({ branch: b, count: heroes.filter((h) => heroBranchMatchesFilter(h.branch, b)).length }))
    .sort((a, b) => b.count - a.count);

  const warCounts = wars
    .filter((w) => w !== "All")
    .map((w) => ({ war: w, count: heroes.filter((h) => heroWarsMatchFilter(h.wars, w)).length }))
    .sort((a, b) => b.count - a.count);

  const highestScore = heroes.reduce((max, h) => Math.max(max, h.score), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left: list + filters ────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Filter bar */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-4 mb-5 space-y-3">
          {/* Row 1: search + sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <AvatarSearch heroes={heroes} onQueryChange={(q) => handleFilterChange(() => setSearch(q))} />
            <select
              value={sort}
              onChange={(e) => handleFilterChange(() => setSort(e.target.value as typeof sort))}
              className="admin-input w-full sm:flex-1 text-sm"
            >
              <option value="score_desc">Score: High to Low</option>
              <option value="score_asc">Score: Low to High</option>
              <option value="medals_desc">Most Medals</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Row 2: branch filter */}
          {branches.length > 2 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-[var(--color-text-muted)] mr-1 font-medium">Branch:</span>
              {branches.map((b) => (
                <Pill
                  key={b}
                  label={b === "All" ? "All Branches" : b.replace("U.S. ", "")}
                  active={branch === b}
                  onClick={() => handleFilterChange(() => setBranch(b))}
                />
              ))}
            </div>
          )}

          {/* Row 3: war filter */}
          {wars.length > 2 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-[var(--color-text-muted)] mr-1 font-medium">Era:</span>
              {wars.map((w) => (
                <Pill
                  key={w}
                  label={w === "All" ? "All Eras" : w}
                  active={war === w}
                  onClick={() => handleFilterChange(() => setWar(w))}
                />
              ))}
            </div>
          )}

          {/* Row 4: specialty filter */}
          {specialties.length > 1 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-[var(--color-text-muted)] mr-1 font-medium">Specialty:</span>
              {specialties.map((s) => (
                <Pill
                  key={s}
                  label={s === "All" ? "All Specialties" : SPECIALTY_LABELS[s] || s}
                  active={specialty === s}
                  onClick={() => handleFilterChange(() => setSpecialty(s))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            {filtered.length === heroes.length
              ? `${heroes.length} heroes`
              : `${filtered.length} of ${heroes.length} heroes`}
          </p>
          {(search || branch !== "All" || war !== "All" || specialty !== "All") && (
            <button
              onClick={() => handleFilterChange(() => { setSearch(""); setBranch("All"); setWar("All"); setSpecialty("All"); })}
              className="text-xs text-[var(--color-gold)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Hero list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-[var(--color-text-muted)] py-12">
              No heroes match the selected filters.
            </p>
          ) : (
            <>
              {paginated.map((hero, idx) => (
                <div key={hero._id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx, 10) * 0.04}s` }}>
                  <HeroCard
                    rank={startRank + idx + 1}
                    hero={hero}
                    href={`/admin/rankings/${hero._id}`}
                    onClick={savePage}
                  />
                </div>
              ))}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={filtered.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-full lg:w-64 shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-20 space-y-4">

          {/* Stats */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-3">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">Total Heroes</span>
                <span className="text-sm font-bold">{heroes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">Highest Score</span>
                <span className="score-badge text-xs">{highestScore} pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">Branches</span>
                <span className="text-sm font-bold">{branches.length - 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">Conflicts</span>
                <span className="text-sm font-bold">{wars.length - 1}</span>
              </div>
            </div>
          </div>

          {/* Branch breakdown */}
          {branchCounts.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hidden lg:block">
              <h3 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-3">
                By Branch
              </h3>
              <div className="space-y-2">
                {branchCounts.map(({ branch: b, count }) => {
                  const pct = Math.round((count / heroes.length) * 100);
                  return (
                    <button
                      key={b}
                      onClick={() => handleFilterChange(() => setBranch(branch === b ? "All" : b))}
                      className={`w-full text-left group ${branch === b ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs truncate ${branch === b ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {b.replace("U.S. ", "")}
                        </span>
                        <span className="text-xs font-bold ml-2 shrink-0">{count}</span>
                      </div>
                      <div className="h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: "var(--color-gold)" }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* War/Era breakdown */}
          {warCounts.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hidden lg:block">
              <h3 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-3">
                By Conflict
              </h3>
              <div className="space-y-1.5">
                {warCounts.slice(0, 6).map(({ war: w, count }) => (
                  <button
                    key={w}
                    onClick={() => handleFilterChange(() => setWar(war === w ? "All" : w))}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      war === w
                        ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold"
                        : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    <span className="truncate">{w}</span>
                    <span className="font-bold ml-2 shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specialty breakdown — only show specialties that have heroes */}
          {(() => {
            const populated = ALL_SPECIALTIES.filter((s) => heroes.some((h) => h.combatAchievements?.type === s));
            return populated.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hidden lg:block">
                <h3 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-3">
                  By Specialty
                </h3>
                <div className="space-y-1.5">
                  {populated.map((s) => {
                    const count = heroes.filter((h) => h.combatAchievements?.type === s).length;
                    return (
                      <button
                        key={s}
                        onClick={() => handleFilterChange(() => setSpecialty(specialty === s ? "All" : s))}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          specialty === s
                            ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold"
                            : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        <span className="truncate">{SPECIALTY_LABELS[s] || s}</span>
                        <span className="font-bold ml-2 shrink-0">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Legend */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-2">
              Scoring
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Rankings use the USM-25 Unified Scoring Matrix — a standardized framework weighing medals, valor devices, theaters, combat command, and more.
            </p>
            <a href="/admin/scoring" className="text-xs text-[var(--color-gold)] hover:underline mt-2 block">
              View full methodology
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
