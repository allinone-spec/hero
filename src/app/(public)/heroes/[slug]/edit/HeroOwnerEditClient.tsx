"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import { AdminLoader } from "@/components/ui/AdminLoader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ImageUpload from "@/components/ui/ImageUpload";
import RankCombobox from "@/components/heroes/RankCombobox";
import { describeMedalDevices, getMedalDeviceFamilyLabel } from "@/lib/medal-device-rules";
import { isMedalEligibleForHeroCountry } from "@/lib/medal-eligibility";
import { buildRibbonRackMedals, sortHeroMedalEntries } from "@/lib/rack-engine";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";

const profileOwnerBackClass =
  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1";

function ProfileOwnerBackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function RemoveMedalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Extra rack detail when devices apply; omit when empty so we don’t duplicate the family label. */
function ownerMedalRackFragment(medal: OwnerMedalEntry, branch: string): string | null {
  const detail = describeMedalDevices({
    count: medal.count,
    hasValor: medal.hasValor,
    arrowheads: medal.arrowheads,
    deviceRule: medal.medalType.deviceRule ?? medal.medalType.deviceLogic,
    serviceBranch: branch,
  });
  if (!detail) return null;
  return detail.replace(/^w\/\s*/, "");
}

interface Props {
  slug: string;
}

interface MedalOption {
  _id: string;
  name: string;
  shortName?: string;
  precedenceOrder: number;
  ribbonColors?: string[];
  ribbonImageUrl?: string;
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  countryCode?: string;
  inventoryCategory?: string;
  wikiSummary?: string;
  history?: string;
  awardCriteria?: string;
  imageUrl?: string;
}

interface OwnerMedalEntry {
  medalType: MedalOption;
  count: number;
  hasValor: boolean;
  valorDevices: number;
  arrowheads?: number;
  deviceImages?: { url: string; deviceType: string; count: number }[];
  wikiRibbonUrl?: string;
}

/** Map populated hero.medals from API → editor state (Stage 2: same shape after save → instant rack refresh). */
function medalsFromServerPayload(
  raw: unknown
): OwnerMedalEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is Record<string, unknown> =>
        Boolean(m) && typeof m === "object" && m !== null && typeof (m as { medalType?: unknown }).medalType === "object"
    )
    .map((m) => {
      const mt = m.medalType as Record<string, unknown>;
      return {
        medalType: {
          _id: String(mt._id ?? ""),
          name: String(mt.name ?? ""),
          shortName: mt.shortName != null ? String(mt.shortName) : undefined,
          precedenceOrder: Number(mt.precedenceOrder) || 0,
          ribbonColors: Array.isArray(mt.ribbonColors) ? (mt.ribbonColors as string[]) : undefined,
          ribbonImageUrl: mt.ribbonImageUrl != null ? String(mt.ribbonImageUrl) : undefined,
          deviceLogic: mt.deviceLogic != null ? String(mt.deviceLogic) : undefined,
          deviceRule: mt.deviceRule as MedalDeviceRule | undefined,
          countryCode: mt.countryCode != null ? String(mt.countryCode) : undefined,
          inventoryCategory: mt.inventoryCategory != null ? String(mt.inventoryCategory) : undefined,
          wikiSummary: mt.wikiSummary != null ? String(mt.wikiSummary) : undefined,
          history: mt.history != null ? String(mt.history) : undefined,
          awardCriteria: mt.awardCriteria != null ? String(mt.awardCriteria) : undefined,
          imageUrl: mt.imageUrl != null ? String(mt.imageUrl) : undefined,
        },
        count: Math.max(1, Number(m.count) || 1),
        hasValor: Boolean(m.hasValor),
        valorDevices: Math.max(0, Number(m.valorDevices) || 0),
        arrowheads: Math.max(0, Number(m.arrowheads) || 0),
        deviceImages: Array.isArray(m.deviceImages) ? (m.deviceImages as OwnerMedalEntry["deviceImages"]) : [],
        wikiRibbonUrl: typeof m.wikiRibbonUrl === "string" ? m.wikiRibbonUrl : "",
      };
    })
    .filter((m) => m.medalType._id);
}

export default function HeroOwnerEditClient({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [rank, setRank] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [biography, setBiography] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [medals, setMedals] = useState<OwnerMedalEntry[]>([]);
  const [catalog, setCatalog] = useState<MedalOption[]>([]);
  const [selectedMedalId, setSelectedMedalId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showForeignMedals, setShowForeignMedals] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await fetch(`/api/site/hero-for-edit?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        const cc = (data.countryCode || "US").toString().trim().toUpperCase() || "US";
        const medalsRes = await fetch("/api/medal-types", {
          cache: "no-store",
        });
        const medalData = medalsRes.ok ? await medalsRes.json() : [];
        if (cancelled) return;
        if (res.status === 401) {
          setError("signin");
          return;
        }
        if (!res.ok) {
          setError(data.error || "Could not load hero");
          return;
        }
        setId(data._id);
        setName(data.name || "");
        setBranch(data.branch || "");
        setRank(typeof data.rank === "string" ? data.rank : "");
        setCountryCode(cc);
        setBiography(data.biography || "");
        setAvatarUrl(data.avatarUrl || "");
        setPublished(Boolean(data.published));
        setMedals(medalsFromServerPayload(data.medals));
        setCatalog(Array.isArray(medalData) ? medalData : []);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const ribbonMedals = useMemo(
    () =>
      buildRibbonRackMedals(sortHeroMedalEntries(medals, { nationalCountryCode: countryCode }), {
        serviceBranch: branch,
        nationalCountryCode: countryCode,
      }),
    [branch, countryCode, medals],
  );

  const catalogForPicker = useMemo(
    () =>
      catalog.filter((m) =>
        isMedalEligibleForHeroCountry(
          m.countryCode,
          countryCode || "US",
          showForeignMedals,
          m.inventoryCategory,
        ),
      ),
    [catalog, countryCode, showForeignMedals],
  );
  function addMedal() {
    setSaveSuccess(false);
    if (!selectedMedalId) return;
    const match = catalogForPicker.find((m) => m._id === selectedMedalId);
    if (!match) return;
    setMedals((prev) => {
      const existing = prev.find((m) => m.medalType._id === match._id);
      if (existing) {
        return prev.map((m) =>
          m.medalType._id === match._id
            ? { ...m, count: m.count + 1, valorDevices: m.hasValor ? Math.max(1, m.valorDevices) : 0 }
            : m
        );
      }
      return [...prev, { medalType: match, count: 1, hasValor: false, valorDevices: 0, arrowheads: 0, deviceImages: [] }];
    });
    setSelectedMedalId("");
  }

  function updateMedal(medalId: string, patch: Partial<OwnerMedalEntry>) {
    setSaveSuccess(false);
    setMedals((prev) =>
      prev.map((m) =>
        m.medalType._id === medalId
          ? {
              ...m,
              ...patch,
              valorDevices:
                patch.hasValor === false
                  ? 0
                  : patch.valorDevices ?? (m.hasValor || patch.hasValor ? Math.max(1, m.valorDevices || 1) : 0),
            }
          : m
      )
    );
  }

  function removeMedal(medalId: string) {
    setSaveSuccess(false);
    setMedals((prev) => prev.filter((m) => m.medalType._id !== medalId));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/heroes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biography,
          avatarUrl,
          rank,
          medals: medals.map((m) => ({
            medalType: m.medalType._id,
            count: m.count,
            hasValor: m.hasValor,
            valorDevices: m.hasValor ? Math.max(1, m.valorDevices || 1) : 0,
            arrowheads: m.arrowheads ?? 0,
            deviceImages: m.deviceImages ?? [],
            wikiRibbonUrl: m.wikiRibbonUrl || "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      setMedals(medalsFromServerPayload(data.medals));
      if (typeof data.biography === "string") setBiography(data.biography);
      if (typeof data.avatarUrl === "string") setAvatarUrl(data.avatarUrl);
      if (typeof data.rank === "string") setRank(data.rank);
      setSaveSuccess(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminLoader label="Loading tribute editor…" />;
  }

  if (error === "signin") {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-[var(--color-text-muted)] mb-4">Sign in as the hero owner to edit this page.</p>
        <Link
          href={`/login?role=member&next=${encodeURIComponent(`/heroes/${slug}/edit`)}`}
          className="text-[var(--color-gold)] font-medium hover:underline"
        >
          Owner sign in
        </Link>
      </div>
    );
  }

  if (error || !id) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-red-300 mb-4">{error || "Not found"}</p>
        <Link href="/my-heroes" className={profileOwnerBackClass}>
          <ProfileOwnerBackChevron />
          Back to My Heroes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/my-heroes" className={profileOwnerBackClass}>
          <ProfileOwnerBackChevron />
          Back to My Heroes
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mt-2">Edit tribute: {name}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          You can update rank (with autocomplete), short biography, portrait, and medal list. By default the medal
          picker only lists{" "}
          <strong>{countryCode}</strong> catalog awards only; enable &quot;Show foreign awards&quot; for edge
          cases. The rack preview uses the same precedence engine as the public page.
          {!published && " This hero is not published yet; the public page may be unavailable."}
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Saved. Ribbon rack and scores are updated from the server.{" "}
            <Link href="/my-heroes" className="font-medium underline underline-offset-2 hover:text-emerald-100">
              My Heroes
            </Link>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Rank</label>
          <RankCombobox
            value={rank}
            onChange={(v) => {
              setSaveSuccess(false);
              setRank(v);
            }}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="Type to search (e.g. Corporal, Captain)"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Suggestions use the same US + Commonwealth rank list as admin. Display name and branch are set by staff;
            you can correct rank spelling here.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Biography</label>
          <textarea
            value={biography}
            onChange={(e) => {
              setSaveSuccess(false);
              setBiography(e.target.value);
            }}
            rows={10}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Portrait</label>
          <ImageUpload
            value={avatarUrl}
            onChange={(url) => {
              setSaveSuccess(false);
              setAvatarUrl(url);
            }}
            folder="Heroes/TributePortraits"
            label="portrait"
            uploadUrl="/api/site/upload-tribute-image"
            extraFormFields={{ slug }}
            previewClassName="h-44 w-44 object-cover rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-1">
            Or paste a public image URL (https). Invalid or broken links are cleared when the image fails to load.
          </p>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => {
              setSaveSuccess(false);
              setAvatarUrl(e.target.value);
            }}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="https://…"
            autoComplete="off"
          />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 sm:p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Medals</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
              Add rows, set how many times this award appears, and toggle the <strong className="text-[var(--color-text)]">V</strong> device when
              earned with valor. The rack preview below matches the public page.
            </p>
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-[var(--color-border)]"
                checked={showForeignMedals}
                onChange={(e) => {
                  setSaveSuccess(false);
                  setShowForeignMedals(e.target.checked);
                  setSelectedMedalId("");
                }}
              />
              Show foreign awards (default: host country only)
            </label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <select
                value={selectedMedalId}
                onChange={(e) => setSelectedMedalId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-gold)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/20"
              >
                <option value="">
                  {showForeignMedals ? "Choose medal (full catalog)…" : `Choose medal (${countryCode} only)…`}
                </option>
                {catalogForPicker.map((medal) => (
                  <option key={medal._id} value={medal._id}>
                    {medal.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addMedal}
                disabled={!selectedMedalId}
                className="shrink-0 rounded-lg border border-[var(--color-gold)]/45 bg-[var(--color-gold)]/12 px-4 py-2.5 text-sm font-semibold text-[var(--color-gold)] transition-colors hover:bg-[var(--color-gold)]/20 disabled:pointer-events-none disabled:opacity-45"
              >
                Add to list
              </button>
            </div>
          </div>

          {medals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/60 px-4 py-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No medals yet. Pick one from the dropdown and tap <span className="font-medium text-[var(--color-text)]">Add to list</span>.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {medals.map((medal) => {
                const family = getMedalDeviceFamilyLabel(
                  medal.medalType.deviceRule ?? medal.medalType.deviceLogic,
                  branch
                );
                const rackFrag = ownerMedalRackFragment(medal, branch);
                return (
                <li
                  key={medal.medalType._id}
                  className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 sm:px-4 sm:py-3.5"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
                        {medal.medalType.name}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center rounded-md bg-[var(--color-border)]/20 px-1.5 py-0.5 font-medium tabular-nums text-[var(--color-text-muted)]">
                          #{medal.medalType.precedenceOrder}
                        </span>
                        <span className="mx-1.5 text-[var(--color-border)]">·</span>
                        <span>{family}</span>
                        {rackFrag ? (
                          <>
                            <span className="mx-1.5 text-[var(--color-border)]">·</span>
                            <span className="text-[var(--color-text-muted)]/90">{rackFrag}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedal(medal.medalType._id)}
                      className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] opacity-35 transition-all hover:border hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-300 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400/35 group-hover:opacity-60"
                      title={`Remove ${medal.medalType.name}`}
                      aria-label={`Remove ${medal.medalType.name} from list`}
                    >
                      <RemoveMedalIcon className="transition-transform active:scale-95" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border)]/50 pt-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`medal-count-${medal.medalType._id}`}
                        className="whitespace-nowrap text-xs font-medium text-[var(--color-text-muted)]"
                      >
                        Count
                      </label>
                      <input
                        id={`medal-count-${medal.medalType._id}`}
                        type="number"
                        min={1}
                        value={medal.count}
                        title="How many times this award appears (bars, stars, or total awards)."
                        onChange={(e) =>
                          updateMedal(medal.medalType._id, { count: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="h-9 w-[4.25rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-center text-sm tabular-nums text-[var(--color-text)] focus:border-[var(--color-gold)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/18"
                      />
                    </div>

                    <label
                      className="flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--color-text)]"
                      title="Earned with valor — affects scoring and the V on the rack."
                    >
                      <input
                        type="checkbox"
                        checked={medal.hasValor}
                        onChange={(e) =>
                          updateMedal(medal.medalType._id, {
                            hasValor: e.target.checked,
                            valorDevices: e.target.checked ? Math.max(1, medal.valorDevices || 1) : 0,
                          })
                        }
                        className="h-4 w-4 shrink-0 rounded border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-gold)]/30 focus:ring-offset-0"
                        style={{ accentColor: "var(--color-gold)" }}
                      />
                      <span>
                        V device
                        <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">(valor)</span>
                      </span>
                    </label>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
        {ribbonMedals.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">Rack preview</h2>
            <div className="flex justify-center">
              <RibbonRack
                medals={ribbonMedals}
                rowLayout="rankListPyramid"
                countryCode={countryCode}
                scale={3}
              />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-5 py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            }}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
          {published && (
            <Link
              href={`/heroes/${slug}`}
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              View public page
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
