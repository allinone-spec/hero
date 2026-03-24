"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { AdminLoader } from "@/components/ui/AdminLoader";
import Pagination from "@/components/ui/Pagination";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { HERO_METADATA_TAGS } from "@/lib/metadata-tags";
import { countryOptionLabel } from "@/lib/country-display";

/* ── Types ────────────────────────────────────────────────── */

interface HeroItem {
  _id: string;
  name: string;
  rank: string;
  branch: string;
  score: number;
  published: boolean;
  slug: string;
  avatarUrl?: string;
  countryCode?: string;
  comparisonScore?: number | null;
  wars?: string[];
  combatAchievements?: { type?: string };
  metadataTags?: string[];
  medals?: unknown[];
  ownerUserId?: string | null;
  orderOverride?: number | null;
  updatedAt?: string;
}

interface MedalTypeOption {
  _id: string;
  name: string;
  shortName: string;
  basePoints: number;
  precedenceOrder: number;
  ribbonColors: string[];
  imageUrl?: string;
}

interface ScrapedMedal {
  rawName: string;
  devices: string;
  count: number;
  hasValor: boolean;
  arrowheads: number;
  matchedId: string | null;
  matchedName: string | null;
}

interface ImportFormData {
  name: string;
  rank: string;
  branch: string;
  biography: string;
  wars: string;
  avatarUrl: string;
  medals: {
    medalType: string;
    count: number;
    hasValor: boolean;
    valorDevices: number;
    arrowheads: number;
  }[];
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  published: boolean;
  combatAchievements: {
    type: string;
    confirmedKills: number;
    shipsSunk: number;
    majorEngagements: number;
    definingMissions: number;
  };
}

type StatusFilter = "all" | "published" | "draft";
type SortOption =
  | "name-asc"
  | "name-desc"
  | "score-desc"
  | "score-asc"
  | "branch-asc"
  | "rank-asc"
  | "country-asc"
  | "comparison-desc"
  | "comparison-asc"
  | "medals-desc"
  | "medals-asc"
  | "updated-desc"
  | "updated-asc"
  | "display-order";
type ImportStep = "url" | "review";

const COMBAT_TYPE_LABELS: Record<string, string> = {
  none: "No combat specialty",
  infantry: "Infantry",
  armor: "Armor",
  artillery: "Artillery",
  aviation: "Aviation",
  airborne: "Airborne",
  special_operations: "Special operations",
  submarine: "Submarine",
  surface: "Surface / naval",
  amphibious: "Amphibious",
  reconnaissance: "Reconnaissance",
  air_defense: "Air defense",
  engineering: "Engineering",
  signal: "Signal",
  intelligence: "Intelligence",
  medical: "Medical",
  logistics: "Logistics",
  chemical: "Chemical",
  electronic_warfare: "Electronic warfare",
  cyber: "Cyber",
  military_police: "Military police",
  ordnance: "Ordnance",
  sniper: "Sniper",
  marine: "Marine",
};

function heroMedalCount(h: HeroItem): number {
  return Array.isArray(h.medals) ? h.medals.length : 0;
}

const ITEMS_PER_PAGE = 15;

const BRANCHES = [
  "U.S. Army",
  "U.S. Navy",
  "U.S. Marine Corps",
  "U.S. Air Force",
  "U.S. Coast Guard",
  "U.S. Space Force",
];

const emptyImportForm: ImportFormData = {
  name: "",
  rank: "",
  branch: "U.S. Army",
  biography: "",
  wars: "",
  avatarUrl: "",
  medals: [],
  combatTours: 0,
  hadCombatCommand: false,
  powHeroism: false,
  multiServiceOrMultiWar: false,
  published: false,
  combatAchievements: {
    type: "none",
    confirmedKills: 0,
    shipsSunk: 0,
    majorEngagements: 0,
    definingMissions: 0,
  },
};

/* ── Main Page ────────────────────────────────────────────── */

export default function AdminHeroesPage() {
  const router = useRouter();
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [heroes, setHeroes] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(currentPage);
  pageRef.current = currentPage;
  const savePage = () => sessionStorage.setItem("heroes-page", String(pageRef.current));

  // Restore page on mount, then clear
  useEffect(() => {
    const saved = parseInt(sessionStorage.getItem("heroes-page") || "1", 10);
    sessionStorage.removeItem("heroes-page");
    if (saved > 1) setCurrentPage(saved);
  }, []);

  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("score-desc");
  const [countryFilter, setCountryFilter] = useState("all");
  const [warFilter, setWarFilter] = useState("all");
  const [combatFilter, setCombatFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [medalMinFilter, setMedalMinFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "claimed" | "unclaimed">("all");

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("url");
  const [wikiUrl, setWikiUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState("");
  const [importForm, setImportForm] = useState<ImportFormData>(emptyImportForm);
  const [medalTypes, setMedalTypes] = useState<MedalTypeOption[]>([]);
  const [unmatchedMedals, setUnmatchedMedals] = useState<string[]>([]);

  /* ── Load heroes ─────────────────────────────────────────── */

  const fetchHeroes = useCallback(() => {
    setLoading(true);
    fetch("/api/heroes?published=false")
      .then((r) => r.json())
      .then((data) => {
        setHeroes(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchHeroes(); }, [fetchHeroes]);

  // Load medal types for the import modal
  useEffect(() => {
    fetch("/api/medal-types")
      .then((r) => r.json())
      .then((data) => setMedalTypes(Array.isArray(data) ? data : []));
  }, []);

  // Gather unique branches for the branch filter dropdown
  const branches = useMemo(() => {
    const set = new Set<string>();
    heroes.forEach((h) => {
      if (h.branch) set.add(h.branch);
    });
    return Array.from(set).sort();
  }, [heroes]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    heroes.forEach((h) => {
      const c = (h.countryCode || "US").toUpperCase();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [heroes]);

  const warsInUse = useMemo(() => {
    const set = new Set<string>();
    heroes.forEach((h) => {
      (h.wars || []).forEach((w) => {
        if (w && String(w).trim()) set.add(String(w).trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [heroes]);

  const combatTypesInUse = useMemo(() => {
    const set = new Set<string>();
    heroes.forEach((h) => {
      const t = h.combatAchievements?.type || "none";
      set.add(t);
    });
    return Array.from(set).sort((a, b) => {
      const la = COMBAT_TYPE_LABELS[a] || a;
      const lb = COMBAT_TYPE_LABELS[b] || b;
      return la.localeCompare(lb);
    });
  }, [heroes]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete hero",
      message: `Delete ${name}? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(id);
    const res = await fetch(`/api/heroes/${id}`, { method: "DELETE" });
    if (res.ok) setHeroes((prev) => prev.filter((h) => h._id !== id));
    setDeleting(null);
  };

  const togglePublish = async (id: string, published: boolean) => {
    const res = await fetch(`/api/heroes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    if (res.ok) {
      setHeroes((prev) =>
        prev.map((h) => (h._id === id ? { ...h, published: !published } : h))
      );
    }
  };

  // Filter heroes based on search, branch, status, country, wars, tags, etc.
  const filtered = useMemo(() => {
    let result = heroes;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.rank.toLowerCase().includes(q) ||
          (h.branch || "").toLowerCase().includes(q) ||
          (h.slug || "").toLowerCase().includes(q) ||
          (h.countryCode || "").toLowerCase().includes(q) ||
          (h.metadataTags || []).some((t) => t.toLowerCase().includes(q)) ||
          (h.wars || []).some((w) => String(w).toLowerCase().includes(q))
      );
    }

    if (branchFilter !== "all") {
      result = result.filter((h) => h.branch === branchFilter);
    }

    if (statusFilter === "published") {
      result = result.filter((h) => h.published);
    } else if (statusFilter === "draft") {
      result = result.filter((h) => !h.published);
    }

    if (countryFilter !== "all") {
      result = result.filter((h) => (h.countryCode || "US").toUpperCase() === countryFilter);
    }

    if (warFilter !== "all") {
      result = result.filter((h) => (h.wars || []).some((w) => String(w).trim() === warFilter));
    }

    if (combatFilter !== "all") {
      result = result.filter(
        (h) => (h.combatAchievements?.type || "none") === combatFilter
      );
    }

    if (tagFilter !== "all") {
      result = result.filter((h) => (h.metadataTags || []).includes(tagFilter));
    }

    if (medalMinFilter !== "all") {
      const min = parseInt(medalMinFilter, 10);
      if (!Number.isNaN(min)) {
        result = result.filter((h) => heroMedalCount(h) >= min);
      }
    }

    if (ownerFilter === "claimed") {
      result = result.filter((h) => Boolean(h.ownerUserId));
    } else if (ownerFilter === "unclaimed") {
      result = result.filter((h) => !h.ownerUserId);
    }

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "score-desc":
          return b.score - a.score;
        case "score-asc":
          return a.score - b.score;
        case "branch-asc":
          return (a.branch || "").localeCompare(b.branch || "");
        case "rank-asc":
          return (a.rank || "").localeCompare(b.rank || "");
        case "country-asc":
          return (a.countryCode || "US").localeCompare(b.countryCode || "US");
        case "comparison-desc": {
          const ac = a.comparisonScore;
          const bc = b.comparisonScore;
          if (ac == null && bc == null) return 0;
          if (ac == null) return 1;
          if (bc == null) return -1;
          return bc - ac;
        }
        case "comparison-asc": {
          const ac = a.comparisonScore;
          const bc = b.comparisonScore;
          if (ac == null && bc == null) return 0;
          if (ac == null) return 1;
          if (bc == null) return -1;
          return ac - bc;
        }
        case "medals-desc":
          return heroMedalCount(b) - heroMedalCount(a);
        case "medals-asc":
          return heroMedalCount(a) - heroMedalCount(b);
        case "updated-desc":
          return (
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
        case "updated-asc":
          return (
            new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
          );
        case "display-order": {
          const ao = a.orderOverride;
          const bo = b.orderOverride;
          if (ao != null && bo != null && ao !== bo) return ao - bo;
          if (ao != null && bo == null) return -1;
          if (ao == null && bo != null) return 1;
          if (b.score !== a.score) return b.score - a.score;
          return a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [
    heroes,
    search,
    branchFilter,
    statusFilter,
    sortOption,
    countryFilter,
    warFilter,
    combatFilter,
    tagFilter,
    medalMinFilter,
    ownerFilter,
  ]);

  // Page resets to 1 inline in filter onChange handlers below

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedHeroes = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const published = heroes.filter((h) => h.published).length;
  const drafts = heroes.length - published;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showImport) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showImport]);

  /* ── Import Modal Logic ──────────────────────────────────── */

  const openImportModal = () => {
    setShowImport(true);
    setImportStep("url");
    setWikiUrl("");
    setImportError("");
    setImportForm(emptyImportForm);
    setUnmatchedMedals([]);
  };

  const closeImportModal = () => {
    setShowImport(false);
    setImportStep("url");
    setWikiUrl("");
    setImportError("");
    setImportForm(emptyImportForm);
    setUnmatchedMedals([]);
  };

  // Step 1: Fetch hero data from AI via Wikipedia URL
  const handleScrape = async () => {
    if (!wikiUrl.trim()) return;
    setScraping(true);
    setImportError("");

    try {
      const res = await fetch("/api/scrape/wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wikiUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      // Scraped medals from Wikipedia HTML parsing
      const scrapedMatched = (data.medals as ScrapedMedal[]).filter((m) => m.matchedId);
      const unmatched = (data.medals as ScrapedMedal[])
        .filter((m) => !m.matchedId)
        .map((m) => m.rawName);

      // Build medal list: merge Wikipedia-scraped + AI-matched medals
      // AI counts/valor take priority since AI analyzes the full biography
      const medalMap = new Map<string, { medalType: string; count: number; hasValor: boolean; valorDevices: number; arrowheads: number }>();

      // Start with Wikipedia-scraped matches
      for (const m of scrapedMatched) {
        medalMap.set(m.matchedId!, {
          medalType: m.matchedId!,
          count: m.count,
          hasValor: m.hasValor,
          valorDevices: m.hasValor ? 1 : 0,
          arrowheads: m.arrowheads,
        });
      }

      // Merge AI-matched medals — use AI count/valor when higher
      if (Array.isArray(data.aiMedals)) {
        for (const m of data.aiMedals) {
          const existing = medalMap.get(m.medalTypeId);
          if (existing) {
            // AI found more instances or detected valor — update
            if (m.count > existing.count) existing.count = m.count;
            if (m.hasValor && !existing.hasValor) {
              existing.hasValor = true;
              existing.valorDevices = Math.max(m.valorDevices || 1, existing.valorDevices);
            }
          } else {
            medalMap.set(m.medalTypeId, {
              medalType: m.medalTypeId,
              count: m.count || 1,
              hasValor: m.hasValor || false,
              valorDevices: m.valorDevices || 0,
              arrowheads: 0,
            });
          }
        }
      }

      // Use AI-enhanced description and wars if available
      const aiDescription = data.aiDescription || "";
      const aiWars = Array.isArray(data.aiWars) && data.aiWars.length > 0
        ? data.aiWars
        : data.wars || [];

      setImportForm({
        ...emptyImportForm,
        name: data.name || "",
        rank: data.rank || "",
        branch: data.branch || "U.S. Army",
        avatarUrl: data.avatarUrl || "",
        biography: aiDescription || data.biography || "",
        wars: aiWars.join(", "),
        multiServiceOrMultiWar: aiWars.length > 1 || (data.multiServiceOrMultiWar ?? false),
        combatAchievements: {
          ...emptyImportForm.combatAchievements,
          type:
            (data.aiCombatSpecialty && data.aiCombatSpecialty !== "none" ? data.aiCombatSpecialty : null) ||
            (data.combatType && data.combatType !== "none" ? data.combatType : null) ||
            "none",
        },
        medals: Array.from(medalMap.values()),
      });

      setUnmatchedMedals(unmatched);
      setImportStep("review");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  };

  // AI Generate: get description + wars + medals all at once
  const handleAIGenerate = async () => {
    setAiLoading(true);
    setImportError("");

    try {
      // Build context from all available scraped data
      const currentMedalNames = importForm.medals
        .map((m) => {
          const mt = medalTypes.find((t) => t._id === m.medalType);
          return mt ? `${mt.name} x${m.count}${m.hasValor ? " (V)" : ""}` : "";
        })
        .filter(Boolean)
        .join(", ");

      const scrapedData = [
        `Name: ${importForm.name}`,
        `Rank: ${importForm.rank}`,
        `Branch: ${importForm.branch}`,
        importForm.wars ? `Wars: ${importForm.wars}` : "",
        importForm.biography ? `Existing bio: ${importForm.biography}` : "",
        currentMedalNames ? `Known medals: ${currentMedalNames}` : "",
      ].filter(Boolean).join("\n");

      // Call analyze-hero — returns description, wars, and matched medals
      const res = await fetch("/api/ai/analyze-hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapedData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "AI analysis failed");
      }
      const data = await res.json();

      // Merge AI medals with existing — update counts/valor, add new ones
      setImportForm((prev) => {
        const updatedMedals = [...prev.medals];

        if (Array.isArray(data.medals)) {
          for (const m of data.medals) {
            const existingIdx = updatedMedals.findIndex((e) => e.medalType === m.medalTypeId);
            if (existingIdx >= 0) {
              // Update count/valor if AI found more
              const existing = updatedMedals[existingIdx];
              if ((m.count || 1) > existing.count) existing.count = m.count;
              if (m.hasValor && !existing.hasValor) {
                existing.hasValor = true;
                existing.valorDevices = Math.max(m.valorDevices || 1, existing.valorDevices);
              }
            } else {
              updatedMedals.push({
                medalType: m.medalTypeId,
                count: m.count || 1,
                hasValor: m.hasValor || false,
                valorDevices: m.valorDevices || 0,
                arrowheads: 0,
              });
            }
          }
        }

        return {
          ...prev,
          biography: data.description || prev.biography,
          wars: Array.isArray(data.wars) && data.wars.length > 0
            ? data.wars.join(", ")
            : prev.wars,
          medals: updatedMedals,
          multiServiceOrMultiWar: Array.isArray(data.wars) && data.wars.length > 1
            ? true
            : prev.multiServiceOrMultiWar,
        };
      });
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  // Save hero from import modal
  const handleImportSave = async () => {
    if (!importForm.name.trim()) {
      setImportError("Hero name is required");
      return;
    }
    if (!importForm.rank.trim()) {
      setImportError("Rank is required");
      return;
    }

    setImportSaving(true);
    setImportError("");

    try {
      const body = {
        ...importForm,
        wars: importForm.wars.split(",").map((w) => w.trim()).filter(Boolean),
        recalculateScore: true,
      };

      const res = await fetch("/api/heroes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save hero");
      }

      closeImportModal();
      fetchHeroes();
      router.refresh();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setImportSaving(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  if (loading) return <AdminLoader label="Loading heroes..." />;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Heroes</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-[var(--color-text-muted)]">
              {heroes.length} total
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 border border-green-500/30 font-medium">
              {published} published
            </span>
            {drafts > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 font-medium">
                {drafts} draft
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openImportModal}
            disabled={!can("/admin/heroes", "canCreate")}
            className="btn-secondary shrink-0 text-center text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import
          </button>
          {can("/admin/heroes", "canCreate") && (
            <Link
              href="/admin/heroes/import"
              className="btn-secondary shrink-0 text-center text-sm"
            >
              CSV bulk
            </Link>
          )}
          {can("/admin/heroes", "canCreate") ? (
            <Link href="/admin/heroes/new" className="btn-primary shrink-0 text-center">
              + Add Hero
            </Link>
          ) : (
            <span className="btn-primary shrink-0 text-center opacity-40 cursor-not-allowed">
              + Add Hero
            </span>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2 xl:col-span-2">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search name, rank, branch, slug, country, wars, tags…"
              className="admin-input !pl-10 text-sm w-full"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{countryOptionLabel(c)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={warFilter}
            onChange={(e) => { setWarFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All wars</option>
            {warsInUse.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select
            value={combatFilter}
            onChange={(e) => { setCombatFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All combat types</option>
            {combatTypesInUse.map((t) => (
              <option key={t} value={t}>{COMBAT_TYPE_LABELS[t] || t}</option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => { setTagFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All tags</option>
            {HERO_METADATA_TAGS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          <select
            value={medalMinFilter}
            onChange={(e) => { setMedalMinFilter(e.target.value); setCurrentPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">Any medal count</option>
            <option value="1">1+ medals</option>
            <option value="3">3+ medals</option>
            <option value="5">5+ medals</option>
            <option value="10">10+ medals</option>
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value as "all" | "claimed" | "unclaimed");
              setCurrentPage(1);
            }}
            className="admin-input text-sm"
          >
            <option value="all">All adoption</option>
            <option value="claimed">Claimed (has owner)</option>
            <option value="unclaimed">Unclaimed</option>
          </select>

          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value as SortOption); setCurrentPage(1); }}
            className="admin-input text-sm lg:col-span-2"
          >
            <option value="score-desc">Sort: Score high → low</option>
            <option value="score-asc">Sort: Score low → high</option>
            <option value="display-order">Sort: Public leaderboard order</option>
            <option value="name-asc">Sort: Name A–Z</option>
            <option value="name-desc">Sort: Name Z–A</option>
            <option value="branch-asc">Sort: Branch A–Z</option>
            <option value="rank-asc">Sort: Rank A–Z</option>
            <option value="country-asc">Sort: Country code A–Z</option>
            <option value="comparison-desc">Sort: Comparison score high → low</option>
            <option value="comparison-asc">Sort: Comparison score low → high</option>
            <option value="medals-desc">Sort: Most medals</option>
            <option value="medals-asc">Sort: Fewest medals</option>
            <option value="updated-desc">Sort: Recently updated</option>
            <option value="updated-asc">Sort: Oldest update</option>
          </select>
        </div>
      </div>

      {/* Results summary */}
      {filtered.length !== heroes.length && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Showing {filtered.length} of {heroes.length} heroes
          {search && <> matching &quot;{search}&quot;</>}
        </p>
      )}

      {/* Hero list */}
      <div className="space-y-2">
        {filtered.length === 0 && heroes.length > 0 && (
          <p className="text-center text-[var(--color-text-muted)] py-8 text-sm">
            No heroes match your filters.
          </p>
        )}

        {paginatedHeroes.map((hero, idx) => (
          <div
            key={hero._id}
            className="hero-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 animate-fade-in-up"
            style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}
          >
            {/* Top row on mobile: rank + avatar + info */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Rank */}
              <div className="rank-number text-base shrink-0 w-10 text-center">
                #{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
              </div>

              {/* Avatar */}
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                {hero.avatarUrl ? (
                  <img
                    src={hero.avatarUrl}
                    alt={hero.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AvatarFallback name={hero.name} size={44} />
                )}
              </div>

              {/* Name + rank + branch */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{hero.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                  {hero.rank}
                  {hero.branch ? ` \u00B7 ${hero.branch}` : ""}
                  <span className="opacity-80">{` \u00B7 ${(hero.countryCode || "US").toUpperCase()}`}</span>
                  <span className="opacity-70">{` \u00B7 ${heroMedalCount(hero)} medal${heroMedalCount(hero) === 1 ? "" : "s"}`}</span>
                </p>
              </div>

              {/* Score - visible on mobile inline, larger on desktop */}
              <div className="shrink-0 text-right sm:hidden">
                <span className="score-badge text-sm font-bold">{hero.score}</span>
              </div>
            </div>

            {/* Desktop-only: Score + Status + Actions in a row */}
            <div className="flex items-center gap-3 sm:gap-4 pl-[52px] sm:pl-0">
              {/* Score - desktop */}
              <div className="shrink-0 text-right hidden sm:block">
                <p className="text-lg font-bold text-[var(--color-gold)] leading-none">
                  {hero.score}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                  pts
                </p>
              </div>

              {/* Status badge */}
              <button
                onClick={() => togglePublish(hero._id, hero.published)}
                disabled={!can("/admin/heroes", "canEdit")}
                title={
                  !can("/admin/heroes", "canEdit")
                    ? "No permission to change status"
                    : hero.published ? "Click to unpublish" : "Click to publish"
                }
                className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border transition-all min-w-[90px] text-center disabled:cursor-not-allowed ${
                  hero.published
                    ? "bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/25 disabled:opacity-50"
                    : "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
                }`}
              >
                {hero.published ? "\u2713 Published" : "Draft"}
              </button>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/heroes/${hero._id}/view`}
                  className="btn-secondary text-xs py-1.5 px-3"
                  onClick={savePage}
                >
                  View
                </Link>
                {can("/admin/heroes", "canEdit") ? (
                  <Link
                    href={`/admin/heroes/${hero._id}/edit`}
                    className="btn-secondary text-xs py-1.5 px-3"
                    onClick={savePage}
                  >
                    Edit
                  </Link>
                ) : (
                  <span className="btn-secondary text-xs py-1.5 px-3 opacity-40 cursor-not-allowed">
                    Edit
                  </span>
                )}
                <button
                  onClick={() => handleDelete(hero._id, hero.name)}
                  disabled={deleting === hero._id || !can("/admin/heroes", "canDelete")}
                  className="btn-danger text-xs py-1.5 px-3 min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting === hero._id ? (
                    <LoadingSpinner size="xs" label="Deleting" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {heroes.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[var(--color-border)] rounded-xl">
            <p className="text-4xl mb-3">{"\u2605"}</p>
            <p className="font-semibold mb-1">No heroes yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Start building the archive by adding the first hero.
            </p>
            {can("/admin/heroes", "canCreate") ? (
              <Link href="/admin/heroes/new" className="btn-primary text-sm">
                + Add First Hero
              </Link>
            ) : (
              <span className="btn-primary text-sm opacity-40 cursor-not-allowed">
                + Add First Hero
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        showItemCount={true}
      />

      {/* ── Import Modal ───────────────────────────────────────── */}
      {showImport && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={closeImportModal} />
          <div className="fixed inset-0 z-[70] flex h-screen items-center justify-center p-4">
            <div
              className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-fade-in -mt-[100px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {importStep === "url" ? "Import Hero" : `Import: ${importForm.name || "Hero"}`}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {importStep === "url"
                      ? "Paste a Wikipedia URL to import hero data"
                      : "Review and enhance with AI before saving"}
                  </p>
                </div>
                <button
                  onClick={closeImportModal}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4">
                {importError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                    {importError}
                  </div>
                )}

                {/* ── Step 1: URL input ─────────────────────────── */}
                {importStep === "url" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Wikipedia URL
                      </label>
                      <input
                        type="url"
                        value={wikiUrl}
                        onChange={(e) => setWikiUrl(e.target.value)}
                        placeholder="https://en.wikipedia.org/wiki/Audie_Murphy"
                        className="admin-input text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button onClick={closeImportModal} className="btn-secondary text-sm py-2 px-4">
                        Cancel
                      </button>
                      <button
                        onClick={handleScrape}
                        disabled={scraping || !wikiUrl.trim()}
                        className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
                      >
                        {scraping ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Importing…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Import
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Review scraped data ───────────────── */}
                {importStep === "review" && (
                  <div className="space-y-5">
                    {/* Hero preview card */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        {importForm.avatarUrl ? (
                          <img src={importForm.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <AvatarFallback name={importForm.name || "Hero"} size={64} shape="rounded" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={importForm.name}
                          onChange={(e) => setImportForm((p) => ({ ...p, name: e.target.value }))}
                          className="admin-input text-sm font-semibold mb-1.5"
                          placeholder="Hero name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={importForm.rank}
                            onChange={(e) => setImportForm((p) => ({ ...p, rank: e.target.value }))}
                            className="admin-input text-xs"
                            placeholder="Rank"
                          />
                          <select
                            value={importForm.branch}
                            onChange={(e) => setImportForm((p) => ({ ...p, branch: e.target.value }))}
                            className="admin-input text-xs"
                          >
                            {BRANCHES.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Biography */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                          Biography
                        </label>
                        <button
                          type="button"
                          onClick={handleAIGenerate}
                          disabled={aiLoading}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] hover:bg-[var(--color-gold)]/5 transition-colors"
                          title="Generate an enhanced biography using AI"
                        >
                          {aiLoading ? (
                            <LoadingSpinner size="xs" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L12 12l-2.83-3.17A4 4 0 0 1 12 2z" />
                              <path d="M12 12l6 6" /><path d="M12 12l-6 6" />
                            </svg>
                          )}
                          AI Generate
                        </button>
                      </div>
                      <textarea
                        value={importForm.biography}
                        onChange={(e) => setImportForm((p) => ({ ...p, biography: e.target.value }))}
                        className="admin-input text-sm"
                        rows={5}
                        placeholder="Biography will appear here after scraping or AI generation..."
                      />
                    </div>

                    {/* Wars */}
                    <div>
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                        Wars / Theaters
                      </label>
                      <input
                        type="text"
                        value={importForm.wars}
                        onChange={(e) => setImportForm((p) => ({ ...p, wars: e.target.value }))}
                        className="admin-input text-sm"
                        placeholder="World War II, Korean War"
                      />
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Comma-separated list</p>
                    </div>

                    {/* Medals summary */}
                    <div>
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                        Medals ({importForm.medals.length} matched)
                      </label>
                      {importForm.medals.length > 0 ? (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {importForm.medals.map((medal, idx) => {
                            const mt = medalTypes.find((t) => t._id === medal.medalType);
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
                              >
                                {mt ? (
                                  <>
                                    {mt.imageUrl ? (
                                      <img src={mt.imageUrl} alt="" className="w-6 h-6 object-contain rounded shrink-0" />
                                    ) : (
                                      <svg width="24" height="8" className="rounded shrink-0">
                                        {(mt.ribbonColors.length > 0 ? mt.ribbonColors : ["#808080"]).map((c, i, arr) => (
                                          <rect
                                            key={i}
                                            x={(24 / arr.length) * i}
                                            y={0}
                                            width={24 / arr.length}
                                            height={8}
                                            fill={c}
                                          />
                                        ))}
                                      </svg>
                                    )}
                                    <span className="flex-1 truncate font-medium">{mt.name}</span>
                                  </>
                                ) : (
                                  <span className="flex-1 text-[var(--color-text-muted)]">Unknown medal</span>
                                )}
                                <span className="font-medium">{medal.count}</span>
                                {medal.hasValor && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-bold">V</span>
                                )}
                                <button
                                  onClick={() => {
                                    setImportForm((p) => ({
                                      ...p,
                                      medals: p.medals.filter((_, i) => i !== idx),
                                    }));
                                  }}
                                  className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                                  title="Remove medal"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)] px-3 py-2 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                          No medals matched from Wikipedia data.
                        </p>
                      )}

                      {unmatchedMedals.length > 0 && (
                        <div className="mt-2 text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg p-3">
                          <p className="font-semibold mb-1">
                            {unmatchedMedals.length} unmatched medal{unmatchedMedals.length > 1 ? "s" : ""}:
                          </p>
                          <p className="text-yellow-400/70">{unmatchedMedals.join(", ")}</p>
                        </div>
                      )}
                    </div>

                    {/* Service toggles */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "hadCombatCommand" as const, label: "Combat Command" },
                        { key: "powHeroism" as const, label: "POW / Heroism" },
                        { key: "multiServiceOrMultiWar" as const, label: "Multi-Service/War" },
                        { key: "published" as const, label: "Published" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={importForm[key]}
                            onChange={(e) => setImportForm((p) => ({ ...p, [key]: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded accent-[var(--color-gold)]"
                          />
                          <span className={importForm[key] ? "font-medium" : "text-[var(--color-text-muted)]"}>
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer (review step only) */}
              {importStep === "review" && (
                <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
                  <button
                    onClick={() => setImportStep("url")}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    &larr; Back to URL
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={closeImportModal} className="btn-secondary text-sm py-2 px-4">
                      Cancel
                    </button>
                    <button
                      onClick={handleImportSave}
                      disabled={importSaving}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
                    >
                      {importSaving ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Saving…
                        </>
                      ) : (
                        "Save Hero"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
