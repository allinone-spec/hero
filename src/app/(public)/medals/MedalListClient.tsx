"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { medalTextColor } from "@/components/ui/AvatarFallback";
import Pagination from "@/components/ui/Pagination";
import { countryOptionLabel } from "@/lib/country-display";
import { medalShortLabelForDisplay } from "@/lib/medal-short-name";

interface MedalType {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  precedenceOrder: number;
  ribbonColors: string[];
  description: string;
  imageUrl?: string;
  ribbonImageUrl?: string;
  branch?: string;
  countryCode?: string;
  requiresValorDevice?: boolean;
  inherentlyValor?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  valor:   { bg: "#d4a84322", text: "#d4a843", border: "#d4a84360" },
  service: { bg: "#3b82f622", text: "#3b82f6", border: "#3b82f660" },
  foreign: { bg: "#10b98122", text: "#10b981", border: "#10b98160" },
  other:   { bg: "#9ca3af22", text: "#9ca3af", border: "#9ca3af60" },
};

const CATEGORIES = ["All", "valor", "service", "foreign", "other"];
const ITEMS_PER_PAGE = 8;
const COUNTRY_SORT_ORDER = ["US", "UK", "GB", "CA", "AU", "NZ", "ZA", "IN"];

type SortOption = "precedence" | "points_desc" | "points_asc" | "name";

/* ── Main component ─────────────────────────────────────── */
export default function MedalListClient({
  medals,
  variant = "default",
}: {
  medals: MedalType[];
  /** `embedded`: used inside rankings hub (no extra page chrome). */
  variant?: "default" | "embedded";
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [branch, setBranch] = useState("All");
  const [country, setCountry] = useState("All");
  const [sort, setSort] = useState<SortOption>("precedence");
  const [page, setPage]         = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const savePage = () => sessionStorage.setItem("medallist-page", String(pageRef.current));

  // Restore page on mount, then clear
  useEffect(() => {
    const saved = parseInt(sessionStorage.getItem("medallist-page") || "1", 10);
    sessionStorage.removeItem("medallist-page");
    if (saved > 1) setPage(saved);
  }, []);

  const distinctBranches = Array.from(
    new Set(
      medals
        .map((m) => (m.branch || "").trim())
        .filter((b) => b.length > 0 && b.toLowerCase() !== "all")
    )
  ).sort((a, b) => a.localeCompare(b));
  const branches = ["All", ...distinctBranches];
  const distinctCountries = Array.from(
    new Set(
      medals
        .map((m) => (m.countryCode || "").trim().toUpperCase())
        .filter((c) => c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const countries = ["All", ...distinctCountries];

  const filtered = medals
    .filter((m) => {
      if (country === "All") return true;
      return (m.countryCode || "").trim().toUpperCase() === country;
    })
    .filter((m) => category === "All" || m.category === category)
    .filter((m) => {
      if (branch === "All") return true;
      const b = (m.branch || "").trim();
      return b === branch;
    })
    .filter((m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.shortName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sort) {
        case "points_desc": return b.basePoints - a.basePoints;
        case "points_asc":  return a.basePoints - b.basePoints;
        case "name":        return a.name.localeCompare(b.name);
        default: {
          if (country === "All") {
            const aCountry = (a.countryCode || "").toUpperCase();
            const bCountry = (b.countryCode || "").toUpperCase();
            const aIdx = COUNTRY_SORT_ORDER.indexOf(aCountry);
            const bIdx = COUNTRY_SORT_ORDER.indexOf(bCountry);
            if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
          }
          return a.precedenceOrder - b.precedenceOrder;
        }
      }
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "All"
      ? medals.length
      : medals.filter((m) => m.category === cat).length;
    return acc;
  }, {});

  const topMb = variant === "embedded" ? "mb-4" : "mb-5";

  return (
    <>
      {/* Search bar */}
      <div className={`relative ${topMb}`}>
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)] pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
          placeholder="Search medals by name or abbreviation..."
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full pl-12 pr-10 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold)]/20 transition-all"
        />
        {search && (
          <button
            onClick={() => handleFilterChange(() => setSearch(""))}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-text-muted)] hover:text-[var(--color-bg)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-4 mb-6 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)] mb-2">Categories</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((cat) => counts[cat] > 0).map((cat) => {
              const cc = cat !== "All" ? CATEGORY_COLORS[cat] : null;
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleFilterChange(() => setCategory(cat))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={
                    active && cc
                      ? { backgroundColor: cc.bg, color: cc.text, borderColor: cc.border }
                      : active
                      ? {
                          backgroundColor: "var(--color-gold-light)",
                          color: "#1a1a2e",
                          borderColor: "var(--color-gold)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "var(--color-text-muted)",
                          borderColor: "var(--color-border)",
                        }
                  }
                >
                  <span className="capitalize">{cat === "All" ? "All types" : cat}</span>
                  <span
                    className="font-bold text-[10px] px-1 py-0.5 rounded-full"
                    style={{ backgroundColor: active ? "rgba(0,0,0,0.15)" : "var(--color-border)" }}
                  >
                    {counts[cat]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {branches.length > 1 && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Service branch (medal)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => {
                const n =
                  b === "All" ? medals.length : medals.filter((m) => m.branch === b).length;
                const active = branch === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleFilterChange(() => setBranch(b))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                      active
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/50"
                    }`}
                  >
                    {b === "All" ? "All branches" : b}{" "}
                    <span className="opacity-80">({n})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {countries.length > 1 && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Country
            </p>
            <div className="flex flex-wrap gap-1.5">
              {countries.map((c) => {
                const n =
                  c === "All"
                    ? medals.length
                    : medals.filter((m) => (m.countryCode || "").trim().toUpperCase() === c).length;
                const active = country === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFilterChange(() => setCountry(c))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                      active
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/50"
                    }`}
                  >
                    {c === "All" ? "All countries" : countryOptionLabel(c)}{" "}
                    <span className="opacity-80">({n})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)] shrink-0 sm:mr-2">
            Sort
          </p>
          <select
            value={sort}
            onChange={(e) => handleFilterChange(() => setSort(e.target.value as SortOption))}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)] transition-colors w-full sm:w-auto sm:min-w-[12rem]"
          >
            <option value="precedence">Precedence Order</option>
            <option value="points_desc">Points: High to Low</option>
            <option value="points_asc">Points: Low to High</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          {filtered.length} {filtered.length === 1 ? "medal" : "medals"}
          {search || category !== "All" || branch !== "All" || country !== "All" ? ` matching filters` : " total"}
        </p>
        {(search || category !== "All" || branch !== "All" || country !== "All" || sort !== "precedence") && (
          <button
            type="button"
            onClick={() =>
              handleFilterChange(() => {
                setSearch("");
                setCategory("All");
                setBranch("All");
                setCountry("All");
                setSort("precedence");
              })
            }
            className="text-xs text-[var(--color-gold)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Medal grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[var(--color-text-muted)] py-12">
          No medals match your filters.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {paginated.map((mt, i) => {
              const cc = CATEGORY_COLORS[mt.category] ?? CATEGORY_COLORS.other;
              return (
                <Link
                  key={mt._id}
                  href={`/medals/${mt._id}`}
                  className="hero-card p-5 sm:p-6 text-left w-full group animate-fade-in-up block"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
                  onClick={savePage}
                >
                  {/* Large medal image centered */}
                  <div className="flex justify-center mb-4">
                    {mt.imageUrl ? (
                      <img
                        src={mt.imageUrl}
                        alt={mt.name}
                        className="object-contain rounded-lg transition-transform group-hover:scale-110"
                        style={{ height: 120, width: 120 }}
                      />
                    ) : mt.ribbonColors?.length > 0 ? (
                      <div
                        className="rounded-lg flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110"
                        style={{
                          height: 120,
                          width: 120,
                          backgroundColor: mt.ribbonColors[0],
                          color: medalTextColor(mt.ribbonColors[0]),
                          border: `3px solid ${cc.border}`,
                        }}
                      >
                        {medalShortLabelForDisplay(mt.shortName, mt.name)}
                      </div>
                    ) : (
                      <div
                        className="rounded-lg flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110"
                        style={{
                          height: 120,
                          width: 120,
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-text-muted)",
                          border: `3px solid ${cc.border}`,
                        }}
                      >
                        {medalShortLabelForDisplay(mt.shortName, mt.name)}
                      </div>
                    )}
                  </div>

                  {/* Name + abbreviation */}
                  <div className="text-center mb-3">
                    <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-[var(--color-gold)] transition-colors">
                      {mt.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                      {medalShortLabelForDisplay(mt.shortName, mt.name)}
                    </p>
                    {mt.countryCode && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        {countryOptionLabel(mt.countryCode)}
                      </p>
                    )}
                  </div>

                  {/* Category + points + precedence */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: cc.bg, color: cc.text }}
                    >
                      {mt.category}
                    </span>
                    <span className="score-badge text-xs shrink-0">{mt.basePoints} pts</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">#{mt.precedenceOrder}</span>
                  </div>

                  {mt.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-3 line-clamp-2 leading-relaxed">
                      {mt.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}
    </>
  );
}
