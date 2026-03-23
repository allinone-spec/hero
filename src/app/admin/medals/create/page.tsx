"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MedalForm, { emptyMedalForm, MedalFormState } from "../MedalForm";

export default function CreateMedalPage() {
  const router = useRouter();
  const [form, setForm] = useState<MedalFormState>({ ...emptyMedalForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medal-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/medals");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create medal");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-bold">Add</h1>
      </div>

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
        submitLabel="Add"
        saving={saving}
      />
    </div>
  );
}
