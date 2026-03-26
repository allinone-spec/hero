"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import MedalForm, { emptyMedalForm, MedalFormState } from "../../MedalForm";
import { AdminLoader } from "@/components/ui/AdminLoader";
import { splitWikiParagraphs } from "@/lib/medal-wiki-display";

interface WikiContentState {
  wikipediaUrl?: string;
  wikiSummary?: string;
  awardCriteria?: string;
  history?: string;
  appearance?: string;
  established?: string;
}

export default function EditMedalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<MedalFormState>({ ...emptyMedalForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingWiki, setRefreshingWiki] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [error, setError] = useState("");
  const [wikiInfo, setWikiInfo] = useState<{ lastFetched?: string | null }>({});
  const [wikiContent, setWikiContent] = useState<WikiContentState>({});
  const [statusMsg, setStatusMsg] = useState("");
  const [medalName, setMedalName] = useState("");

  useEffect(() => {
    fetch(`/api/medal-types/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setMedalName(data.name);
        setWikiInfo({ lastFetched: data.wikiLastFetched ?? null });
        setWikiContent({
          wikipediaUrl: data.wikipediaUrl || "",
          wikiSummary: data.wikiSummary || "",
          awardCriteria: data.awardCriteria || "",
          history: data.history || "",
          appearance: data.appearance || "",
          established: data.established || "",
        });
        setForm({
          name: data.name || "",
          shortName: data.shortName || "",
          otherNames: Array.isArray(data.otherNames) ? data.otherNames : [],
          category: data.category || "valor",
          basePoints: data.basePoints ?? 0,
          valorPoints: data.valorPoints ?? 0,
          requiresValorDevice: data.requiresValorDevice ?? false,
          inherentlyValor: data.inherentlyValor ?? false,
          tier: data.tier ?? 99,
          branch: data.branch ?? "All",
          precedenceOrder: data.precedenceOrder ?? 99,
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          ribbonImageUrl: data.ribbonImageUrl || "",
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Medal not found");
        setLoading(false);
      });
  }, [id]);

  const handleRefreshWiki = async () => {
    setRefreshingWiki(true);
    setError("");
    setStatusMsg("");
    try {
      const res = await fetch("/api/medal-types/fetch-wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medalId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to refresh wiki content");
        return;
      }
      setStatusMsg("Wikipedia content refreshed.");
      const refreshRes = await fetch(`/api/medal-types/${id}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setWikiInfo({ lastFetched: refreshed.wikiLastFetched ?? null });
        setWikiContent({
          wikipediaUrl: refreshed.wikipediaUrl || "",
          wikiSummary: refreshed.wikiSummary || "",
          awardCriteria: refreshed.awardCriteria || "",
          history: refreshed.history || "",
          appearance: refreshed.appearance || "",
          established: refreshed.established || "",
        });
      }
    } catch {
      setError("Network error while refreshing wiki content");
    } finally {
      setRefreshingWiki(false);
    }
  };

  const handleAutoPopulateSingle = async () => {
    setAutoPopulating(true);
    setError("");
    setStatusMsg("");
    try {
      const res = await fetch("/api/medal-types/auto-populate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medalId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to auto-populate this medal");
        return;
      }

      const refreshRes = await fetch(`/api/medal-types/${id}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setMedalName(refreshed.name);
        setForm({
          name: refreshed.name || "",
          shortName: refreshed.shortName || "",
          otherNames: Array.isArray(refreshed.otherNames) ? refreshed.otherNames : [],
          category: refreshed.category || "valor",
          basePoints: refreshed.basePoints ?? 0,
          valorPoints: refreshed.valorPoints ?? 0,
          requiresValorDevice: refreshed.requiresValorDevice ?? false,
          inherentlyValor: refreshed.inherentlyValor ?? false,
          tier: refreshed.tier ?? 99,
          branch: refreshed.branch ?? "All",
          precedenceOrder: refreshed.precedenceOrder ?? 99,
          description: refreshed.description || "",
          imageUrl: refreshed.imageUrl || "",
          ribbonImageUrl: refreshed.ribbonImageUrl || "",
        });
      }
      setStatusMsg("AI auto-populated this medal's scoring/profile fields.");
    } catch {
      setError("Network error while auto-populating this medal");
    } finally {
      setAutoPopulating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/medal-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/medals");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update medal");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoader label="Loading medal..." />;

  const summaryParas = splitWikiParagraphs(wikiContent.wikiSummary);
  const criteriaParas = splitWikiParagraphs(wikiContent.awardCriteria);
  const historyParas = splitWikiParagraphs(wikiContent.history);
  const appearanceParas = splitWikiParagraphs(wikiContent.appearance);
  const hasAnyWikiContent =
    summaryParas.length > 0 ||
    criteriaParas.length > 0 ||
    historyParas.length > 0 ||
    appearanceParas.length > 0 ||
    Boolean(wikiContent.wikipediaUrl?.trim());

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/medals"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Medals
        </Link>
        <h1 className="text-2xl font-bold">Edit: {medalName}</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAutoPopulateSingle}
          disabled={autoPopulating}
          className="btn-secondary text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {autoPopulating ? "Auto Populating..." : "Auto Populate (AI)"}
        </button>
        <button
          type="button"
          onClick={handleRefreshWiki}
          disabled={refreshingWiki}
          className="btn-secondary text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {refreshingWiki ? "Refreshing Wiki..." : "Refresh Wiki Content"}
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          Last wiki refresh:{" "}
          {wikiInfo.lastFetched ? new Date(wikiInfo.lastFetched).toLocaleString() : "never"}
        </span>
        <button
          type="button"
          onClick={() => setShowWikiModal(true)}
          className="btn-secondary text-xs"
        >
          View Wiki Content
        </button>
      </div>

      {statusMsg && (
        <div className="text-sm text-green-500 bg-green-500/10 border border-green-500/20 p-3 rounded-lg mb-4">
          {statusMsg}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <MedalForm
        values={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/medals")}
        submitLabel="Update Medal Type"
        saving={saving}
      />

      {showWikiModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setShowWikiModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold">Wiki Content: {medalName}</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Last refresh: {wikiInfo.lastFetched ? new Date(wikiInfo.lastFetched).toLocaleString() : "never"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWikiModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>

            {wikiContent.established?.trim() && (
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                <span className="font-semibold text-[var(--color-gold)]">Established:</span>{" "}
                {wikiContent.established.trim()}
              </p>
            )}

            {wikiContent.wikipediaUrl?.trim() && (
              <p className="mb-4">
                <a
                  href={wikiContent.wikipediaUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-gold)] hover:underline"
                >
                  Open Wikipedia article
                </a>
              </p>
            )}

            {!hasAnyWikiContent && (
              <p className="text-sm text-[var(--color-text-muted)]">
                No wiki content stored yet. Click <strong>Refresh Wiki Content</strong> first.
              </p>
            )}

            {summaryParas.length > 0 && (
              <section className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">Summary</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {summaryParas.map((p, i) => <p key={`s-${i}`}>{p}</p>)}
                </div>
              </section>
            )}

            {criteriaParas.length > 0 && (
              <section className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">How It Is Awarded</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {criteriaParas.map((p, i) => <p key={`c-${i}`}>{p}</p>)}
                </div>
              </section>
            )}

            {historyParas.length > 0 && (
              <section className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">History</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {historyParas.map((p, i) => <p key={`h-${i}`}>{p}</p>)}
                </div>
              </section>
            )}

            {appearanceParas.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-2">Appearance</h3>
                <div className="space-y-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {appearanceParas.map((p, i) => <p key={`a-${i}`}>{p}</p>)}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
