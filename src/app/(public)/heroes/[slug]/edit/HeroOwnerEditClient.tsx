"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RibbonRack from "@/components/ribbon-rack/RibbonRack";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ImageUpload from "@/components/ui/ImageUpload";
import { buildRibbonRackMedals } from "@/lib/rack-engine";

const profileOwnerBackClass =
  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1";

function ProfileOwnerBackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
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

export default function HeroOwnerEditClient({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [biography, setBiography] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [medals, setMedals] = useState<OwnerMedalEntry[]>([]);
  const [catalog, setCatalog] = useState<MedalOption[]>([]);
  const [selectedMedalId, setSelectedMedalId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const [res, medalsRes] = await Promise.all([
          fetch(`/api/site/hero-for-edit?slug=${encodeURIComponent(slug)}`),
          fetch("/api/medal-types", { cache: "no-store" }),
        ]);
        const data = await res.json();
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
        setBiography(data.biography || "");
        setAvatarUrl(data.avatarUrl || "");
        setPublished(Boolean(data.published));
        setMedals(Array.isArray(data.medals) ? data.medals : []);
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

  const ribbonMedals = useMemo(() => buildRibbonRackMedals(medals), [medals]);

  function addMedal() {
    if (!selectedMedalId) return;
    const match = catalog.find((m) => m._id === selectedMedalId);
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
    setMedals((prev) => prev.filter((m) => m.medalType._id !== medalId));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/heroes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biography,
          avatarUrl,
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
      router.push("/my-heroes");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">Loading…</div>
    );
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
          You can update the short biography, portrait, and medal list. The ribbon rack preview re-renders from the
          same precedence engine used on the public page.
          {!published && " This hero is not published yet; the public page may be unavailable."}
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Biography</label>
          <textarea
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Portrait</label>
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
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
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="https://…"
            autoComplete="off"
          />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Medals</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedMedalId}
                onChange={(e) => setSelectedMedalId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              >
                <option value="">Add a medal from inventory…</option>
                {catalog.map((medal) => (
                  <option key={medal._id} value={medal._id}>
                    {medal.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addMedal}
                disabled={!selectedMedalId}
                className="rounded-lg border border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10 px-4 py-2 text-sm font-medium text-[var(--color-gold)] disabled:opacity-50"
              >
                Add medal
              </button>
            </div>
          </div>

          {medals.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No medals selected yet. Add medals from the dropdown to rebuild the rack.
            </p>
          ) : (
            <div className="space-y-3">
              {medals.map((medal) => (
                <div
                  key={medal.medalType._id}
                  className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 md:grid-cols-[minmax(0,1fr)_100px_100px_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--color-text)]">{medal.medalType.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Precedence {medal.medalType.precedenceOrder}
                    </div>
                  </div>
                  <label className="text-sm text-[var(--color-text-muted)]">
                    Count
                    <input
                      type="number"
                      min={1}
                      value={medal.count}
                      onChange={(e) =>
                        updateMedal(medal.medalType._id, { count: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
                    />
                  </label>
                  <label className="flex items-center gap-2 self-end text-sm text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={medal.hasValor}
                      onChange={(e) =>
                        updateMedal(medal.medalType._id, {
                          hasValor: e.target.checked,
                          valorDevices: e.target.checked ? Math.max(1, medal.valorDevices || 1) : 0,
                        })
                      }
                    />
                    Valor
                  </label>
                  <button
                    type="button"
                    onClick={() => removeMedal(medal.medalType._id)}
                    className="rounded-lg border border-red-500/35 px-3 py-2 text-sm text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {ribbonMedals.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">Rack preview</h2>
            <div className="flex justify-center">
              <RibbonRack medals={ribbonMedals} maxPerRow={3} scale={3} />
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
