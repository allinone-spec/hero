import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import type { Metadata } from "next";
import MedalDetailView from "./MedalDetailView";
import BackButton from "./BackButton";
import { medalShortLabelForDisplay } from "@/lib/medal-short-name";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await dbConnect();
  const { id } = await params;
  const medal = await MedalType.findById(id).select("name shortName description category").lean();

  if (!medal) return { title: "Medal Not Found" };

  const name = String(medal.name);
  const shortLabel = medalShortLabelForDisplay(String(medal.shortName ?? ""), name);

  return {
    title: `${name} (${shortLabel})`,
    description: medal.description || `Details about the ${name} military decoration.`,
    openGraph: {
      title: `${name} — Medals N Bongs`,
      description: medal.description || `${name} — ${medal.category} decoration.`,
    },
    keywords: [name, shortLabel, "military medal", medal.category, "military decoration"],
  };
}

interface MedalHero {
  _id: string;
  name: string;
  slug: string;
  rank: string;
  avatarUrl?: string;
  score: number;
}

export default async function MedalDetailPage({ params }: Props) {
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
      <BackButton />

      <MedalDetailView medal={serializedMedal} heroes={heroesWithCount} />
    </div>
  );
}
