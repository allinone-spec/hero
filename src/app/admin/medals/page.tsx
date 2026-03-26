"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AdminLoader, AdminLoaderOrbit } from "@/components/ui/AdminLoader";
import Pagination from "@/components/ui/Pagination";
import { usePrivileges } from "@/contexts/PrivilegeContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MedalDisplayThumbRow } from "@/components/medals/MedalDisplayThumb";
import { SafeWikimediaImg } from "@/components/ui/SafeWikimediaImg";
import { medalShortLabelForDisplay } from "@/lib/medal-short-name";
import { countryOptionLabel } from "@/lib/country-display";

interface MedalTypeItem {
  _id: string;
  name: string;
  shortName: string;
  category: string;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  tier: number;
  branch: string;
  precedenceOrder: number;
  ribbonColors: string[];
  description: string;
  imageUrl: string;
  ribbonImageUrl: string;
  countryCode?: string;
  wikiImages?: { url?: string }[];
}

const ITEMS_PER_PAGE = 10;
const CATEGORIES = ["All", "valor", "service", "foreign", "other"];
type SortOption =
  | "precedence"
  | "points_desc"
  | "points_asc"
  | "name"
  | "tier_asc"
  | "branch"
  | "country"
  | "shortName"
  | "valor_points_desc"
  | "category";

/* ── Standard US military decorations reference list ───── */
interface MedalRef { name: string; imageUrl: string }
const W = "https://upload.wikimedia.org/wikipedia/commons/thumb";
const US_MEDALS: MedalRef[] = [
  { name: "Medal of Honor", imageUrl: `${W}/e/e5/Army_Medal_of_Honor.jpg/100px-Army_Medal_of_Honor.jpg` },
  { name: "Distinguished Service Cross", imageUrl: `${W}/1/1e/Army_distinguished_service_cross_medal.jpg/100px-Army_distinguished_service_cross_medal.jpg` },
  { name: "Navy Cross", imageUrl: `${W}/5/57/Navy_Cross.png/100px-Navy_Cross.png` },
  { name: "Air Force Cross", imageUrl: `${W}/c/cf/Air_Force_Cross_Medal.svg/100px-Air_Force_Cross_Medal.svg.png` },
  { name: "Coast Guard Cross", imageUrl: "" },
  { name: "Defense Distinguished Service Medal", imageUrl: "" },
  { name: "Distinguished Service Medal (Army)", imageUrl: "" },
  { name: "Distinguished Service Medal (Navy)", imageUrl: "" },
  { name: "Distinguished Service Medal (Air Force)", imageUrl: "" },
  { name: "Distinguished Service Medal (Coast Guard)", imageUrl: "" },
  { name: "Silver Star", imageUrl: `${W}/8/89/Silver_Star_medal.png/100px-Silver_Star_medal.png` },
  { name: "Defense Superior Service Medal", imageUrl: "" },
  { name: "Legion of Merit", imageUrl: `${W}/0/09/Us_legion_of_merit_legionnaire.png/100px-Us_legion_of_merit_legionnaire.png` },
  { name: "Distinguished Flying Cross", imageUrl: `${W}/f/fe/Distinguished_Flying_Cross_Obverse.jpg/100px-Distinguished_Flying_Cross_Obverse.jpg` },
  { name: "Soldier's Medal", imageUrl: `${W}/8/87/Soldiers_Medal_Obverse.jpg/100px-Soldiers_Medal_Obverse.jpg` },
  { name: "Navy and Marine Corps Medal", imageUrl: "" },
  { name: "Airman's Medal", imageUrl: "" },
  { name: "Coast Guard Medal", imageUrl: "" },
  { name: "Bronze Star Medal", imageUrl: `${W}/f/f1/Bronze_Star_Medal.png/100px-Bronze_Star_Medal.png` },
  { name: "Purple Heart", imageUrl: `${W}/f/f5/Purple_Heart_Medal.png/100px-Purple_Heart_Medal.png` },
  { name: "Defense Meritorious Service Medal", imageUrl: "" },
  { name: "Meritorious Service Medal", imageUrl: `${W}/a/af/Meritorious_Service_w_medal.svg/100px-Meritorious_Service_w_medal.svg.png` },
  { name: "Air Medal", imageUrl: `${W}/4/43/AirMed.gif/100px-AirMed.gif` },
  { name: "Joint Service Commendation Medal", imageUrl: "" },
  { name: "Army Commendation Medal", imageUrl: `${W}/8/86/US_Army_Commendation_Medal_-_Bild_001.jpg/100px-US_Army_Commendation_Medal_-_Bild_001.jpg` },
  { name: "Navy and Marine Corps Commendation Medal", imageUrl: "" },
  { name: "Air Force Commendation Medal", imageUrl: "" },
  { name: "Coast Guard Commendation Medal", imageUrl: "" },
  { name: "Joint Service Achievement Medal", imageUrl: "" },
  { name: "Army Achievement Medal", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ef/ArmyAchievementMedal.png" },
  { name: "Navy and Marine Corps Achievement Medal", imageUrl: "" },
  { name: "Air Force Achievement Medal", imageUrl: "" },
  { name: "Coast Guard Achievement Medal", imageUrl: "" },
  { name: "Combat Action Ribbon", imageUrl: "" },
  { name: "Combat Infantryman Badge", imageUrl: "" },
  { name: "Presidential Unit Citation", imageUrl: `${W}/9/94/U.S._Army_and_U.S._Air_Force_Presidential_Unit_Citation_ribbon.svg/100px-U.S._Army_and_U.S._Air_Force_Presidential_Unit_Citation_ribbon.svg.png` },
  { name: "Joint Meritorious Unit Award", imageUrl: "" },
  { name: "Prisoner of War Medal", imageUrl: `${W}/6/6e/Prisoner_of_War_Medal_%28United_States%29.jpg/100px-Prisoner_of_War_Medal_%28United_States%29.jpg` },
  { name: "Good Conduct Medal (Army)", imageUrl: `${W}/9/90/GoodConduct1.jpg/100px-GoodConduct1.jpg` },
  { name: "Good Conduct Medal (Navy)", imageUrl: "" },
  { name: "Good Conduct Medal (Marine Corps)", imageUrl: "" },
  { name: "Good Conduct Medal (Air Force)", imageUrl: "" },
  { name: "Good Conduct Medal (Coast Guard)", imageUrl: "" },
  { name: "National Defense Service Medal", imageUrl: `${W}/7/72/National_Defense_Service_Medal.png/100px-National_Defense_Service_Medal.png` },
  { name: "Armed Forces Expeditionary Medal", imageUrl: "" },
  { name: "Vietnam Service Medal", imageUrl: "" },
  { name: "Southwest Asia Service Medal", imageUrl: "" },
  { name: "Kosovo Campaign Medal", imageUrl: "" },
  { name: "Afghanistan Campaign Medal", imageUrl: "" },
  { name: "Iraq Campaign Medal", imageUrl: "" },
  { name: "Global War on Terrorism Expeditionary Medal", imageUrl: "" },
  { name: "Global War on Terrorism Service Medal", imageUrl: "" },
  { name: "Korean Defense Service Medal", imageUrl: "" },
  { name: "Armed Forces Service Medal", imageUrl: "" },
  { name: "Humanitarian Service Medal", imageUrl: "" },
  { name: "Military Outstanding Volunteer Service Medal", imageUrl: "" },
  { name: "Armed Forces Reserve Medal", imageUrl: "" },
  { name: "Army Service Ribbon", imageUrl: "" },
  { name: "Overseas Service Ribbon", imageUrl: "" },
];

/* ── Medal picker dropdown (with images) ─────────────────── */
function MedalPickerDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MedalRef[];
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});

  const selected = options.find((o) => o.name === value);

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      position: "fixed",
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
      zIndex: 9999,
    });
  }, []);

  const openDropdown = () => {
    reposition();
    setQuery("");
    setOpen(true);
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return (
    <div className="relative flex-1">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="admin-input text-sm flex items-center gap-2 text-left cursor-pointer w-full"
        style={{ minHeight: 36 }}
      >
        {selected ? (
          <>
            {selected.imageUrl ? (
              <SafeWikimediaImg src={selected.imageUrl} alt="" className="w-6 h-6 object-contain rounded shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded bg-[var(--color-gold)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--color-gold)] shrink-0">★</span>
            )}
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-[var(--color-text-muted)] flex-1">— Select a medal to add —</span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          className="shrink-0 text-[var(--color-text-muted)]"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown via portal */}
      {open &&
        createPortal(
          <div
            ref={dropRef}
            style={{
              ...pos,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
          >
            {/* Search */}
            <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ position: "relative" }}>
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{
                    position: "absolute", left: 9, top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)", pointerEvents: "none",
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search medals…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 30, paddingRight: 10,
                    paddingTop: 6, paddingBottom: 6,
                    fontSize: "0.8rem",
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8, color: "var(--color-text)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Options */}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {/* Clear option */}
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 12px",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-text-muted)", fontSize: "0.8rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                — Select a medal to add —
              </button>

              {filtered.length === 0 && (
                <div style={{ padding: "12px", color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center" }}>
                  No medals found
                </div>
              )}

              {filtered.map((medal) => {
                const isActive = medal.name === value;
                return (
                  <button
                    key={medal.name}
                    type="button"
                    onClick={() => { onChange(medal.name); setOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "8px 12px",
                      background: isActive ? "rgba(212,168,67,0.12)" : "none",
                      border: "none", cursor: "pointer",
                      borderLeft: isActive ? "2px solid var(--color-gold)" : "2px solid transparent",
                      transition: "background 0.1s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Medal image or placeholder */}
                    {medal.imageUrl ? (
                      <SafeWikimediaImg
                        src={medal.imageUrl}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, flexShrink: 0 }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700,
                          background: "rgba(212,168,67,0.15)", color: "var(--color-gold)",
                        }}
                      >
                        ★
                      </span>
                    )}

                    {/* Medal name */}
                    <span style={{
                      flex: 1, minWidth: 0, fontSize: "0.8rem", fontWeight: 500,
                      color: isActive ? "var(--color-gold)" : "var(--color-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {medal.name}
                    </span>

                    {/* Checkmark */}
                    {isActive && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── Auto-populate progress modal ──────────────────────── */
function AutoPopulateModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (medals: MedalTypeItem[]) => void;
}) {
  const [status, setStatus] = useState<"confirm" | "loading" | "done" | "error">("confirm");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleRun = async () => {
    setStatus("loading");
    setProgress("Asking AI for this site’s medal catalog (U.S. core, foreign/NATO/UN, scoring fields)...");
    try {
      const res = await fetch("/api/medal-types/auto-populate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Auto-populate failed");
        return;
      }
      setProgress(`Done! ${data.created} medals created, ${data.updated} updated, ${data.skipped} unchanged.`);
      setMessage(`AI tokens used: ${data.tokens ?? "N/A"}`);
      setStatus("done");

      const refreshRes = await fetch("/api/medal-types");
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && Array.isArray(refreshData)) {
        onComplete(refreshData);
      }
    } catch {
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target !== e.currentTarget || status === "loading" || status === "done") return;
        onClose();
      }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md animate-scale-in p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))", color: "#1a1a2e" }}
          >
            AI
          </div>
          <div>
            <h2 className="text-lg font-bold">Auto-Populate Medals</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Uses Gemini for U.S. decorations plus common foreign, NATO, and UN awards
            </p>
          </div>
        </div>

        {status === "confirm" && (
          <>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Gemini fills this site&apos;s medal catalog with U.S. awards in correct precedence, then a
              limited set of common foreign, NATO, and UN decorations. Heroism points still follow the
              U.S. valor table; non-U.S. rows are mainly for display/catalog (typically 0 points). New
              medals are created and existing ones (matched by name) are updated.
            </p>
            <div className="flex gap-2">
              <button onClick={handleRun} className="btn-primary flex-1">
                Run Auto-Populate
              </button>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </>
        )}

        {status === "loading" && (
          <div className="text-center py-4 space-y-3">
            <div className="flex justify-center text-[var(--color-gold)]">
              <AdminLoaderOrbit size={48} variant="brand" />
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{progress}</p>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-semibold">Complete!</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{progress}</p>
            {message && <p className="text-xs text-[var(--color-text-muted)]">{message}</p>}
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              {message}
            </div>
            <div className="flex gap-2">
              <button onClick={handleRun} className="btn-primary flex-1">Retry</button>
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function AdminMedalsPage() {
  const { can } = usePrivileges();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [medalTypes, setMedalTypes] = useState<MedalTypeItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [selectedMedalToAdd, setSelectedMedalToAdd] = useState("");
  const [addingMedal, setAddingMedal] = useState(false);

  // Merge state
  const [mergeSource, setMergeSource] = useState<MedalTypeItem | null>(null);
  const [mergeTarget, setMergeTarget] = useState<MedalTypeItem | null>(null);
  const [mergeStep, setMergeStep] = useState<"select" | "confirm">("select");
  const [mergeSearch, setMergeSearch] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  // Filters
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("All");
  const [branchFilter, setBranchFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [valorFilter, setValorFilter] = useState<"all" | "valor" | "nonvalor">("all");
  const [vDeviceFilter, setVDeviceFilter] = useState<"all" | "requires" | "inherent">("all");
  const [sort, setSort]             = useState<SortOption>("precedence");
  const [page, setPage]             = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const savePage = () => sessionStorage.setItem("medals-page", String(pageRef.current));

  // Restore page on mount, then clear
  useEffect(() => {
    const saved = parseInt(sessionStorage.getItem("medals-page") || "1", 10);
    sessionStorage.removeItem("medals-page");
    if (saved > 1) setPage(saved);
  }, []);

  useEffect(() => {
    fetch("/api/medal-types")
      .then((r) => r.json())
      .then((data) => {
        setMedalTypes(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const medalBranches = useMemo(() => {
    const s = new Set<string>();
    medalTypes.forEach((m) => {
      if (m.branch) s.add(m.branch);
    });
    return Array.from(s).sort();
  }, [medalTypes]);

  const medalCountries = useMemo(() => {
    const s = new Set<string>();
    medalTypes.forEach((m) => s.add((m.countryCode || "US").toUpperCase()));
    return Array.from(s).sort();
  }, [medalTypes]);

  const filtered = useMemo(() => {
    return medalTypes
      .filter((m) => category === "All" || m.category === category)
      .filter((m) => branchFilter === "all" || m.branch === branchFilter)
      .filter(
        (m) =>
          countryFilter === "all" ||
          (m.countryCode || "US").toUpperCase() === countryFilter
      )
      .filter((m) => {
        if (tierFilter === "all") return true;
        if (tierFilter === "4+") return (m.tier ?? 99) >= 4;
        const t = parseInt(tierFilter, 10);
        if (Number.isNaN(t)) return true;
        return (m.tier ?? 99) === t;
      })
      .filter((m) => {
        if (valorFilter === "all") return true;
        const hasValorPts = (m.basePoints ?? 0) > 0 || (m.valorPoints ?? 0) > 0;
        return valorFilter === "valor" ? hasValorPts : !hasValorPts;
      })
      .filter((m) => {
        if (vDeviceFilter === "all") return true;
        if (vDeviceFilter === "requires") return m.requiresValorDevice;
        return m.inherentlyValor;
      })
      .filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.shortName.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q) ||
          (m.branch || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case "points_desc":
            return b.basePoints - a.basePoints;
          case "points_asc":
            return a.basePoints - b.basePoints;
          case "name":
            return a.name.localeCompare(b.name);
          case "tier_asc":
            return (a.tier ?? 99) - (b.tier ?? 99);
          case "valor_points_desc":
            return (b.valorPoints ?? 0) - (a.valorPoints ?? 0);
          case "branch":
            return (a.branch || "").localeCompare(b.branch || "");
          case "country":
            return (a.countryCode || "US").localeCompare(b.countryCode || "US");
          case "shortName":
            return a.shortName.localeCompare(b.shortName);
          case "category":
            return a.category.localeCompare(b.category);
          default:
            return a.precedenceOrder - b.precedenceOrder;
        }
      });
  }, [
    medalTypes,
    category,
    search,
    sort,
    branchFilter,
    countryFilter,
    tierFilter,
    valorFilter,
    vDeviceFilter,
  ]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Page resets to 1 inline in filter onChange handlers below

  const [deletedMedals, setDeletedMedals] = useState<MedalRef[]>([]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete medal type",
      message: "Delete this medal type? This cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(id);
    const res = await fetch(`/api/medal-types/${id}`, { method: "DELETE" });
    if (res.ok) {
      const removed = medalTypes.find((m) => m._id === id);
      if (removed) {
        setDeletedMedals((prev) => {
          if (prev.some((d) => d.name === removed.name)) return prev;
          return [...prev, { name: removed.name, imageUrl: removed.imageUrl || "" }];
        });
      }
      setMedalTypes((prev) => prev.filter((m) => m._id !== id));
    }
    setDeleting(null);
  };

  // Medals not yet in the system — combine reference list with recently deleted
  const existingNames = new Set(medalTypes.map((m) => m.name));
  const refNames = new Set(US_MEDALS.map((m) => m.name));
  const extraDeleted = deletedMedals.filter((d) => !refNames.has(d.name));
  const allRefMedals = [...US_MEDALS, ...extraDeleted];
  const availableMedals = allRefMedals.filter((m) => !existingNames.has(m.name));

  const handleAddMedal = async () => {
    if (!selectedMedalToAdd) return;
    setAddingMedal(true);
    try {
      const shortName = selectedMedalToAdd
        .split(/[\s-]+/)
        .filter((w) => w.length > 1 || w === w.toUpperCase())
        .map((w) => w[0].toUpperCase())
        .join("");
      const res = await fetch("/api/medal-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedMedalToAdd,
          shortName,
          category: "other",
          basePoints: 0,
          valorPoints: 0,
          precedenceOrder: 999,
        }),
      });
      if (res.ok) {
        const newMedal = await res.json();
        setMedalTypes((prev) => [...prev, newMedal]);
        setSelectedMedalToAdd("");
      }
    } finally {
      setAddingMedal(false);
    }
  };

  if (loading) return <AdminLoader label="Loading medal types..." />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Medal Types ({medalTypes.length})</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoPopulate(true)}
            disabled={!can("/admin/medals", "canCreate")}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))", color: "#1a1a2e" }}
            >
              AI
            </span>
            Auto-Populate
          </button>
        </div>
      </div>

      {/* Add medal picker */}
      <div className="flex gap-2 items-center mb-6">
        <MedalPickerDropdown
          value={selectedMedalToAdd}
          options={availableMedals}
          onChange={setSelectedMedalToAdd}
        />
        <button
          type="button"
          onClick={handleAddMedal}
          disabled={!selectedMedalToAdd || addingMedal || !can("/admin/medals", "canCreate")}
          className="btn-primary text-sm shrink-0 inline-flex items-center justify-center gap-2 min-w-[4.5rem] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {addingMedal ? (
            <>
              <LoadingSpinner size="sm" />
              Adding…
            </>
          ) : (
            "Add"
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, short name, description, branch…"
              className="admin-input !pl-10 text-sm w-full"
            />
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="admin-input text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All branches</option>
            {medalBranches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All countries</option>
            {medalCountries.map((c) => (
              <option key={c} value={c}>{countryOptionLabel(c)}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="admin-input text-sm"
          >
            <option value="all">All tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
            <option value="4+">Tier 4+</option>
          </select>
          <select
            value={valorFilter}
            onChange={(e) => {
              setValorFilter(e.target.value as "all" | "valor" | "nonvalor");
              setPage(1);
            }}
            className="admin-input text-sm"
          >
            <option value="all">All point values</option>
            <option value="valor">Has base/valor points</option>
            <option value="nonvalor">Zero base &amp; valor points</option>
          </select>
          <select
            value={vDeviceFilter}
            onChange={(e) => {
              setVDeviceFilter(e.target.value as "all" | "requires" | "inherent");
              setPage(1);
            }}
            className="admin-input text-sm"
          >
            <option value="all">All V-device rules</option>
            <option value="requires">Requires V for valor</option>
            <option value="inherent">Inherently valor</option>
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}
            className="admin-input text-sm lg:col-span-2"
          >
            <option value="precedence">Sort: Precedence</option>
            <option value="points_desc">Sort: Base points high → low</option>
            <option value="points_asc">Sort: Base points low → high</option>
            <option value="valor_points_desc">Sort: Valor points high → low</option>
            <option value="tier_asc">Sort: Tier 1 first</option>
            <option value="category">Sort: Category A–Z</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="shortName">Sort: Short name A–Z</option>
            <option value="branch">Sort: Branch A–Z</option>
            <option value="country">Sort: Country code A–Z</option>
          </select>
        </div>

        {(
          search ||
          category !== "All" ||
          branchFilter !== "all" ||
          countryFilter !== "all" ||
          tierFilter !== "all" ||
          valorFilter !== "all" ||
          vDeviceFilter !== "all"
        ) && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              {filtered.length} of {medalTypes.length} medals
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
                setBranchFilter("all");
                setCountryFilter("all");
                setTierFilter("all");
                setValorFilter("all");
                setVDeviceFilter("all");
                setSort("precedence");
                setPage(1);
              }}
              className="text-xs text-[var(--color-gold)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Medal list */}
      <div className="space-y-2">
        {paginated.map((mt) => (
          <div
            key={mt._id}
            className="hero-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <MedalDisplayThumbRow
                imageUrl={mt.imageUrl}
                ribbonImageUrl={mt.ribbonImageUrl}
                wikiImages={mt.wikiImages}
                ribbonColors={mt.ribbonColors}
                shortName={mt.shortName}
                name={mt.name}
                borderColor="var(--color-border)"
              />

              {mt.ribbonImageUrl && (
                <SafeWikimediaImg
                  src={mt.ribbonImageUrl}
                  alt={`${mt.name} ribbon`}
                  className="h-5 w-10 object-contain rounded-sm shrink-0"
                  style={{ border: "1px solid rgba(128,128,128,0.15)" }}
                />
              )}

              <div className="min-w-0">
                <span className="font-semibold text-sm">{mt.name}</span>
                <span className="text-xs text-[var(--color-text-muted)] ml-2">
                  ({medalShortLabelForDisplay(mt.shortName, mt.name)})
                </span>
                {mt.branch !== "All" && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-2">
                    {mt.branch}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
              <span className="text-xs capitalize text-[var(--color-text-muted)]">
                {mt.category}
              </span>
              <span className="score-badge text-xs">{mt.valorPoints ?? mt.basePoints} pts</span>
              {mt.requiresValorDevice && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">V</span>
              )}
              {mt.inherentlyValor && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">VALOR</span>
              )}
              <span className="text-xs text-[var(--color-text-muted)]">
                #{mt.precedenceOrder}
              </span>
              {can("/admin/medals", "canEdit") ? (
                <Link
                  href={`/admin/medals/${mt._id}/edit`}
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
                onClick={() => {
                  setMergeSource(mt);
                  setMergeTarget(null);
                  setMergeStep("select");
                  setMergeSearch("");
                  setMergeError("");
                }}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Merge
              </button>
              <button
                onClick={() => handleDelete(mt._id)}
                className="btn-danger text-xs min-w-[4.25rem] inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={deleting === mt._id || !can("/admin/medals", "canDelete")}
              >
                {deleting === mt._id ? <LoadingSpinner size="xs" label="Deleting" /> : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      {/* Auto-populate modal */}
      {showAutoPopulate && (
        <AutoPopulateModal
          onClose={() => setShowAutoPopulate(false)}
          onComplete={(medals) => {
            setMedalTypes(medals);
          }}
        />
      )}

      {/* Merge modal */}
      {mergeSource && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setMergeSource(null)}
        >
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {mergeStep === "select" ? "Merge Medal" : "Confirm Merge"}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Merging: <strong>{mergeSource.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setMergeSource(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {mergeError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                  {mergeError}
                </div>
              )}

              {mergeStep === "select" && (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Select the target medal to merge <strong>{mergeSource.name}</strong> into:
                  </p>
                  <input
                    type="text"
                    placeholder="Search medals..."
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    className="admin-input text-sm w-full"
                    autoFocus
                  />
                  <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                    {medalTypes
                      .filter((mt) =>
                        mt._id !== mergeSource._id &&
                        (mergeSearch.trim() === "" ||
                          mt.name.toLowerCase().includes(mergeSearch.toLowerCase()) ||
                          mt.shortName.toLowerCase().includes(mergeSearch.toLowerCase()))
                      )
                      .map((mt) => (
                        <button
                          key={mt._id}
                          onClick={() => {
                            setMergeTarget(mt);
                            setMergeStep("confirm");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors flex items-center gap-3"
                        >
                          {mt.ribbonImageUrl ? (
                            <SafeWikimediaImg src={mt.ribbonImageUrl} alt="" className="w-8 h-3 object-contain" />
                          ) : (
                            <div className="w-8 h-3 bg-[var(--color-bg)] rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{mt.name}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {medalShortLabelForDisplay(mt.shortName, mt.name)} &middot; {mt.branch}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {mergeStep === "confirm" && mergeTarget && (
                <div className="space-y-4">
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-semibold">Delete:</span>
                      <span>{mergeSource.name}</span>
                    </div>
                    <div className="text-center text-[var(--color-text-muted)]">&darr; merge into &darr;</div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-semibold">Keep:</span>
                      <span>{mergeTarget.name}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    This will add &ldquo;{mergeSource.name}&rdquo; to {mergeTarget.name}&apos;s other names,
                    reassign all heroes that reference {mergeSource.name} to {mergeTarget.name},
                    and then delete {mergeSource.name}.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {mergeStep === "confirm" && mergeTarget && (
              <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
                <button
                  onClick={() => { setMergeStep("select"); setMergeError(""); }}
                  className="btn-secondary text-sm py-2 px-4"
                  disabled={merging}
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    setMerging(true);
                    setMergeError("");
                    try {
                      const res = await fetch(`/api/medal-types/${mergeSource._id}/merge`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetId: mergeTarget._id }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Merge failed");
                      // Remove source from list and refresh
                      setMedalTypes((prev) => prev.filter((mt) => mt._id !== mergeSource._id));
                      setMergeSource(null);
                    } catch (err) {
                      setMergeError(err instanceof Error ? err.message : "Merge failed");
                    } finally {
                      setMerging(false);
                    }
                  }}
                  className="btn-primary text-sm py-2 px-4 inline-flex items-center justify-center gap-2"
                  disabled={merging}
                >
                  {merging ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Merging…
                    </>
                  ) : (
                    "Confirm Merge"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {confirmDialog}
    </div>
  );
}
