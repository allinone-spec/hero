"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminLoader } from "@/components/ui/AdminLoader";
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
          data.medals = data.medals
            .map(
              (m: {
                medalType: { _id: unknown } | string | null | undefined;
                count: number;
                hasValor: boolean;
                valorDevices: number;
                arrowheads?: number;
                deviceImages?: { url: string; deviceType: string; count: number }[];
                wikiRibbonUrl?: string;
              }) => {
                const raw = m.medalType;
                const medalType =
                  raw != null && typeof raw === "object" && "_id" in raw
                    ? String((raw as { _id: unknown })._id)
                    : raw != null
                      ? String(raw)
                      : "";
                if (!medalType) return null;
                return {
                  medalType,
                  count: m.count,
                  hasValor: m.hasValor,
                  valorDevices: m.valorDevices,
                  arrowheads: m.arrowheads || 0,
                  deviceImages: m.deviceImages || [],
                  wikiRibbonUrl: m.wikiRibbonUrl || "",
                };
              },
            )
            .filter(Boolean);
        }
        setHero(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <AdminLoader label="Loading hero data…" />;
  }

  if (!hero || hero.error) {
    return <div className="text-red-400">Hero not found.</div>;
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Edit: {hero.name}</h1>
      <HeroForm initialData={hero} isEdit />
    </div>
  );
}
