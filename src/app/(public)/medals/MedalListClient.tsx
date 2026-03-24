"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { medalTextColor } from "@/components/ui/AvatarFallback";
import Pagination from "@/components/ui/Pagination";
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

type SortOption = "precedence" | "points_desc" | "points_asc" | "name";

/* ── Main component ─────────────────────────────────────── */
export default function MedalListClient({ medals }: { medals: MedalType[] }) {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort]         = useState<SortOption>("precedence");
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

  const filtered = medals
    .filter((m) => category === "All" || m.category === category)
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
        default:            return a.precedenceOrder - b.precedenceOrder;
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

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-5">
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

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 flex-1">
          {CATEGORIES.filter((cat) => counts[cat] > 0).map((cat) => {
            const cc = cat !== "All" ? CATEGORY_COLORS[cat] : null;
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => handleFilterChange(() => setCategory(cat))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  active && cc
                    ? { backgroundColor: cc.bg, color: cc.text, borderColor: cc.border }
                    : active
                    ? { backgroundColor: "var(--color-gold-light)", color: "#1a1a2e", borderColor: "var(--color-gold)" }
                    : { backgroundColor: "transparent", color: "var(--color-text-muted)", borderColor: "var(--color-border)" }
                }
              >
                <span className="capitalize">{cat === "All" ? "All" : cat}</span>
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

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => handleFilterChange(() => setSort(e.target.value as SortOption))}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-gold)] transition-colors shrink-0"
        >
          <option value="precedence">Precedence Order</option>
          <option value="points_desc">Points: High to Low</option>
          <option value="points_asc">Points: Low to High</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          {filtered.length} {filtered.length === 1 ? "medal" : "medals"}
          {search || category !== "All" ? ` matching filters` : " total"}
        </p>
        {(search || category !== "All" || sort !== "precedence") && (
          <button
            onClick={() => handleFilterChange(() => { setSearch(""); setCategory("All"); setSort("precedence"); })}
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
