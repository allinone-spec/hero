import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import MedalDetailView from "./MedalDetailView";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

interface MedalHero {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  avatarUrl?: string;
  score: number;
}

export default async function AdminMedalDetailPage({ params }: Props) {
  await dbConnect();
  const { id } = await params;

  const medal = await MedalType.findById(id).lean();
  if (!medal) notFound();

  // Find heroes who have this medal
  const heroes = await Hero.find({
    published: true,
    "medals.medalType": medal._id,
  })
    .select("name slug rank avatarUrl score medals")
    .sort({ score: -1 })
    .limit(20)
    .lean();

  const heroesWithCount: (MedalHero & { medalCount: number; hasValor: boolean })[] = heroes.map(
    (h: Record<string, unknown>) => {
      const entry = (h.medals as { medalType: unknown; count: number; hasValor: boolean }[])?.find(
        (m) => String(m.medalType) === String(medal._id)
      );
      return {
        _id: String(h._id),
        name: h.name as string,
        slug: h.slug as string,
        rank: h.rank as string,
        avatarUrl: h.avatarUrl as string | undefined,
        score: h.score as number,
        medalCount: entry?.count ?? 1,
        hasValor: entry?.hasValor ?? false,
      };
    }
  );

  const serializedMedal = JSON.parse(JSON.stringify(medal));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/admin/medals-gallery"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] mb-6 inline-flex items-center gap-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Medal Catalog
      </Link>

      <MedalDetailView medal={serializedMedal} heroes={heroesWithCount} />
    </div>
  );
}
