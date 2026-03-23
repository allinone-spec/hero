"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import HeroForm from "../../HeroForm";

export default function EditHeroPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hero, setHero] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/heroes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        // Convert populated medal types back to IDs for the form
        if (data.medals) {
          data.medals = data.medals.filter((m: { medalType: unknown }) => m.medalType != null).map(
            (m: { medalType: { _id: string } | string; count: number; hasValor: boolean; valorDevices: number; arrowheads?: number; deviceImages?: { url: string; deviceType: string; count: number }[]; wikiRibbonUrl?: string }) => ({
              medalType:
                typeof m.medalType === "object" && m.medalType ? m.medalType._id : m.medalType,
              count: m.count,
              hasValor: m.hasValor,
              valorDevices: m.valorDevices,
              arrowheads: m.arrowheads || 0,
              deviceImages: m.deviceImages || [],
              wikiRibbonUrl: m.wikiRibbonUrl || "",
            })
          );
        }
        setHero(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="text-[var(--color-text-muted)]">Loading hero data...</div>;
  }

  if (!hero || hero.error) {
    return <div className="text-red-400">Hero not found.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit: {hero.name}</h1>
      <HeroForm initialData={hero} isEdit />
    </div>
  );
}
