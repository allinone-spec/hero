"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const SAMPLE = `name,rank,branch,biography,wars,countryCode,published
John Example,Captain,U.S. Army,Short bio here,Vietnam|GWOT,US,false
Audie Murphy,,,,,,https://en.wikipedia.org/wiki/Audie_Murphy`;

type BatchSummary = {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  queuedRows: number;
  directCreatedRows: number;
  reviewRows: number;
  approvedRows: number;
  failedRows: number;
  createdAt: string;
};

type BatchItem = {
  id: string;
  heroName: string;
  status: string;
  sourceUrl: string;
  error: string;
  createdHeroId: string | null;
};

export default function AdminHeroCsvImportPage() {
  const [csv, setCsv] = useState(SAMPLE);
  const [filename, setFilename] = useState("bulk-import.csv");
  const [fileBase64, setFileBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    batchId: string;
    totalRows: number;
    queuedRows: number;
    directCreatedRows: number;
    failedRows: number;
    errors: string[];
  } | null>(null);
  const [batch, setBatch] = useState<{ batch: BatchSummary; items: BatchItem[] } | null>(null);
  const [recent, setRecent] = useState<BatchSummary[]>([]);
  const [error, setError] = useState("");

  async function loadRecent() {
    const res = await fetch("/api/admin/bulk-imports");
    if (!res.ok) return;
    const data = await res.json();
    setRecent(Array.isArray(data) ? data : []);
  }

  async function loadBatch(batchId: string) {
    const res = await fetch(`/api/admin/bulk-imports/${batchId}`);
    if (!res.ok) return;
    const data = await res.json();
    setBatch(data);
  }

  useEffect(() => {
    void loadRecent();
  }, []);

  useEffect(() => {
    if (!result?.batchId) return;
    void loadBatch(result.batchId);
    const timer = window.setInterval(() => void loadBatch(result.batchId), 4000);
    return () => window.clearInterval(timer);
  }, [result?.batchId]);

  const needsPolling = useMemo(() => {
    return batch?.batch.status === "queued" || batch?.batch.status === "processing";
  }, [batch]);

  useEffect(() => {
    if (!needsPolling || !result?.batchId) return;
    const timer = window.setInterval(() => void loadRecent(), 5000);
    return () => window.clearInterval(timer);
  }, [needsPolling, result?.batchId]);

  async function onFileChange(file: File | null) {
    if (!file) {
      setFileBase64("");
      setFilename("bulk-import.csv");
      return;
    }
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setBatch(null);
    try {
      const res = await fetch("/api/admin/bulk-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileBase64 ? { base64: fileBase64, filename } : { csv, filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }
      setResult({
        batchId: data.batchId,
        totalRows: data.totalRows ?? 0,
        queuedRows: data.queuedRows ?? 0,
        directCreatedRows: data.directCreatedRows ?? 0,
        failedRows: data.failedRows ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
      await loadRecent();
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
          Upload <code className="text-xs">.csv</code> or <code className="text-xs">.xlsx</code>. Required column:{" "}
          <code className="text-xs">name</code>. Optional:{" "}
          <code className="text-xs">slug</code>, <code className="text-xs">rank</code>,{" "}
          <code className="text-xs">branch</code>, <code className="text-xs">biography</code>,{" "}
          <code className="text-xs">wars</code> (use <code className="text-xs">|</code> or comma between wars),{" "}
          <code className="text-xs">countryCode</code>, <code className="text-xs">published</code>,{" "}
          <code className="text-xs">wikiUrl</code> or <code className="text-xs">wikipedia_url</code>.
          Rows with a Wikipedia URL go into the caretaker queue for review.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
          <label className="block text-sm font-medium">Spreadsheet upload</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => void onFileChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[var(--color-text-muted)]"
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            If a file is selected it takes priority over the textarea below.
          </p>
        </div>
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
          <p className="font-medium text-[var(--color-text)]">
            Batch queued: {result.totalRows} row(s), {result.directCreatedRows} direct draft(s),{" "}
            {result.queuedRows} caretaker review item(s), {result.failedRows} failed.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/admin/suggestions?tab=caretaker" className="text-[var(--color-gold)] hover:underline">
              Open caretaker review
            </Link>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 text-sm text-red-300 list-disc pl-5 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {batch && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[var(--color-text)]">{batch.batch.filename}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Status: {batch.batch.status} · review ready: {batch.batch.reviewRows} · approved: {batch.batch.approvedRows}
              </p>
            </div>
            <Link href={`/admin/suggestions?tab=caretaker&batchId=${batch.batch.id}`} className="text-sm text-[var(--color-gold)] hover:underline">
              Open review inbox
            </Link>
          </div>
          {batch.items.length > 0 && (
            <div className="mt-4 space-y-2">
              {batch.items.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate">{item.heroName || "Unnamed row"}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {item.sourceUrl || item.error || "Direct draft row"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent import batches</h2>
          <Link href="/admin/suggestions?tab=caretaker" className="text-sm text-[var(--color-gold)] hover:underline">
            Caretaker review
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No batches yet.</p>
          ) : (
            recent.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm flex items-center justify-between gap-3">
                <div>
                  <p>{item.filename}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.totalRows} rows · {item.queuedRows} queued · {item.approvedRows} approved · {item.failedRows} failed
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{item.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
