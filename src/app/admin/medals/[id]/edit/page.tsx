"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import MedalForm, { emptyMedalForm, MedalFormState } from "../../MedalForm";
import { AdminLoader } from "@/components/ui/AdminLoader";

export default function EditMedalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<MedalFormState>({ ...emptyMedalForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [medalName, setMedalName] = useState("");

  useEffect(() => {
    fetch(`/api/medal-types/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setMedalName(data.name);
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
    </div>
  );
}
