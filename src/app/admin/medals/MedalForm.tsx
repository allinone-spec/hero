"use client";

import { useState, useRef } from "react";
import ImageUpload from "@/components/ui/ImageUpload";
import MedalAvatarDesigner from "@/components/ui/MedalAvatarDesigner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export interface MedalFormState {
  name: string;
  shortName: string;
  otherNames: string[];
  category: string;
  basePoints: number;
  valorPoints: number;
  requiresValorDevice: boolean;
  inherentlyValor: boolean;
  tier: number;
  branch: string;
  precedenceOrder: number;
  description: string;
  imageUrl: string;
  ribbonImageUrl: string;
}

export const emptyMedalForm: MedalFormState = {
  name: "",
  shortName: "",
  otherNames: [],
  category: "valor",
  basePoints: 0,
  valorPoints: 0,
  requiresValorDevice: false,
  inherentlyValor: false,
  tier: 99,
  branch: "All",
  precedenceOrder: 99,
  description: "",
  imageUrl: "",
  ribbonImageUrl: "",
};

/* ── Fetch button for a single image field ───────────────── */
function FetchImageButton({
  medalName,
  type,
  onFetched,
}: {
  medalName: string;
  type: "medal" | "ribbon";
  onFetched: (url: string) => void;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!medalName.trim()) {
      setError("Enter a medal name first");
      return;
    }
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/medal-types/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medalName, type }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Server error (${res.status}). Check server logs.`);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Failed to fetch");
        return;
      }
      onFetched(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={fetching}
        className="btn-secondary text-xs flex items-center gap-1.5"
      >
        {fetching ? (
          <>
            <LoadingSpinner size="sm" />
            Fetching…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Fetch from Web
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ── URL input with Confirm button ────────────────────────── */
function UrlInputField({ onConfirm }: { onConfirm: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const url = inputRef.current?.value.trim() || "";
    if (!url) {
      setError("Enter a URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("Invalid URL");
      return;
    }
    setError("");
    onConfirm(url);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          placeholder="Paste image URL..."
          className="admin-input text-xs flex-1 min-w-0"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConfirm(); } }}
        />
        <button
          type="button"
          onClick={handleConfirm}
          className="btn-secondary text-xs px-2.5 shrink-0"
        >
          Confirm
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ── Medal Form ──────────────────────────────────────────── */
export default function MedalForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}: {
  values: MedalFormState;
  onChange: (v: MedalFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
}) {
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerTarget, setDesignerTarget] = useState<"medal" | "ribbon">("medal");
  const wikiHref = values.name.trim()
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(values.name.trim().replace(/\s+/g, "_"))}`
    : "https://en.wikipedia.org/wiki/Main_Page";

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5"
    >
      {/* Basic fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Name</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            className="admin-input"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Short Name</label>
          <input
            type="text"
            value={values.shortName}
            onChange={(e) => onChange({ ...values, shortName: e.target.value })}
            className="admin-input"
            required
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Other Names / Aliases</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.otherNames.map((alt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-0.5 text-xs"
              >
                {alt}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...values, otherNames: values.otherNames.filter((_, j) => j !== i) })
                  }
                  className="text-[var(--color-text-muted)] hover:text-red-400 ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add alternate name..."
              className="admin-input text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !values.otherNames.includes(val)) {
                    onChange({ ...values, otherNames: [...values.otherNames, val] });
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary text-xs px-3"
              onClick={(e) => {
                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                const val = input.value.trim();
                if (val && !values.otherNames.includes(val)) {
                  onChange({ ...values, otherNames: [...values.otherNames, val] });
                  input.value = "";
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Category</label>
          <select
            value={values.category}
            onChange={(e) => onChange({ ...values, category: e.target.value })}
            className="admin-input"
          >
            <option value="valor">Valor</option>
            <option value="service">Service</option>
            <option value="foreign">Foreign</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Branch</label>
          <select
            value={values.branch}
            onChange={(e) => onChange({ ...values, branch: e.target.value })}
            className="admin-input"
          >
            <option value="All">All Branches</option>
            <option value="Army">Army</option>
            <option value="Navy">Navy</option>
            <option value="Navy/Marine Corps">Navy/Marine Corps</option>
            <option value="Air Force">Air Force</option>
            <option value="Coast Guard">Coast Guard</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Valor Points (Heroism)</label>
          <input
            type="number"
            min={0}
            value={values.valorPoints}
            onChange={(e) => onChange({ ...values, valorPoints: parseInt(e.target.value) || 0 })}
            className="admin-input"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Base Points (Legacy)</label>
          <input
            type="number"
            min={0}
            value={values.basePoints}
            onChange={(e) => onChange({ ...values, basePoints: parseInt(e.target.value) || 0 })}
            className="admin-input"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tier</label>
          <input
            type="number"
            min={1}
            value={values.tier}
            onChange={(e) => onChange({ ...values, tier: parseInt(e.target.value) || 99 })}
            className="admin-input"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Precedence Order</label>
          <input
            type="number"
            min={1}
            value={values.precedenceOrder}
            onChange={(e) => onChange({ ...values, precedenceOrder: parseInt(e.target.value) || 99 })}
            className="admin-input"
          />
        </div>
      </div>

      {/* Valor flags */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={values.inherentlyValor}
            onChange={(e) => onChange({ ...values, inherentlyValor: e.target.checked })}
            className="rounded"
          />
          <span className="text-[var(--color-text-muted)]">Inherently Valor</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={values.requiresValorDevice}
            onChange={(e) => onChange({ ...values, requiresValorDevice: e.target.checked })}
            className="rounded"
          />
          <span className="text-[var(--color-text-muted)]">Requires &quot;V&quot; Device</span>
        </label>
      </div>

      <div>
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Description</label>
        <textarea
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          className="admin-input min-h-[80px]"
          rows={3}
        />
      </div>

      {/* ── Two image sections side by side ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Medal Image */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
            Medal Image
          </label>
          <ImageUpload
            value={values.imageUrl}
            onChange={(url) => onChange({ ...values, imageUrl: url })}
            folder="Heroes/Medal"
            label="Medal"
          />
          <div className="flex gap-2">
            <FetchImageButton
              medalName={values.name}
              type="medal"
              onFetched={(url) => onChange({ ...values, imageUrl: url })}
            />
            <button
              type="button"
              onClick={() => { setDesignerTarget("medal"); setShowDesigner(true); }}
              className="btn-secondary text-xs"
            >
              Design
            </button>
          </div>
          <UrlInputField onConfirm={(url) => onChange({ ...values, imageUrl: url })} />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Note: auto-fetched images may be incorrect. Check the Wikipedia medal page and paste the exact image URL if needed.
          </p>
          <a
            href={wikiHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-gold)] hover:underline inline-flex"
          >
            Open Wikipedia page
          </a>
        </div>

        {/* Ribbon Image */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">
            Ribbon Image
          </label>
          <ImageUpload
            value={values.ribbonImageUrl}
            onChange={(url) => onChange({ ...values, ribbonImageUrl: url })}
            folder="Heroes/Ribbon"
            label="Ribbon"
          />
          <div className="flex gap-2">
            <FetchImageButton
              medalName={values.name}
              type="ribbon"
              onFetched={(url) => onChange({ ...values, ribbonImageUrl: url })}
            />
            <button
              type="button"
              onClick={() => { setDesignerTarget("ribbon"); setShowDesigner(true); }}
              className="btn-secondary text-xs"
            >
              Design
            </button>
          </div>
          <UrlInputField onConfirm={(url) => onChange({ ...values, ribbonImageUrl: url })} />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Note: auto-fetched ribbon images may be incorrect. Check the Wikipedia medal page and paste the exact ribbon URL if needed.
          </p>
          <a
            href={wikiHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-gold)] hover:underline inline-flex"
          >
            Open Wikipedia page
          </a>
        </div>
      </div>

      {showDesigner && (
        <MedalAvatarDesigner
          onClose={() => setShowDesigner(false)}
          onSave={(url) => {
            if (designerTarget === "ribbon") {
              onChange({ ...values, ribbonImageUrl: url });
            } else {
              onChange({ ...values, imageUrl: url });
            }
            setShowDesigner(false);
          }}
        />
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="btn-primary inline-flex items-center justify-center gap-2"
          disabled={saving}
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
