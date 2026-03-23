"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import ImageUpload from "@/components/ui/ImageUpload";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { HERO_METADATA_TAGS, normalizeMetadataTags } from "@/lib/metadata-tags";

interface MedalTypeOption {
  _id: string;
  name: string;
  shortName: string;
  basePoints: number;
  precedenceOrder: number;
  ribbonColors: string[];
  ribbonImageUrl?: string;
  imageUrl?: string;
  otherNames?: string[];
}

interface DeviceImageData {
  url: string;
  deviceType: string;
  count: number;
}

interface MedalEntry {
  medalType: string;
  count: number;
  hasValor: boolean;
  valorDevices: number;
  arrowheads: number;
  deviceImages?: DeviceImageData[];
  wikiRibbonUrl?: string;
  wikiDeviceText?: string;
}

interface HeroFormData {
  name: string;
  rank: string;
  branch: string;
  avatarUrl: string;
  biography: string;
  wars: string;
  combatTours: number;
  hadCombatCommand: boolean;
  powHeroism: boolean;
  multiServiceOrMultiWar: boolean;
  published: boolean;
  orderOverride: string;
  medals: MedalEntry[];
  countryCode: string;
  metadataTags: string[];
  ownerUserId: string;
  adoptionExpiry: string;
  comparisonScore: string;
  combatAchievements: {
    type: string;
    confirmedKills: number;
    shipsSunk: number;
    majorEngagements: number;
    definingMissions: number;
  };
}

interface UnmatchedMedal {
  rawName: string;
  count: number;
  hasValor: boolean;
  arrowheads: number;
  devices: string;
  ribbonUrl?: string;
  wikiDeviceUrls?: string[];
  wikiOrder?: number;
  isOrphanedRibbon?: boolean; // ribbon cell with no medal name match
}

interface WikiRibbonCellData {
  ribbonUrl: string;
  deviceUrls: string[];
  name: string;
  _id: string;
  type: "ribbon" | "other";
  width?: number;
  height?: number;
  row?: number;
  _customInput?: boolean;
}

interface HeroFormProps {
  initialData?: Partial<HeroFormData> & {
    _id?: string;
    wikiRibbonRack?: {
      ribbonUrl: string;
      deviceUrls: string[];
      medalName?: string;
      medalType?: string | { _id: string };
      count?: number;
      hasValor?: boolean;
      arrowheads?: number;
      cellType?: "ribbon" | "other";
      imgWidth?: number;
      imgHeight?: number;
      scale?: number;
      row?: number;
    }[];
    ribbonMaxPerRow?: number;
    rackGap?: number;
    countryCode?: string;
    metadataTags?: string[];
    ownerUserId?: string;
    adoptionExpiry?: string;
    comparisonScore?: number | null;
  };
  isEdit?: boolean;
  importWikiUrl?: string;
}

/* ── Searchable medal select (Select2-style) ────────────── */
function MedalSelect({
  value,
  medalTypes,
  onChange,
}: {
  value: string;
  medalTypes: MedalTypeOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});

  const selected = medalTypes.find((t) => t._id === value);

  const filtered = query.trim()
    ? medalTypes.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.shortName.toLowerCase().includes(query.toLowerCase())
      )
    : medalTypes;

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      position: "fixed",
      top:   r.bottom + 4,
      left:  r.left,
      width: r.width,
      zIndex: 9999,
    });
  }, []);

  const openDropdown = () => {
    reposition();
    setQuery("");
    setOpen(true);
  };

  // Focus the search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const RibbonPreview = ({ colors, w = 48, h = 14 }: { colors: string[]; w?: number; h?: number }) => {
    const cols = colors.length > 0 ? colors : ["#808080"];
    return (
      <svg width={w} height={h} className="rounded shrink-0 overflow-hidden" style={{ display: "block" }}>
        {cols.map((c, i) => (
          <rect
            key={i}
            x={(w / cols.length) * i}
            y={0}
            width={w / cols.length}
            height={h}
            fill={c}
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="relative">
      {/* ── Trigger button ─────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="admin-input text-sm flex items-center gap-2 text-left cursor-pointer"
        style={{ minHeight: 36 }}
      >
        {selected ? (
          <>
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
            ) : (
              <RibbonPreview colors={selected.ribbonColors} w={48} h={14} />
            )}
            <span className="flex-1 truncate text-sm">{selected.name}</span>
            <span className="text-[var(--color-text-muted)] text-xs shrink-0 ml-auto">
              {selected.basePoints} pts
            </span>
          </>
        ) : (
          <span className="text-[var(--color-text-muted)] flex-1 text-sm">— Select medal —</span>
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

      {/* ── Dropdown via portal ─────────────────────── */}
      {open && createPortal(
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

          {/* Options list */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
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
              — Select medal —
            </button>

            {filtered.length === 0 && (
              <div style={{ padding: "12px 12px", color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center" }}>
                No medals found
              </div>
            )}

            {filtered.map((t) => {
              const isActive = t._id === value;
              return (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => { onChange(t._id); setOpen(false); }}
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
                  {/* Medal image or ribbon */}
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <RibbonPreview colors={t.ribbonColors} w={40} h={14} />
                  )}

                  {/* Name + short name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 500, color: isActive ? "var(--color-gold)" : "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                      {t.shortName}
                    </div>
                  </div>

                  {/* Points */}
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                    color: "var(--color-gold)",
                    background: "rgba(212,168,67,0.12)",
                    padding: "2px 7px", borderRadius: 6,
                  }}>
                    {t.basePoints} pts
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

/* ── Toggle switch ──────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-[var(--color-border)] last:border-0 text-left transition-colors hover:bg-[var(--color-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40"
    >
      {/* Track + knob — purely visual */}
      <div
        aria-hidden="true"
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? "bg-[var(--color-gold)]" : "bg-[var(--color-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${checked ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </button>
  );
}

/* ── Section header ─────────────────────────────────────── */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-[var(--color-gold)]">{title}</h2>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

const BRANCHES = [
  "U.S. Army",
  "U.S. Navy",
  "U.S. Marine Corps",
  "U.S. Air Force",
  "U.S. Coast Guard",
  "U.S. Space Force",
];

type WikiStatus = "idle" | "loading" | "success" | "error";

/** All known Wikipedia device image URLs */
const DEVICE_URLS: Record<string, string> = {
  // Oak Leaf Clusters (Army/Air Force)
  "silver-olc": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Silver_oakleaf-3d.svg/20px-Silver_oakleaf-3d.svg.png",
  "bronze-olc": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Bronze_oak_leaf-3d.svg/20px-Bronze_oak_leaf-3d.svg.png",
  // Service Stars (Navy/Marine/Coast Guard)
  "silver-star": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Silver-service-star-3d.svg/20px-Silver-service-star-3d.svg.png",
  "bronze-star": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Ribbonstar-bronze.svg/20px-Ribbonstar-bronze.svg.png",
  "gold-star": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/1_golden_star.svg/20px-1_golden_star.svg.png",
  // V Device (Valor)
  "valor-v": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/%22V%22_device%2C_brass.svg/20px-%22V%22_device%2C_brass.svg.png",
  // Arrowhead
  "arrowhead": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Arrowhead_device.svg/20px-Arrowhead_device.svg.png",
  // C Device (Combat)
  "c-device": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/%27C%27_Device.png/20px-%27C%27_Device.png",
  // R Device (Remote)
  "r-device": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/%27R%27_Device.png/20px-%27R%27_Device.png",
  // Fleet Marine Force Combat Operations Insignia
  "fleet-marine": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Fleet_Marine_Force_Combat_Insignia.svg/20px-Fleet_Marine_Force_Combat_Insignia.svg.png",
  // Operational Distinguishing Device
  "odd": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Operational_Distinguishing_Device.png/20px-Operational_Distinguishing_Device.png",
  // Award Numerals (0-9)
  "numeral-0": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Award_numeral_0.svg/20px-Award_numeral_0.svg.png",
  "numeral-1": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Award_numeral_1.png/20px-Award_numeral_1.png",
  "numeral-2": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Award_numeral_2.svg/20px-Award_numeral_2.svg.png",
  "numeral-3": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Award_numeral_3.svg/20px-Award_numeral_3.svg.png",
  "numeral-4": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Award_numeral_4.svg/20px-Award_numeral_4.svg.png",
  "numeral-5": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Award_numeral_5.png/20px-Award_numeral_5.png",
  "numeral-6": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Award_numeral_6.png/20px-Award_numeral_6.png",
  "numeral-7": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Award_numeral_7.svg/20px-Award_numeral_7.svg.png",
  "numeral-8": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Award_numeral_8.png/20px-Award_numeral_8.png",
  "numeral-9": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Award_numeral_9.png/20px-Award_numeral_9.png",
  // Hourglass Device
  "hourglass-bronze": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Hourglass_device_bronze.gif/20px-Hourglass_device_bronze.gif",
  "hourglass-gold": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Hourglass_Device_Gold.svg/20px-Hourglass_Device_Gold.svg.png",
  // M Device (Meritorious)
  "m-device": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Bronze_M_Device.svg/20px-Bronze_M_Device.svg.png",
  // N Device (Nuclear Deterrence)
  "n-device": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Nuclear_Deterrence_Operations_%27N%27_Device.png/20px-Nuclear_Deterrence_Operations_%27N%27_Device.png",
};

/** Device display names for UI */
const DEVICE_LABELS: Record<string, string> = {
  "silver-olc": "Silver Oak Leaf Cluster",
  "bronze-olc": "Bronze Oak Leaf Cluster",
  "silver-star": "Silver Service Star",
  "bronze-star": "Bronze Service Star",
  "gold-star": "Gold Service Star",
  "valor-v": "V Device (Valor)",
  "arrowhead": "Arrowhead",
  "c-device": "C Device (Combat)",
  "r-device": "R Device (Remote)",
  "fleet-marine": "Fleet Marine Force Insignia",
  "odd": "Operational Distinguishing Device",
  "hourglass-bronze": "Hourglass (Bronze)",
  "hourglass-gold": "Hourglass (Gold)",
  "m-device": "M Device (Meritorious)",
  "n-device": "N Device (Nuclear Deterrence)",
  "numeral-0": "Numeral 0",
  "numeral-1": "Numeral 1",
  "numeral-2": "Numeral 2",
  "numeral-3": "Numeral 3",
  "numeral-4": "Numeral 4",
  "numeral-5": "Numeral 5",
  "numeral-6": "Numeral 6",
  "numeral-7": "Numeral 7",
  "numeral-8": "Numeral 8",
  "numeral-9": "Numeral 9",
};

/** Classify a device image URL into a known device type */
function classifyDeviceUrl(url: string): string {
  // Oak Leaf Clusters
  if (/Silver_oakleaf|silver.*oak_leaf|Silver_oak/i.test(url)) return "silver-olc";
  if (/Bronze_oak_leaf|oak_leaf|oakleaf|Bronze-pointed/i.test(url)) return "bronze-olc";
  // Service Stars — silver first (more specific)
  if (/Silver-service-star|silver.*service.star|Award-star-silver/i.test(url)) return "silver-star";
  if (/golden_star|gold.*star|1_golden/i.test(url)) return "gold-star";
  if (/Bronze-service-star|Ribbonstar|ribbonbar|service.star|award.star|campaign.star/i.test(url)) return "bronze-star";
  // Letter devices
  if (/%22V%22_device|"V"_device|V_device.*brass/i.test(url)) return "valor-v";
  if (/'C'_Device|%27C%27_Device|C_Device/i.test(url)) return "c-device";
  if (/'R'_Device|%27R%27_Device|R_Device/i.test(url)) return "r-device";
  if (/Bronze_M_Device|M_Device/i.test(url)) return "m-device";
  if (/N%27_Device|'N'_Device|N_Device.*Nuclear/i.test(url)) return "n-device";
  // Other devices
  if (/arrowhead/i.test(url)) return "arrowhead";
  if (/Fleet_Marine/i.test(url)) return "fleet-marine";
  if (/Operational_Distinguishing/i.test(url)) return "odd";
  if (/Hourglass.*Gold/i.test(url)) return "hourglass-gold";
  if (/Hourglass/i.test(url)) return "hourglass-bronze";
  const numeralMatch = url.match(/Award_numeral[_\s]?(\d)/i);
  if (numeralMatch) return `numeral-${numeralMatch[1]}`;
  if (/Gcl-/i.test(url)) return "good-conduct-loop";
  return "unknown";
}

/** Which device types follow the 5:1 silver/bronze compaction rule */
const COMPACTABLE_SILVER: Record<string, string> = {
  "bronze-olc": "silver-olc",
  "bronze-star": "silver-star",
};

/** Recompact device URLs: recalculate silver/bronze counts from total, preserve other devices */
function recompactDeviceUrls(deviceUrls: string[]): string[] {
  // Group devices by type
  const groups: Record<string, string[]> = {};
  const orderSeen: string[] = [];
  for (const url of deviceUrls) {
    const t = classifyDeviceUrl(url);
    if (!groups[t]) { groups[t] = []; orderSeen.push(t); }
    groups[t].push(url);
  }
  const result: string[] = [];
  const handled = new Set<string>();
  // Process compactable pairs first (bronze/silver OLC, bronze/silver stars)
  for (const [bronzeType, silverType] of Object.entries(COMPACTABLE_SILVER)) {
    const bronzeCount = (groups[bronzeType] || []).length;
    const silverCount = (groups[silverType] || []).length;
    if (bronzeCount > 0 || silverCount > 0) {
      const totalAdditional = silverCount * 5 + bronzeCount;
      const newSilver = Math.floor(totalAdditional / 5);
      const newBronze = totalAdditional % 5;
      for (let i = 0; i < newSilver; i++) result.push(DEVICE_URLS[silverType]);
      for (let i = 0; i < newBronze; i++) result.push(DEVICE_URLS[bronzeType]);
      handled.add(bronzeType);
      handled.add(silverType);
    }
  }
  // Preserve all other device types in original order
  for (const t of orderSeen) {
    if (handled.has(t)) continue;
    for (const url of groups[t]) result.push(url);
    handled.add(t);
  }
  return result;
}

/* ── Main form ──────────────────────────────────────────── */
export default function HeroForm({ initialData, isEdit = false, importWikiUrl }: HeroFormProps) {
  const router = useRouter();
  const [medalTypes, setMedalTypes] = useState<MedalTypeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Wikipedia import state
  const [wikiUrl, setWikiUrl] = useState("");
  const [wikiPageUrl, setWikiPageUrl] = useState(""); // URL currently shown in iframe
  const [showWikiPage, setShowWikiPage] = useState(false);
  const [wikiStatus, setWikiStatus] = useState<WikiStatus>("idle");
  const [wikiError, setWikiError] = useState("");
  const [wikiProgress, setWikiProgress] = useState("");
  const [wikiUnmatched, setWikiUnmatched] = useState<UnmatchedMedal[]>([]);
  const [wikiNewTypes, setWikiNewTypes] = useState(0);
  const [mergingIndex, setMergingIndex] = useState<number | null>(null);
  const [mergingRibbonIdx, setMergingRibbonIdx] = useState<number | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState<{ cellIdx: number; targetId: string; targetName: string } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragGroup, setDragGroup] = useState<"ribbon" | "other" | null>(null);
  // Add Medal state
  const [showAddMedal, setShowAddMedal] = useState(false);
  const [addMedalSearch, setAddMedalSearch] = useState("");
  const [addMedalId, setAddMedalId] = useState("");
  // Add Device state — selectedRibbonIdx is the index in wikiRibbonCells
  const [selectedRibbonIdx, setSelectedRibbonIdx] = useState<number | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [addDeviceType, setAddDeviceType] = useState("bronze-olc");
  const [addDeviceCount, setAddDeviceCount] = useState(1);
  // Initialize wikiRibbonCells from saved data, mapping DB field names to form fields
  const initCells: WikiRibbonCellData[] = initialData?.wikiRibbonRack?.map((c) => ({
    ribbonUrl: c.ribbonUrl,
    deviceUrls: c.deviceUrls || [],
    name: c.medalName || "",
    _id: typeof c.medalType === "object" ? c.medalType._id : (c.medalType || ""),
    type: (c.cellType || "ribbon") as "ribbon" | "other",
    width: c.imgWidth,
    height: c.imgHeight,
    row: c.row,
  })) || [];

  // Initialize otherScales from saved scale values
  const initScales: Record<number, number> = {};
  if (initialData?.wikiRibbonRack) {
    initialData.wikiRibbonRack.forEach((c, i) => {
      if (c.scale && c.scale !== 1) initScales[i] = c.scale;
    });
  }

  const [otherScales, setOtherScales] = useState<Record<number, number>>(initScales);
  const [rackGap, setRackGap] = useState(initialData?.rackGap ?? 8);
  const [ribbonMaxPerRow, setRibbonMaxPerRow] = useState(initialData?.ribbonMaxPerRow || 4);
  const [wikiMedalOrder, setWikiMedalOrder] = useState<Map<string, number>>(new Map());
  const [wikiMedalNames, setWikiMedalNames] = useState<{ name: string; devices: string }[]>([]);
  const [wikiRibbonCells, setWikiRibbonCells] = useState<WikiRibbonCellData[]>(initCells);

  // AI description generation
  const [aiGenLoading, setAiGenLoading] = useState(false);

  const [form, setForm] = useState<HeroFormData>({
    name: initialData?.name || "",
    rank: initialData?.rank || "",
    branch: initialData?.branch || "U.S. Army",
    avatarUrl: initialData?.avatarUrl || "",
    biography: initialData?.biography || "",
    wars: Array.isArray(initialData?.wars)
      ? initialData.wars.join(", ")
      : initialData?.wars || "",
    combatTours: initialData?.combatTours || 0,
    hadCombatCommand: initialData?.hadCombatCommand || false,
    powHeroism: initialData?.powHeroism || false,
    multiServiceOrMultiWar: initialData?.multiServiceOrMultiWar || false,
    published: initialData?.published || false,
    orderOverride: initialData?.orderOverride?.toString() || "",
    medals: initialData?.medals || [],
    combatAchievements: initialData?.combatAchievements || {
      type: "none",
      confirmedKills: 0,
      shipsSunk: 0,
      majorEngagements: 0,
      definingMissions: 0,
    },
    countryCode: initialData?.countryCode || "US",
    metadataTags: Array.isArray(initialData?.metadataTags) ? [...initialData!.metadataTags!] : [],
    ownerUserId: initialData?.ownerUserId
      ? typeof initialData.ownerUserId === "object" && initialData.ownerUserId !== null && "_id" in initialData.ownerUserId
        ? String((initialData.ownerUserId as { _id: string })._id)
        : String(initialData.ownerUserId)
      : "",
    adoptionExpiry: initialData?.adoptionExpiry
      ? new Date(initialData.adoptionExpiry).toISOString().slice(0, 10)
      : "",
    comparisonScore:
      initialData?.comparisonScore != null && String(initialData.comparisonScore).trim() !== ""
        ? String(initialData.comparisonScore)
        : "",
  });

  const set = <K extends keyof HeroFormData>(key: K, value: HeroFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    fetch("/api/medal-types")
      .then((r) => r.json())
      .then((data) => setMedalTypes(Array.isArray(data) ? data : []));
  }, []);

  // Once medalTypes load, update wikiRibbonCells names from DB for matched items
  useEffect(() => {
    if (medalTypes.length === 0 || wikiRibbonCells.length === 0) return;
    setWikiRibbonCells((prev) => {
      let changed = false;
      const updated = prev.map((cell) => {
        if (!cell._id) return cell;
        const dbMedal = medalTypes.find((t) => t._id === cell._id);
        if (dbMedal && dbMedal.name !== cell.name) {
          changed = true;
          return { ...cell, name: dbMedal.name };
        }
        return cell;
      });
      return changed ? updated : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medalTypes]);

  // Auto-trigger import when importWikiUrl is provided (from admin suggestions accept)
  const autoImportTriggered = useRef(false);
  useEffect(() => {
    if (importWikiUrl && !autoImportTriggered.current && wikiStatus === "idle") {
      autoImportTriggered.current = true;
      setWikiUrl(importWikiUrl);
    }
  }, [importWikiUrl, wikiStatus]);

  // Trigger the actual import once wikiUrl is set from importWikiUrl
  useEffect(() => {
    if (importWikiUrl && wikiUrl === importWikiUrl && wikiStatus === "idle" && autoImportTriggered.current) {
      handleWikiImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wikiUrl]);


  // ── Unmatched medal handlers ────────────────────────────

  const handleAddUnmatched = async (idx: number) => {
    const medal = wikiUnmatched[idx];
    const maxPrec = medalTypes.reduce((max, t) => Math.max(max, t.precedenceOrder || 0), 0);
    const shortName = medal.rawName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 6);

    const res = await fetch("/api/medal-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: medal.rawName,
        shortName,
        category: "other" as const,
        basePoints: 0,
        valorPoints: 0,
        tier: 99,
        branch: "All",
        precedenceOrder: maxPrec + 1,
        description: "Created during hero import",
        ribbonColors: ["#808080"],
      }),
    });

    if (!res.ok) return;
    const newType = await res.json();

    // Refresh medal types list
    const mtRes = await fetch("/api/medal-types");
    const mtData = await mtRes.json();
    if (Array.isArray(mtData)) setMedalTypes(mtData);

    // Add to hero form
    setForm((prev) => ({
      ...prev,
      medals: [...prev.medals, {
        medalType: newType._id,
        count: medal.count || 1,
        hasValor: medal.hasValor || false,
        valorDevices: medal.hasValor ? 1 : 0,
        arrowheads: medal.arrowheads || 0,
        deviceImages: [],
      }],
    }));

    setWikiUnmatched((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMergeSelect = (idx: number, targetId: string) => {
    const medal = wikiUnmatched[idx];
    if (!targetId) return;

    // Add name to target's otherNames for future matching
    fetch(`/api/medal-types/${targetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        $addToSet: { otherNames: medal.rawName },
      }),
    });

    // Add to hero form or merge into existing entry
    setForm((prev) => {
      const existingIdx = prev.medals.findIndex((m) => m.medalType === targetId);
      if (existingIdx >= 0) {
        const medals = [...prev.medals];
        medals[existingIdx] = {
          ...medals[existingIdx],
          count: Math.max(medals[existingIdx].count, medal.count || 1),
          hasValor: medals[existingIdx].hasValor || medal.hasValor,
        };
        return { ...prev, medals };
      }
      return {
        ...prev,
        medals: [...prev.medals, {
          medalType: targetId,
          count: medal.count || 1,
          hasValor: medal.hasValor || false,
          valorDevices: medal.hasValor ? 1 : 0,
          arrowheads: medal.arrowheads || 0,
          deviceImages: [],
        }],
      };
    });

    setWikiUnmatched((prev) => prev.filter((_, i) => i !== idx));
    setMergingIndex(null);
  };

  type CombatType =
  | "none"
  | "infantry"
  | "armor"
  | "artillery"
  | "aviation"
  | "airborne"
  | "special_operations"
  | "submarine"
  | "surface"
  | "amphibious"
  | "reconnaissance"
  | "air_defense"
  | "engineering"
  | "signal"
  | "intelligence"
  | "medical"
  | "logistics"
  | "chemical"
  | "electronic_warfare"
  | "cyber"
  | "military_police"
  | "ordnance"
  | "sniper"
  | "marine";

function normalizeCombatType(input: unknown): CombatType {
  if (typeof input !== "string") return "none";

  const v = input.trim().toLowerCase();

  if (/fighter|pilot|aviation|aircraft|ace/.test(v)) return "aviation";
  if (/submarine|uboat|u-boat/.test(v)) return "submarine";
  if (/infantry|rifle|ground|foot soldier/.test(v)) return "infantry";
  if (/armor|tank|cavalry/.test(v)) return "armor";
  if (/artillery|gun|howitzer/.test(v)) return "artillery";
  if (/airborne|paratroop/.test(v)) return "airborne";
  if (/special|commando|ranger|seal|sf\b/.test(v)) return "special_operations";
  if (/surface|destroyer|cruiser|battleship/.test(v)) return "surface";
  if (/sniper|marksman/.test(v)) return "sniper";
  if (/\bmarine\b|usmc|leatherneck/.test(v)) return "marine";
  if (/recon|scout/.test(v)) return "reconnaissance";
  if (/engineer/.test(v)) return "engineering";
  if (/medical|medic|doctor|nurse/.test(v)) return "medical";
  if (/intelligence|intel|oss|cia/.test(v)) return "intelligence";
  if (/signal|communications|radio/.test(v)) return "signal";
  if (/cyber/.test(v)) return "cyber";

  return "none";
}

  const handleWikiImport = async () => {
  if (!wikiUrl.trim()) return;

  setWikiStatus("loading");
  setWikiError("");
  setWikiProgress("Starting import...");
  setWikiUnmatched([]);
  setWikiNewTypes(0);

  try {
    // 1. Enqueue the job
    const enqueueRes = await fetch("/api/scrape/wikipedia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: wikiUrl.trim() }),
    });
    const enqueueData = await enqueueRes.json();
    if (!enqueueRes.ok) throw new Error(enqueueData.error || "Failed to start import");
    const { jobId } = enqueueData;

    // 2. Poll for job completion
    const data = await (async () => {
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/import-status?jobId=${jobId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          return statusData.result;
        }
        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Import failed");
        }

        // Update progress message
        if (statusData.progress?.step) {
          setWikiProgress(statusData.progress.step);
        }
      }
    })();
    console.log("Import result:", data);

    /* ──────────────────────
       MEDALS (extracted by AI)
    ────────────────────── */

    const medalMap = new Map<string, MedalEntry>();

    if (Array.isArray(data.aiMedals)) {
      for (const m of data.aiMedals) {
        medalMap.set(m.medalTypeId, {
          medalType: m.medalTypeId,
          count: m.count || 1,
          hasValor: m.hasValor || false,
          valorDevices: m.valorDevices || 0,
          arrowheads: m.arrowheads || 0,
          deviceImages: m.deviceImages || [],
          wikiRibbonUrl: m.ribbonUrl || undefined,
        });
      }
    }

    const unmatched: UnmatchedMedal[] = Array.isArray(data.unmatchedMedals)
      ? data.unmatchedMedals.filter(
          (m: unknown): m is UnmatchedMedal => m !== null && typeof m === "object" && "rawName" in m,
        )
      : [];

    /* ──────────────────────
       WARS
    ────────────────────── */

    const aiWars =
      Array.isArray(data.aiWars) && data.aiWars.length > 0
        ? data.aiWars
        : data.wars || [];

    /* ──────────────────────
       COMBAT SPECIALTY
    ────────────────────── */

    // Prefer AI-determined specialty, fall back to scraper detection, then normalize
    const importedCombatType =
      (data.aiCombatSpecialty && data.aiCombatSpecialty !== "none" ? data.aiCombatSpecialty : null) ||
      (data.combatType && data.combatType !== "none" ? data.combatType : null) ||
      normalizeCombatType(data.biography || "");

    // Re-fetch medal types to pick up updated ribbon image URLs
    const mtRes = await fetch("/api/medal-types");
    const mtData = await mtRes.json();
    if (Array.isArray(mtData)) setMedalTypes(mtData);
    setWikiNewTypes(data.newMedalTypesCreated || 0);

    // Ribbon layout from Wikipedia
    if (typeof data.ribbonMaxPerRow === "number" && data.ribbonMaxPerRow >= 2) {
      setRibbonMaxPerRow(data.ribbonMaxPerRow);
    }
    if (Array.isArray(data.aiMedals)) {
      const orderMap = new Map<string, number>();
      for (const m of data.aiMedals) {
        if (m.medalTypeId && typeof m.wikiOrder === "number" && m.wikiOrder > 0) {
          orderMap.set(m.medalTypeId, m.wikiOrder);
        }
      }
      setWikiMedalOrder(orderMap);
    }

    setForm((prev) => ({
      ...prev,

      name: data.name || prev.name,
      rank: data.rank || prev.rank,
      branch: data.branch || prev.branch,
      avatarUrl: data.avatarUrl || prev.avatarUrl,
      biography: data.aiDescription || data.biography || prev.biography,

      wars: aiWars.join(", ") || prev.wars,
      multiServiceOrMultiWar:
        aiWars.length > 1 ||
        (data.multiServiceOrMultiWar ?? prev.multiServiceOrMultiWar),

      combatAchievements: {
        ...prev.combatAchievements,

        type: importedCombatType,

        confirmedKills:
          typeof data.confirmedKills === "number"
            ? data.confirmedKills
            : prev.combatAchievements.confirmedKills,

        shipsSunk:
          typeof data.shipsSunk === "number"
            ? data.shipsSunk
            : prev.combatAchievements.shipsSunk,

        majorEngagements:
          typeof data.majorEngagements === "number"
            ? data.majorEngagements
            : prev.combatAchievements.majorEngagements,

        definingMissions:
          typeof data.definingMissions === "number"
            ? data.definingMissions
            : prev.combatAchievements.definingMissions,
      },

      medals: Array.from(medalMap.values()),

      metadataTags:
        Array.isArray(data.metadataTags) && data.metadataTags.length > 0
          ? normalizeMetadataTags([...prev.metadataTags, ...data.metadataTags])
          : prev.metadataTags,

      countryCode: (() => {
        const cc =
          data.countryCode && typeof data.countryCode === "string"
            ? data.countryCode.toUpperCase()
            : "";
        const allowed = new Set(["US", "UK", "CA", "AU", "NZ", "ZA", "IN"]);
        return cc && allowed.has(cc) ? cc : prev.countryCode;
      })(),
    }));

    // Store wiki medal names from medalCells for name selection dropdown
    if (Array.isArray(data.wikiMedalNames)) {
      setWikiMedalNames(data.wikiMedalNames);
    }

    // Store wiki ribbon rack cells with DB-matched name and _id
    const rawCells: WikiRibbonCellData[] = Array.isArray(data.wikiRibbonRack)
      ? data.wikiRibbonRack.map((c: { ribbonUrl: string; deviceUrls?: string[]; name?: string; _id?: string; type?: "ribbon" | "other"; width?: number; height?: number }) => ({
          ribbonUrl: c.ribbonUrl,
          deviceUrls: c.deviceUrls || [],
          name: c.name || "",
          _id: c._id || "",
          type: c.type || "ribbon" as const,
          width: c.width,
          height: c.height,
        }))
      : [];
    // Try to match unmatched items (especially "other") against DB by name
    if (Array.isArray(data.wikiMedalNames)) {
      const medalNamesList: { name: string; devices: string }[] = data.wikiMedalNames;
      // Build name→DB medal lookup
      const nameToMedal = new Map<string, { _id: string; name: string }>();
      for (const mt of medalTypes) {
        nameToMedal.set(mt.name.toLowerCase(), { _id: mt._id, name: mt.name });
        if (mt.otherNames) {
          for (const alias of mt.otherNames) {
            nameToMedal.set(alias.toLowerCase(), { _id: mt._id, name: mt.name });
          }
        }
      }
      // For unmatched cells, try to find a name from wikiMedalNames that matches a DB entry
      for (const cell of rawCells) {
        if (cell._id) continue; // already matched
        // Try the cell's current name first
        if (cell.name) {
          const dbMatch = nameToMedal.get(cell.name.toLowerCase());
          if (dbMatch) {
            cell._id = dbMatch._id;
            cell.name = dbMatch.name;
            continue;
          }
        }
        // Unmatched cells keep name="" — admin selects from dropdown
      }
    }

    // Auto-assign rows to "other" items so no row exceeds ribbon row width
    const maxRowWidth = 4 * 92; // must match ribbon grid width
    const otherGap = 8;
    let currentRow = 0;
    let currentRowWidth = 0;
    for (const cell of rawCells) {
      if (cell.type !== "other") continue;
      const w = cell.width || 100;
      const needed = currentRowWidth > 0 ? w + otherGap : w;
      if (currentRowWidth + needed > maxRowWidth && currentRowWidth > 0) {
        currentRow++;
        currentRowWidth = w;
      } else {
        currentRowWidth += needed;
      }
      cell.row = currentRow;
    }
    setWikiRibbonCells(rawCells);

    // Unmatched medals are now handled via ribbon rack name dropdowns
    setWikiUnmatched(unmatched);
    setWikiStatus("success");
  } catch (err) {
    setWikiError(err instanceof Error ? err.message : "Import failed");
    setWikiStatus("error");
  }
};

  const handleAIDescription = async () => {
    if (!form.name.trim()) {
      setError("Enter a hero name first before generating a description.");
      return;
    }
    setAiGenLoading(true);
    setError("");
    try {
      const currentMedalNames = form.medals
        .map((m) => {
          const mt = medalTypes.find((t) => t._id === m.medalType);
          return mt ? `${mt.name} x${m.count}${m.hasValor ? " (V)" : ""}` : "";
        })
        .filter(Boolean)
        .join(", ");

      const scrapedData = [
        `Name: ${form.name}`,
        `Rank: ${form.rank}`,
        `Branch: ${form.branch}`,
        form.wars ? `Wars: ${form.wars}` : "",
        form.biography ? `Existing bio: ${form.biography}` : "",
        currentMedalNames ? `Known medals: ${currentMedalNames}` : "",
      ].filter(Boolean).join("\n");

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

      // Update biography
      if (data.description) set("biography", data.description);

      // Update wars if AI found them and the field is empty
      if (Array.isArray(data.wars) && data.wars.length > 0 && !form.wars.trim()) {
        set("wars", data.wars.join(", "));
      }

      // Add new medals from AI (don't replace existing ones)
      if (Array.isArray(data.medals) && data.medals.length > 0) {
        const existingIds = new Set(form.medals.map((m) => m.medalType));
        const newMedals = data.medals
          .filter((m: { medalTypeId: string }) => !existingIds.has(m.medalTypeId))
          .map((m: { medalTypeId: string; count?: number; hasValor?: boolean; valorDevices?: number; arrowheads?: number; deviceImages?: DeviceImageData[] }) => ({
            medalType: m.medalTypeId,
            count: m.count || 1,
            hasValor: m.hasValor || false,
            valorDevices: m.valorDevices || 0,
            arrowheads: m.arrowheads || 0,
            deviceImages: m.deviceImages || [],
          }));
        if (newMedals.length > 0) {
          setForm((prev) => ({ ...prev, medals: [...prev.medals, ...newMedals] }));
        }
      }

      if (Array.isArray(data.metadataTags) && data.metadataTags.length > 0) {
        const merged = normalizeMetadataTags([...form.metadataTags, ...data.metadataTags]);
        setForm((prev) => ({ ...prev, metadataTags: merged }));
      }
      if (data.countryCode && typeof data.countryCode === "string") {
        const cc = data.countryCode.toUpperCase();
        const ok = new Set(["US", "UK", "CA", "AU", "NZ", "ZA", "IN"]);
        setForm((prev) => ({ ...prev, countryCode: ok.has(cc) ? cc : prev.countryCode }));
      }
      const cs = data.combatSpecialty;
      if (cs && typeof cs === "string" && cs !== "none") {
        setForm((prev) => ({
          ...prev,
          combatAchievements: { ...prev.combatAchievements, type: cs },
        }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const SKIP_WORDS = new Set(["of", "the", "and", "for", "with", "in", "to", "a"]);
      const makeShortName = (n: string): string => {
        const words = n.split(/\s+/).filter((w) => !SKIP_WORDS.has(w.toLowerCase()));
        if (words.length === 0) return "?";
        if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
        return words.map((w) => (w[0] || "").toUpperCase()).join("").slice(0, 6);
      };

      const maxPrec = medalTypes.reduce((max, t) => Math.max(max, t.precedenceOrder || 0), 0);
      let precCounter = 0;

      // Build a name→devices lookup from wikiMedalNames
      const medalDevicesMap = new Map<string, string>();
      for (const m of wikiMedalNames) {
        if (m.devices && !medalDevicesMap.has(m.name.toLowerCase())) {
          medalDevicesMap.set(m.name.toLowerCase(), m.devices);
        }
      }

      // Parse device text into structured data
      const parseDevices = (name: string) => {
        const devText = medalDevicesMap.get(name.toLowerCase()) || "";
        if (!devText) return { count: 1, hasValor: false, arrowheads: 0 };
        const hasValor = /\bvalor\b|"v"|"v"\s*device|\bv\s+device\b/i.test(devText);
        const arrowMatch = devText.match(/(\d+)\s*arrowhead/i);
        const arrowheads = arrowMatch ? parseInt(arrowMatch[1]) : /\barrowhead\b/i.test(devText) ? 1 : 0;
        // Count from text like "with two Oak Leaf Clusters" or "3rd award"
        const countWords: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        let count = 1;
        const numMatch = devText.match(/(\d+)(?:st|nd|rd|th)?\s*(?:award|oak leaf|bronze)/i);
        if (numMatch) count = parseInt(numMatch[1]);
        for (const [word, val] of Object.entries(countWords)) {
          if (new RegExp(`\\b${word}\\b`, "i").test(devText)) { count = val; break; }
        }
        return { count, hasValor, arrowheads };
      };

      // Build medals from ALL ribbon rack items (ribbons + other items).
      // Items with _id are already in DB. Items without _id need new medal types created.
      const rackMedals: MedalEntry[] = [];
      for (const cell of wikiRibbonCells) {
        if (!cell.ribbonUrl || isBlankImage(cell.ribbonUrl)) continue;
        const devInfo = parseDevices(cell.name);

        const devText = medalDevicesMap.get(cell.name.toLowerCase()) || "";

        if (cell._id) {
          // Derive count/hasValor/arrowheads from actual device URLs
          const silverOlc = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "silver-olc").length;
          const bronzeOlc = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "bronze-olc").length;
          const deviceValor = cell.deviceUrls.some((u) => classifyDeviceUrl(u) === "valor-v");
          const deviceArrowheads = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "arrowhead").length;
          const olcTotal = silverOlc * 5 + bronzeOlc;
          // Use device-derived data when devices exist, otherwise fall back to text parsing
          const finalCount = olcTotal > 0 ? olcTotal + 1 : devInfo.count;
          const finalValor = deviceValor || devInfo.hasValor;
          const finalArrowheads = deviceArrowheads > 0 ? deviceArrowheads : devInfo.arrowheads;
          rackMedals.push({
            medalType: cell._id,
            count: finalCount,
            hasValor: finalValor,
            valorDevices: finalValor ? 1 : 0,
            arrowheads: finalArrowheads,
            deviceImages: cell.deviceUrls.map((url) => ({
              url,
              deviceType: classifyDeviceUrl(url),
              count: 1,
            })),
            wikiRibbonUrl: cell.ribbonUrl,
            wikiDeviceText: devText,
          });
        } else if (cell.name) {
          // Unmatched but user selected a name — create new medal type
          const res = await fetch("/api/medal-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cell.name,
              shortName: makeShortName(cell.name),
              category: "other",
              basePoints: 0,
              valorPoints: 0,
              tier: 99,
              branch: "All",
              precedenceOrder: maxPrec + 1 + precCounter++,
              description: "Created during hero import",
              ribbonColors: ["#808080"],
              ribbonImageUrl: cell.ribbonUrl,
            }),
          });
          if (res.ok) {
            const newType = await res.json();
            const nSilverOlc = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "silver-olc").length;
            const nBronzeOlc = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "bronze-olc").length;
            const nDeviceValor = cell.deviceUrls.some((u) => classifyDeviceUrl(u) === "valor-v");
            const nDeviceArrowheads = cell.deviceUrls.filter((u) => classifyDeviceUrl(u) === "arrowhead").length;
            const nOlcTotal = nSilverOlc * 5 + nBronzeOlc;
            const nFinalCount = nOlcTotal > 0 ? nOlcTotal + 1 : devInfo.count;
            const nFinalValor = nDeviceValor || devInfo.hasValor;
            const nFinalArrowheads = nDeviceArrowheads > 0 ? nDeviceArrowheads : devInfo.arrowheads;
            rackMedals.push({
              medalType: newType._id,
              count: nFinalCount,
              hasValor: nFinalValor,
              valorDevices: nFinalValor ? 1 : 0,
              arrowheads: nFinalArrowheads,
              deviceImages: cell.deviceUrls.map((url) => ({
                url,
                deviceType: classifyDeviceUrl(url),
                count: 1,
              })),
              wikiRibbonUrl: cell.ribbonUrl,
              wikiDeviceText: devText,
            });
          }
        }
      }

      // Merge: ribbon rack medals + any form medals not already covered
      const rackTypeIds = new Set(rackMedals.map((m) => m.medalType));
      const existingMedals = form.medals.filter((m) => !rackTypeIds.has(m.medalType));
      const allMedals = [...existingMedals, ...rackMedals];

      // Build wikiRibbonRack for persistence from current cells
      const savedWikiRibbonRack = wikiRibbonCells
        .filter((c) => c.ribbonUrl && !isBlankImage(c.ribbonUrl))
        .map((c) => ({
          ribbonUrl: c.ribbonUrl,
          deviceUrls: c.deviceUrls,
          medalName: c.name || "",
          medalType: c._id || undefined,
          cellType: c.type,
          imgWidth: c.width,
          imgHeight: c.height,
          scale: c.type === "other" ? (otherScales[wikiRibbonCells.indexOf(c)] ?? 1) : 1,
          row: c.row ?? 0,
          count: 1,
          hasValor: false,
          arrowheads: 0,
        }));

      const body = {
        ...form,
        medals: allMedals,
        wars: form.wars.split(",").map((w) => w.trim()).filter(Boolean),
        orderOverride: form.orderOverride ? parseInt(form.orderOverride) : null,
        recalculateScore: true,
        wikiRibbonRack: savedWikiRibbonRack,
        ribbonMaxPerRow,
        rackGap,
        countryCode: form.countryCode || "US",
        metadataTags: form.metadataTags,
        ownerUserId: form.ownerUserId.trim() || null,
        adoptionExpiry: form.adoptionExpiry ? new Date(form.adoptionExpiry) : null,
        comparisonScore:
          form.comparisonScore.trim() === "" ? null : Number(form.comparisonScore),
      };

      const url = isEdit ? `/api/heroes/${initialData?._id}` : "/api/heroes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push("/admin/heroes");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Build ribbon rack preview from wikiRibbonRack data.
  // "other" items (badges, tabs, insignia) go above ribbons with actual sizes.
  // "ribbon" items use standard ribbon dimensions in the RibbonRack component.
  const otherItems: (WikiRibbonCellData & { cellIdx: number })[] = [];
  const ribbonItems: (WikiRibbonCellData & { cellIdx: number })[] = [];

  // Compute names already matched to DB (used by matched ribbon rack items)
  const matchedNames = new Set(
    wikiRibbonCells.filter((c) => c._id).map((c) => c.name.toLowerCase())
  );
  // Available medal names for unmatched items = medalCells names minus matched ones
  const availableMedalNames = wikiMedalNames
    .filter((m) => !matchedNames.has(m.name.toLowerCase()))
    .filter((m, i, arr) => arr.findIndex((a) => a.name === m.name) === i);
  // Also exclude names already picked by user on other unmatched cells
  const pickedNames = new Set(
    wikiRibbonCells
      .filter((c) => !c._id && c.name)
      .map((c) => c.name)
  );

  // Filter out blank/white placeholder images
  const isBlankImage = (url: string) =>
    /spacer|pixel|transparent|blank|white/i.test(url) ||
    /1px-|2px-/i.test(url);

  for (let idx = 0; idx < wikiRibbonCells.length; idx++) {
    const cell = wikiRibbonCells[idx];
    if (!cell.ribbonUrl || isBlankImage(cell.ribbonUrl)) continue;

    if (cell.type === "other") {
      otherItems.push({ ...cell, cellIdx: idx });
    } else {
      ribbonItems.push({ ...cell, cellIdx: idx });
    }
  }

  return (
    <div className="flex gap-4 items-start">
    <form onSubmit={handleSubmit} className={`space-y-4 sm:space-y-5 ${showWikiPage ? "w-1/2 min-w-0" : "max-w-3xl"}`}>

      {/* ── § 0 Wikipedia Import ─────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader
          title="Import from Wikipedia"
          sub="Paste a Wikipedia URL to auto-populate hero data. Matched medals replace the current list."
        />
        <div className="flex gap-2">
          <input
            type="url"
            value={wikiUrl}
            onChange={(e) => setWikiUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/Audie_Murphy"
            className="admin-input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleWikiImport}
            disabled={wikiStatus === "loading" || !wikiUrl.trim()}
            className="btn-secondary whitespace-nowrap text-sm"
          >
            {wikiStatus === "loading" ? (wikiProgress || "Importing…") : "Import"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (wikiUrl.trim()) {
                setWikiPageUrl(wikiUrl.trim());
                setShowWikiPage(true);
              }
            }}
            disabled={!wikiUrl.trim()}
            className="btn-secondary whitespace-nowrap text-sm"
          >
            {showWikiPage ? "Refresh" : "View Page"}
          </button>
        </div>

        {wikiStatus === "error" && (
          <p className="text-sm text-red-500 mt-2">{wikiError}</p>
        )}

        {wikiStatus === "success" && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-green-500">
              Data imported — review fields below and save when ready.
            </p>
            {wikiNewTypes > 0 && (
              <p className="text-sm text-blue-400">
                {wikiNewTypes} new medal type{wikiNewTypes > 1 ? "s" : ""} auto-created in database.
              </p>
            )}
            {wikiUnmatched.length > 0 && (
              <div className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg p-3">
                <p className="font-semibold mb-2">
                  {wikiUnmatched.length} medal{wikiUnmatched.length > 1 ? "s" : ""} not found in database:
                </p>
                <div className="space-y-2">
                  {wikiUnmatched.map((medal, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span className="flex-1 min-w-0 truncate">
                        {medal.rawName}
                        {medal.count > 1 && (
                          <span className="text-yellow-400/60 ml-1">×{medal.count}</span>
                        )}
                      </span>
                      {mergingIndex === i ? (
                        <div className="flex items-center gap-1">
                          <div className="w-56">
                            <MedalSelect
                              value=""
                              medalTypes={medalTypes}
                              onChange={(id) => handleMergeSelect(i, id)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setMergingIndex(null)}
                            className="px-1.5 py-0.5 text-xs rounded text-yellow-400/60 hover:text-yellow-400"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddUnmatched(i)}
                            className="px-2 py-0.5 text-xs rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setMergingIndex(i)}
                            className="px-2 py-0.5 text-xs rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                          >
                            Merge
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── § 1 Basic Information ───────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader title="Basic Information" />

        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback name={form.name || "Hero"} size={96} shape="rounded" />
              )}
            </div>
            <ImageUpload
              value={form.avatarUrl}
              onChange={(url) => set("avatarUrl", url)}
              folder="Heroes/Heroes"
              label="Photo"
            />
          </div>

          {/* Fields */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="admin-input"
                placeholder="e.g. Audie Murphy"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Rank <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.rank}
                onChange={(e) => set("rank", e.target.value)}
                className="admin-input"
                placeholder="e.g. Second Lieutenant"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Branch
              </label>
              <select
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                className="admin-input"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Biography
            </label>
            <button
              type="button"
              onClick={handleAIDescription}
              disabled={aiGenLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] hover:bg-[var(--color-gold)]/5 transition-colors"
              title="Generate biography using AI (requires hero name)"
            >
              {aiGenLoading ? (
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
            value={form.biography}
            onChange={(e) => set("biography", e.target.value)}
            className="admin-input"
            rows={5}
            placeholder="Write a brief biography describing this hero's service, key actions, and legacy..."
          />
        </div>
      </section>

      {/* ── § 2 Awards & Medals ─────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Awards & Medals" sub="Medals are managed via the ribbon rack below." />
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowAddMedal((v) => !v); setAddMedalSearch(""); setAddMedalId(""); }}
              className="btn-primary text-sm shrink-0"
            >
              + Add Medal
            </button>
            {showAddMedal && (
              <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl p-3 space-y-2">
                <input
                  type="text"
                  value={addMedalSearch}
                  onChange={(e) => { setAddMedalSearch(e.target.value); setAddMedalId(""); }}
                  placeholder="Search or enter new medal name..."
                  className="admin-input text-sm w-full"
                  autoFocus
                />
                {/* Filtered medal list from DB */}
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {medalTypes
                    .filter((t) => !addMedalSearch || t.name.toLowerCase().includes(addMedalSearch.toLowerCase()) || t.shortName.toLowerCase().includes(addMedalSearch.toLowerCase()))
                    .slice(0, 30)
                    .map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => { setAddMedalId(t._id); setAddMedalSearch(t.name); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${addMedalId === t._id ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]" : "hover:bg-[var(--color-border)]/50 text-[var(--color-text)]"}`}
                      >
                        {t.ribbonImageUrl ? (
                          <img src={t.ribbonImageUrl} alt="" className="w-10 h-4 object-fill rounded-[1px] shrink-0" />
                        ) : (
                          <div className="w-10 h-4 rounded-[1px] bg-gray-500 shrink-0" />
                        )}
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  {medalTypes.filter((t) => !addMedalSearch || t.name.toLowerCase().includes(addMedalSearch.toLowerCase())).length === 0 && addMedalSearch && (
                    <p className="text-sm text-[var(--color-text-muted)] px-2 py-1">No match — will create as new medal</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-[var(--color-border)]">
                  <button type="button" onClick={() => setShowAddMedal(false)} className="px-3 py-1.5 text-sm rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]">Cancel</button>
                  <button
                    type="button"
                    disabled={!addMedalSearch.trim()}
                    onClick={() => {
                      const selected = addMedalId ? medalTypes.find((t) => t._id === addMedalId) : null;
                      const newCell: WikiRibbonCellData = {
                        ribbonUrl: selected?.ribbonImageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='35'%3E%3Crect width='90' height='35' fill='%23ddd'/%3E%3C/svg%3E",
                        deviceUrls: [],
                        name: selected?.name || addMedalSearch.trim(),
                        _id: selected?._id || "",
                        type: "ribbon",
                      };
                      setWikiRibbonCells((prev) => [...prev, newCell]);
                      setShowAddMedal(false);
                      setAddMedalSearch("");
                      setAddMedalId("");
                    }}
                    className="px-3 py-1.5 text-sm rounded bg-[var(--color-gold)] text-black font-medium hover:bg-[var(--color-gold-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ribbon Rack Preview */}
        {(otherItems.length > 0 || ribbonItems.length > 0) && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Ribbon Rack Preview
            </p>
            <div className="bg-[var(--color-bg)] rounded-xl p-4 inline-flex flex-col items-center">
              {/* "Other" items — fixed size, row-based drag + resizable */}
              {otherItems.length > 0 && (() => {
                // Ribbon row max width (4 ribbons * 92px each)
                const ribbonRowMaxWidth = 4 * 92;
                const otherGap = 8; // gap-2 = 8px

                // Compute item width helper
                const getItemWidth = (cell: typeof otherItems[0]) =>
                  (cell.width || 100) * (otherScales[cell.cellIdx] ?? 1);

                // Compute total row width including gaps
                const rowWidth = (items: typeof otherItems) =>
                  items.reduce((sum, c) => sum + getItemWidth(c), 0) + Math.max(0, items.length - 1) * otherGap;

                // Group other items by their assigned row
                const otherRows: (typeof otherItems)[] = [];
                for (const cell of otherItems) {
                  const rowIdx = cell.row ?? 0;
                  while (otherRows.length <= rowIdx) otherRows.push([]);
                  otherRows[rowIdx].push(cell);
                }
                // Always show one extra empty row during drag for new-row drops
                if (dragGroup === "other") otherRows.push([]);

                // Clean up empty rows (except during drag): compact row indices
                // so there are no gaps when items are moved away
                const displayRows = dragGroup === "other"
                  ? otherRows
                  : otherRows.filter((r) => r.length > 0);

                // Check if dropping dragged item into a target row would exceed max width
                const wouldExceedWidth = (targetRow: typeof otherItems, draggedCellIdx: number) => {
                  // Items that would be in the target row after the drop
                  const isAlreadyInRow = targetRow.some((c) => c.cellIdx === draggedCellIdx);
                  if (isAlreadyInRow) return false; // reorder within same row, no width change
                  const draggedItem = otherItems.find((c) => c.cellIdx === draggedCellIdx);
                  if (!draggedItem) return false;
                  const newRowItems = [...targetRow, draggedItem];
                  return rowWidth(newRowItems) > ribbonRowMaxWidth;
                };

                return (
                  <div className="flex flex-col items-center gap-1">
                    {displayRows.map((row, ri) => {
                      // Compute the actual row index for this display row
                      const actualRowIdx = dragGroup === "other"
                        ? ri
                        : otherRows.indexOf(row);

                      return (
                        <div
                          key={`other-row-${ri}`}
                          className="flex items-end justify-center gap-2 rounded transition-colors"
                          style={{
                            minHeight: row.length > 0 ? undefined : 24,
                            minWidth: 80,
                            outline: dragGroup === "other" ? "1px dashed rgba(255,255,255,0.15)" : "none",
                            padding: dragGroup === "other" ? "4px 8px" : 0,
                          }}
                          onDragOver={(e) => {
                            if (dragGroup !== "other" || dragIdx === null) return;
                            if (wouldExceedWidth(row, otherItems[dragIdx].cellIdx)) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragGroup !== "other" || dragIdx === null) return;
                            const draggedCell = otherItems[dragIdx];
                            if (wouldExceedWidth(row, draggedCell.cellIdx)) return;
                            // Only change row, don't reorder
                            setWikiRibbonCells((prev) => {
                              const arr = [...prev];
                              arr[draggedCell.cellIdx] = { ...arr[draggedCell.cellIdx], row: actualRowIdx };
                              return arr;
                            });
                            setDragIdx(null);
                            setDragGroup(null);
                          }}
                        >
                          {row.map((cell) => {
                            const baseW = cell.width || 100;
                            const baseH = cell.height || 100;
                            const userScale = otherScales[cell.cellIdx] ?? 1;
                            const finalW = baseW * userScale;
                            const finalH = baseH * userScale;
                            const globalIdx = otherItems.indexOf(cell);

                            return (
                              <div
                                key={`other-${cell.cellIdx}`}
                                draggable
                                onDragStart={(e) => {
                                  setDragIdx(globalIdx);
                                  setDragGroup("other");
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragOver={(e) => {
                                  if (dragGroup !== "other" || dragIdx === null) return;
                                  if (wouldExceedWidth(row, otherItems[dragIdx].cellIdx)) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (dragGroup !== "other" || dragIdx === null) return;
                                  const draggedCell = otherItems[dragIdx];
                                  if (wouldExceedWidth(row, draggedCell.cellIdx)) return;
                                  const fromRow = draggedCell.row ?? 0;
                                  if (fromRow === actualRowIdx) {
                                    // Same row: reorder by swapping positions in wikiRibbonCells
                                    if (draggedCell.cellIdx === cell.cellIdx) return;
                                    setWikiRibbonCells((prev) => {
                                      const arr = [...prev];
                                      const fromIdx = draggedCell.cellIdx;
                                      const toIdx = cell.cellIdx;
                                      const item = arr[fromIdx];
                                      arr.splice(fromIdx, 1);
                                      const adj = toIdx > fromIdx ? toIdx - 1 : toIdx;
                                      arr.splice(adj, 0, item);
                                      return arr;
                                    });
                                  } else {
                                    // Different row: move to this row, insert before target
                                    setWikiRibbonCells((prev) => {
                                      const arr = [...prev];
                                      arr[draggedCell.cellIdx] = { ...arr[draggedCell.cellIdx], row: actualRowIdx };
                                      const fromIdx = draggedCell.cellIdx;
                                      const toIdx = cell.cellIdx;
                                      if (fromIdx === toIdx) return arr;
                                      const item = arr[fromIdx];
                                      arr.splice(fromIdx, 1);
                                      const adj = toIdx > fromIdx ? toIdx - 1 : toIdx;
                                      arr.splice(adj, 0, item);
                                      return arr;
                                    });
                                  }
                                  setDragIdx(null);
                                  setDragGroup(null);
                                }}
                                onDragEnd={() => { setDragIdx(null); setDragGroup(null); }}
                                className="relative group cursor-grab active:cursor-grabbing shrink-0"
                                style={{
                                  width: finalW,
                                  height: finalH,
                                  opacity: dragGroup === "other" && dragIdx === globalIdx ? 0.4 : 1,
                                }}
                              >
                                <img
                                  src={cell.ribbonUrl}
                                  alt={cell.name || ""}
                                  width={finalW}
                                  height={finalH}
                                  className="object-contain block"
                                  draggable={false}
                                />
                                {/* Resize controls */}
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-0.5 bg-black/80 rounded-full px-1.5 py-0.5 z-10">
                                  <button
                                    type="button"
                                    onClick={() => setOtherScales((s) => ({ ...s, [cell.cellIdx]: Math.max(0.2, (s[cell.cellIdx] ?? 1) - 0.1) }))}
                                    className="w-4 h-4 flex items-center justify-center text-white text-[10px] font-bold hover:text-amber-300"
                                  >−</button>
                                  <span className="text-[9px] text-white/60 min-w-[24px] text-center">{Math.round(userScale * 100)}%</span>
                                  <button
                                    type="button"
                                    onClick={() => setOtherScales((s) => ({ ...s, [cell.cellIdx]: Math.min(3, (s[cell.cellIdx] ?? 1) + 0.1) }))}
                                    className="w-4 h-4 flex items-center justify-center text-white text-[10px] font-bold hover:text-amber-300"
                                  >+</button>
                                </div>
                              </div>
                            );
                          })}
                          {row.length === 0 && dragGroup === "other" && (
                            <span className="text-[10px] text-white/30 py-1 select-none">drop here for new row</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Adjustable gap between other items and ribbons */}
              {otherItems.length > 0 && ribbonItems.length > 0 && (
                <div
                  className="w-full flex items-center justify-center group/gap relative"
                  style={{ height: rackGap }}
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden group-hover/gap:flex items-center justify-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => setRackGap((g) => Math.max(0, g - 4))}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-black/70 text-white text-[10px] font-bold hover:text-amber-300"
                    >−</button>
                    <span className="text-[9px] text-[var(--color-text-muted)] bg-[var(--color-bg)] px-1 rounded">{rackGap}px</span>
                    <button
                      type="button"
                      onClick={() => setRackGap((g) => Math.min(60, g + 4))}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-black/70 text-white text-[10px] font-bold hover:text-amber-300"
                    >+</button>
                  </div>
                </div>
              )}
              {/* Ribbon items — draggable grid, 4 per row */}
              {ribbonItems.length > 0 && (
                <div className="flex flex-wrap justify-center" style={{ width: 4 * 92, gap: 2 }}>
                  {ribbonItems.map((cell, i) => (
                    <div
                      key={`rib-${cell.cellIdx}`}
                      draggable
                      onDragStart={(e) => {
                        setDragIdx(i);
                        setDragGroup("ribbon");
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragGroup !== "ribbon" || dragIdx === null || dragIdx === i) return;
                        setWikiRibbonCells((prev) => {
                          const arr = [...prev];
                          const fromCellIdx = ribbonItems[dragIdx].cellIdx;
                          const toCellIdx = cell.cellIdx;
                          const item = arr[fromCellIdx];
                          arr.splice(fromCellIdx, 1);
                          const adjustedTo = toCellIdx > fromCellIdx ? toCellIdx - 1 : toCellIdx;
                          arr.splice(adjustedTo, 0, item);
                          return arr;
                        });
                        setDragIdx(null);
                        setDragGroup(null);
                      }}
                      onDragEnd={() => { setDragIdx(null); setDragGroup(null); }}
                      onClick={() => {
                        setSelectedRibbonIdx(selectedRibbonIdx === cell.cellIdx ? null : cell.cellIdx);
                        setShowAddDevice(false);
                      }}
                      className="cursor-grab active:cursor-grabbing relative"
                      style={{
                        width: 90,
                        height: 35,
                        opacity: dragGroup === "ribbon" && dragIdx === i ? 0.4 : 1,
                        outline: selectedRibbonIdx === cell.cellIdx ? "2px solid var(--color-gold)" : "none",
                        outlineOffset: 1,
                        borderRadius: 2,
                      }}
                    >
                      <img
                        src={cell.ribbonUrl}
                        alt={cell.name || ""}
                        className="w-full h-full object-fill rounded-[1px]"
                        draggable={false}
                      />
                      {/* Device overlays — always rendered from deviceUrls */}
                      {cell.deviceUrls.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center gap-[1px] pointer-events-none overflow-hidden">
                          {cell.deviceUrls.map((dUrl, di) => (
                            <img key={di} src={dUrl} alt="" className="h-[70%] object-contain shrink-0" style={{ maxWidth: `${Math.floor(88 / cell.deviceUrls.length)}px` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Device controls — shown when a ribbon is selected */}
            {selectedRibbonIdx !== null && wikiRibbonCells[selectedRibbonIdx] && (() => {
              const selCell = wikiRibbonCells[selectedRibbonIdx];
              // Classify existing device URLs
              const currentDevices = selCell.deviceUrls.map((url, i) => ({ url, type: classifyDeviceUrl(url), index: i }));
              return (
                <div className="mt-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Selected: <span className="font-medium text-[var(--color-text)]">{selCell.name || "(unnamed)"}</span>
                    </span>
                    <button type="button" onClick={() => { setSelectedRibbonIdx(null); setShowAddDevice(false); }} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Deselect</button>
                  </div>

                  {/* Current devices list */}
                  {currentDevices.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Current Devices</p>
                      {currentDevices.map((d) => (
                        <div key={d.index} className="flex items-center gap-2 py-0.5">
                          <img src={d.url} alt="" className="h-5 object-contain" />
                          <span className="text-sm text-[var(--color-text)]">
                            {DEVICE_LABELS[d.type] || d.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setWikiRibbonCells((prev) => prev.map((c, ci) => {
                                if (ci !== selectedRibbonIdx) return c;
                                const removed = c.deviceUrls.filter((_, di) => di !== d.index);
                                return { ...c, deviceUrls: recompactDeviceUrls(removed) };
                              }));
                            }}
                            className="ml-auto w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Remove device"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {currentDevices.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] italic">No devices on this ribbon</p>
                  )}

                  {/* Add device controls */}
                  {!showAddDevice ? (
                    <button
                      type="button"
                      onClick={() => { setShowAddDevice(true); setAddDeviceType("bronze-olc"); setAddDeviceCount(1); }}
                      className="px-3 py-1.5 text-sm rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors"
                    >
                      + Add Device
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowDeviceDropdown((v) => !v)}
                            className="admin-input text-sm py-1.5 px-2.5 flex items-center gap-2 min-w-[220px] text-left"
                          >
                            {DEVICE_URLS[addDeviceType] && (
                              <img src={DEVICE_URLS[addDeviceType]} alt="" className="h-5 object-contain shrink-0" />
                            )}
                            <span className="truncate">{DEVICE_LABELS[addDeviceType] || addDeviceType}</span>
                            <svg className="w-3 h-3 ml-auto shrink-0 text-[var(--color-text-muted)]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l3 3 3-3" /></svg>
                          </button>
                          {showDeviceDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowDeviceDropdown(false)} />
                              <div className="absolute left-0 top-full mt-1 z-50 w-72 max-h-64 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl py-1">
                                {Object.entries(DEVICE_LABELS).map(([key, label]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => { setAddDeviceType(key); setShowDeviceDropdown(false); }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${addDeviceType === key ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]" : "hover:bg-[var(--color-border)]/50 text-[var(--color-text)]"}`}
                                  >
                                    {DEVICE_URLS[key] ? (
                                      <img src={DEVICE_URLS[key]} alt="" className="h-5 w-6 object-contain shrink-0" />
                                    ) : (
                                      <div className="h-5 w-6 shrink-0" />
                                    )}
                                    <span className="truncate">{label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        {(addDeviceType in COMPACTABLE_SILVER || Object.values(COMPACTABLE_SILVER).includes(addDeviceType)) && (
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-[var(--color-text-muted)]">Count:</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={addDeviceCount}
                              onChange={(e) => setAddDeviceCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="admin-input text-sm py-1 text-center"
                              style={{ width: 48 }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Preview — show result after adding */}
                      {(() => {
                        const isCompactable = addDeviceType in COMPACTABLE_SILVER;
                        const silverType = COMPACTABLE_SILVER[addDeviceType];
                        const isCompactableSilver = Object.values(COMPACTABLE_SILVER).includes(addDeviceType);
                        // Find the bronze counterpart for a silver type
                        const bronzeForSilver = isCompactableSilver
                          ? Object.entries(COMPACTABLE_SILVER).find(([, s]) => s === addDeviceType)?.[0]
                          : undefined;
                        if (isCompactable || isCompactableSilver) {
                          // Compactable pair — show silver/bronze breakdown
                          const bType = isCompactable ? addDeviceType : bronzeForSilver!;
                          const sType = isCompactable ? silverType : addDeviceType;
                          const existingS = currentDevices.filter((d) => d.type === sType).length;
                          const existingB = currentDevices.filter((d) => d.type === bType).length;
                          const existingTotal = existingS * 5 + existingB;
                          const addAmount = isCompactable ? addDeviceCount : addDeviceCount * 5;
                          const newTotal = existingTotal + addAmount;
                          const newS = Math.floor(newTotal / 5);
                          const newB = newTotal % 5;
                          const sLabel = DEVICE_LABELS[sType] || sType;
                          const bLabel = DEVICE_LABELS[bType] || bType;
                          return (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-bg)] rounded border border-[var(--color-border)]">
                              <span className="text-xs text-[var(--color-text-muted)]">Result:</span>
                              {newS > 0 && <span className="text-xs text-gray-300">{newS} {sLabel}</span>}
                              {newS > 0 && newB > 0 && <span className="text-xs text-[var(--color-text-muted)]">+</span>}
                              {newB > 0 && <span className="text-xs text-amber-600">{newB} {bLabel}</span>}
                              {newS === 0 && newB === 0 && <span className="text-xs text-[var(--color-text-muted)]">no change</span>}
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-bg)] rounded border border-[var(--color-border)]">
                            <span className="text-xs text-[var(--color-text-muted)]">Add:</span>
                            <span className="text-xs text-[var(--color-text)]">{DEVICE_LABELS[addDeviceType] || addDeviceType}</span>
                          </div>
                        );
                      })()}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const idx = selectedRibbonIdx;
                            const isCompactable = addDeviceType in COMPACTABLE_SILVER;
                            const isCompactableSilver = Object.values(COMPACTABLE_SILVER).includes(addDeviceType);
                            setWikiRibbonCells((prev) => prev.map((c, ci) => {
                              if (ci !== idx) return c;
                              if (isCompactable || isCompactableSilver) {
                                // Add as bronze units then recompact
                                const bType = isCompactable ? addDeviceType : Object.entries(COMPACTABLE_SILVER).find(([, s]) => s === addDeviceType)?.[0] || addDeviceType;
                                const added = [...c.deviceUrls];
                                const count = isCompactableSilver ? addDeviceCount * 5 : addDeviceCount;
                                for (let i = 0; i < count; i++) added.push(DEVICE_URLS[bType] || DEVICE_URLS["bronze-olc"]);
                                return { ...c, deviceUrls: recompactDeviceUrls(added) };
                              } else {
                                const url = DEVICE_URLS[addDeviceType];
                                if (!url) return c;
                                return { ...c, deviceUrls: [...c.deviceUrls, url] };
                              }
                            }));
                            setShowAddDevice(false);
                          }}
                          className="px-3 py-1.5 text-sm rounded bg-[var(--color-gold)] text-black font-medium hover:bg-[var(--color-gold-hover)]"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddDevice(false)}
                          className="px-2.5 py-1.5 text-sm rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Unified item list below rack: all items with thumbnail + name/dropdown/input + actions */}
            <div className="mt-3 space-y-2">
              {wikiRibbonCells
                .filter((c) => c.ribbonUrl && !isBlankImage(c.ribbonUrl))
                .map((cell, i) => {
                  const cellIdx = wikiRibbonCells.indexOf(cell);
                  const isOther = cell.type === "other";
                  const dbMedal = cell._id ? medalTypes.find((t) => t._id === cell._id) : null;
                  const displayName = dbMedal?.name || cell.name;
                  return (
                    <div key={`item-label-${i}`} className="flex items-center gap-3">
                      {/* Thumbnail — uniform width, slightly larger */}
                      <div className="shrink-0 flex items-center justify-center" style={{ width: 60 }}>
                        {isOther ? (
                          <img src={cell.ribbonUrl} alt="" className="object-contain" style={{ maxWidth: 60, maxHeight: 32 }} />
                        ) : (
                          <img src={cell.ribbonUrl} alt="" className="object-contain rounded" style={{ width: 60, height: 24 }} />
                        )}
                      </div>
                      {/* Name: matched = DB name, unmatched = editable input with datalist suggestions */}
                      {cell._id ? (
                        <div className="flex-1 flex items-center gap-2 text-left">
                          <span className="text-sm text-[var(--color-text)]">{displayName}</span>
                          {cell.deviceUrls.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {cell.deviceUrls.map((dUrl, di) => (
                                <img key={di} src={dUrl} alt="" className="h-4 object-contain" />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-1.5">
                          {availableMedalNames.length > 0 && !cell._customInput ? (
                            <select
                              value={cell.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__custom__") {
                                  setWikiRibbonCells((prev) => prev.map((c, ci) =>
                                    ci === cellIdx ? { ...c, name: "", _customInput: true } : c
                                  ));
                                } else {
                                  setWikiRibbonCells((prev) => prev.map((c, ci) =>
                                    ci === cellIdx ? { ...c, name: val, _customInput: false } : c
                                  ));
                                }
                              }}
                              className="admin-input text-sm py-1 px-2 flex-1 text-left"
                            >
                              <option value="">-- Select name --</option>
                              {availableMedalNames
                                .filter((m) => m.name === cell.name || !wikiRibbonCells.some((c, ci) => ci !== cellIdx && !c._id && c.name === m.name))
                                .map((m, ni) => (
                                  <option key={`${m.name}-${ni}`} value={m.name}>
                                    {m.devices ? `${m.name} — ${m.devices}` : m.name}
                                  </option>
                                ))}
                              <option value="__custom__">Custom name...</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={cell.name}
                              onChange={(e) => {
                                setWikiRibbonCells((prev) => prev.map((c, ci) =>
                                  ci === cellIdx ? { ...c, name: e.target.value } : c
                                ));
                              }}
                              placeholder="Enter name..."
                              className="admin-input text-sm py-1 px-2 flex-1 text-left"
                            />
                          )}
                        </div>
                      )}
                      {/* Merge button — merge with an existing DB medal type */}
                      {!cell._id && (
                        <>
                          {mergingRibbonIdx === cellIdx ? (
                            <div className="flex items-center gap-1">
                              <div className="w-56">
                                <MedalSelect
                                  value=""
                                  medalTypes={medalTypes}
                                  onChange={(targetId) => {
                                    const target = medalTypes.find((t) => t._id === targetId);
                                    if (!target) return;
                                    setMergeConfirm({ cellIdx, targetId, targetName: target.name });
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setMergingRibbonIdx(null)}
                                className="px-2 py-1 text-sm rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMergingRibbonIdx(cellIdx)}
                              className="shrink-0 px-2.5 py-1 text-sm rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors border border-amber-500/30"
                              title="Merge with existing medal type"
                            >
                              Merge
                            </button>
                          )}
                        </>
                      )}
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          setWikiRibbonCells((prev) => prev.filter((_, ci) => ci !== cellIdx));
                        }}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors border border-[var(--color-border)]"
                        title="Remove item"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Merge confirmation modal */}
        {mergeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-3">Confirm Merge</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Merge <span className="font-semibold text-[var(--color-text)]">&quot;{wikiRibbonCells[mergeConfirm.cellIdx]?.name || "(unnamed)"}&quot;</span> into:
              </p>
              <p className="text-base font-semibold text-amber-400 mb-4">
                {mergeConfirm.targetName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">
                The current name will be added to the target medal&apos;s other names for future matching.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMergeConfirm(null)}
                  className="px-4 py-2 text-sm rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { cellIdx, targetId, targetName } = mergeConfirm;
                    const cell = wikiRibbonCells[cellIdx];
                    if (cell?.name) {
                      await fetch(`/api/medal-types/${targetId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ $addToSet: { otherNames: cell.name } }),
                      });
                    }
                    setWikiRibbonCells((prev) => prev.map((c, ci) =>
                      ci === cellIdx ? { ...c, _id: targetId, name: targetName } : c
                    ));
                    setMergeConfirm(null);
                    setMergingRibbonIdx(null);
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors font-medium"
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── § 2b Classification & ownership ───────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader
          title="Classification & ownership"
          sub="Country, browse tags (for Explore), optional adoption fields."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Country code
            </label>
            <select
              value={form.countryCode}
              onChange={(e) => set("countryCode", e.target.value)}
              className="admin-input"
            >
              {["US", "UK", "CA", "AU", "NZ", "ZA", "IN"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Comparison score (optional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={form.comparisonScore}
              onChange={(e) => set("comparisonScore", e.target.value)}
              className="admin-input"
              placeholder="Cross-country index only"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
              Metadata tags
            </label>
            <div className="flex flex-wrap gap-2">
              {HERO_METADATA_TAGS.map((t) => {
                const on = form.metadataTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        metadataTags: on
                          ? prev.metadataTags.filter((x) => x !== t.id)
                          : [...prev.metadataTags, t.id],
                      }))
                    }
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      on ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15" : "border-[var(--color-border)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              AI import can suggest tags; always verify. Used by /explore filters.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Owner user ID (MongoDB)
            </label>
            <input
              type="text"
              value={form.ownerUserId}
              onChange={(e) => set("ownerUserId", e.target.value)}
              className="admin-input font-mono text-sm"
              placeholder="Empty = available for adoption"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Adoption expiry
            </label>
            <input
              type="date"
              value={form.adoptionExpiry}
              onChange={(e) => set("adoptionExpiry", e.target.value)}
              className="admin-input"
            />
          </div>
        </div>
      </section>

      {/* ── § 3 Service Record ───────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader title="Service Record" sub="Theaters, tours, and special service designations." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Wars / Theaters
            </label>
            <input
              type="text"
              value={form.wars}
              onChange={(e) => set("wars", e.target.value)}
              className="admin-input"
              placeholder="World War II, Korean War"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Comma-separated list</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Combat Tours
            </label>
            <input
              type="number"
              min={0}
              value={form.combatTours}
              onChange={(e) => set("combatTours", parseInt(e.target.value) || 0)}
              className="admin-input"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <Toggle
            label="Combat Command"
            description="Held unit-level command in active combat"
            checked={form.hadCombatCommand}
            onChange={(v) => set("hadCombatCommand", v)}
          />
          <Toggle
            label="POW / Heroism"
            description="Extended captivity, escape, or leadership under torture"
            checked={form.powHeroism}
            onChange={(v) => set("powHeroism", v)}
          />
          <Toggle
            label="Multi-Service or Multi-War"
            description="Served in multiple branches or across multiple wars (+5% bonus)"
            checked={form.multiServiceOrMultiWar}
            onChange={(v) => set("multiServiceOrMultiWar", v)}
          />
        </div>
      </section>

      {/* ── § 4 Combat Achievements ─────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader title="Combat Achievement Modifier" sub="Select combat specialty for bonus scoring." />

        <div className="mb-4">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
            Type
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ["none", "None"],
              ["infantry", "Infantry"],
              ["armor", "Armor / Cavalry"],
              ["artillery", "Artillery"],
              ["aviation", "✈ Aviation"],
              ["airborne", "🪂 Airborne"],
              ["special_operations", "🎯 Special Ops"],
              ["submarine", "⚓ Submarine"],
              ["surface", "🚢 Surface Naval"],
              ["amphibious", "Amphibious"],
              ["reconnaissance", "Reconnaissance"],
              ["air_defense", "Air Defense"],
              ["engineering", "Engineering"],
              ["signal", "Signal / Comms"],
              ["intelligence", "Intelligence"],
              ["medical", "⚕ Medical"],
              ["logistics", "Logistics"],
              ["chemical", "☢ CBRN"],
              ["electronic_warfare", "EW"],
              ["cyber", "Cyber"],
              ["military_police", "Military Police"],
              ["ordnance", "💣 Ordnance / EOD"],
              ["sniper", "🎯 Sniper"],
              ["marine", "⚓ Marine"],
            ] as const).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    combatAchievements: { ...prev.combatAchievements, type: t },
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  form.combatAchievements.type === t
                    ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.combatAchievements.type !== "none" && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
            {form.combatAchievements.type === "aviation" && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Confirmed Kills
                </label>
                <input
                  type="number" min={0}
                  value={form.combatAchievements.confirmedKills}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, combatAchievements: { ...p.combatAchievements, confirmedKills: parseInt(e.target.value) || 0 } }))
                  }
                  className="admin-input"
                />
              </div>
            )}
            {form.combatAchievements.type === "submarine" && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Ships Sunk
                </label>
                <input
                  type="number" min={0}
                  value={form.combatAchievements.shipsSunk}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, combatAchievements: { ...p.combatAchievements, shipsSunk: parseInt(e.target.value) || 0 } }))
                  }
                  className="admin-input"
                />
              </div>
            )}
            {(form.combatAchievements.type === "surface" || !["aviation", "submarine"].includes(form.combatAchievements.type)) && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Major Engagements
                </label>
                <input
                  type="number" min={0}
                  value={form.combatAchievements.majorEngagements}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, combatAchievements: { ...p.combatAchievements, majorEngagements: parseInt(e.target.value) || 0 } }))
                  }
                  className="admin-input"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
                Defining Missions
              </label>
              <input
                type="number" min={0}
                value={form.combatAchievements.definingMissions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, combatAchievements: { ...p.combatAchievements, definingMissions: parseInt(e.target.value) || 0 } }))
                }
                className="admin-input"
              />
            </div>
          </div>
        )}
      </section>

      {/* ── § 5 Publishing ──────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-5">
        <SectionHeader title="Publishing" sub="Control visibility and ranking order." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">
              Manual Rank Override
            </label>
            <input
              type="number"
              min={1}
              value={form.orderOverride}
              onChange={(e) => set("orderOverride", e.target.value)}
              className="admin-input"
              placeholder="Auto (leave blank)"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Leave blank to rank by score</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <Toggle
            label="Published"
            description="Visible on the public rankings and heroes pages"
            checked={form.published}
            onChange={(v) => set("published", v)}
          />
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ── Sticky save bar ──────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-0 px-4 sm:px-0 py-3 bg-[var(--color-bg)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary px-6 sm:px-8" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update Hero" : "Create Hero"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/admin/heroes")}
          >
            Cancel
          </button>
          {isEdit && (
            <a
              href={`/heroes/${initialData?._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              View public profile →
            </a>
          )}
        </div>
      </div>
    </form>

    {/* Wikipedia page viewer panel */}
    {showWikiPage && wikiPageUrl && (
      <div className="w-1/2 min-w-0 sticky top-4 flex flex-col border border-[var(--color-border)] rounded-xl overflow-hidden bg-white" style={{ height: "calc(100vh - 2rem)" }}>
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)] truncate flex-1 mr-2">{wikiPageUrl}</span>
          <button
            type="button"
            onClick={() => setShowWikiPage(false)}
            className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <iframe
          src={`/api/wiki-proxy?url=${encodeURIComponent(wikiPageUrl)}`}
          className="flex-1 w-full"
          sandbox="allow-same-origin allow-scripts allow-popups"
          title="Wikipedia page"
        />
      </div>
    )}
    </div>
  );
}


