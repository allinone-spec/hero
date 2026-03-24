"use client";

import Link from "next/link";
import { useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const SAMPLE = `name,rank,branch,biography,wars,countryCode,published
John Example,Captain,U.S. Army,Short bio here,Vietnam|GWOT,US,false`;

export default function AdminHeroCsvImportPage() {
  const [csv, setCsv] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/heroes/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }
      setResult({ created: data.created ?? 0, errors: Array.isArray(data.errors) ? data.errors : [] });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/heroes" className="text-sm text-[var(--color-gold)] hover:underline">
          ← Heroes
        </Link>
        <h1 className="text-2xl font-bold mt-2">Bulk hero import (CSV)</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          Required column: <code className="text-xs">name</code>. Optional:{" "}
          <code className="text-xs">slug</code>, <code className="text-xs">rank</code>,{" "}
          <code className="text-xs">branch</code>, <code className="text-xs">biography</code>,{" "}
          <code className="text-xs">wars</code> (use <code className="text-xs">|</code> or comma between wars),{" "}
          <code className="text-xs">countryCode</code>, <code className="text-xs">published</code> (true/false).
          Medals are not imported here — edit each hero after creation.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={16}
          className="w-full font-mono text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text)]"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg px-5 py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner size="sm" className="text-[var(--color-badge-text)]" label="Importing" />
              Importing…
            </span>
          ) : (
            "Run import"
          )}
        </button>
      </form>

      {result && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] p-4">
          <p className="font-medium text-[var(--color-text)]">Created {result.created} hero(es).</p>
          {result.errors.length > 0 && (
            <ul className="mt-3 text-sm text-red-300 list-disc pl-5 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
