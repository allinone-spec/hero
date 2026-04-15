import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import HeroDetailClient, {
  type HeroDetail,
} from "@/app/(public)/heroes/[slug]/HeroDetailClient";
import { requirePrivilege } from "@/lib/auth";
import { getContextualRanksForHero } from "@/lib/contextual-ranks";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import { calculateScore } from "@/lib/scoring-engine";

export const dynamic = "force-dynamic";

const adminBackNavClass =
  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminViewHeroPage({ params }: Props) {
  const { id } = await params;

  try {
    await requirePrivilege("/admin/heroes", "canView");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") {
      redirect(`/login?role=admin&next=${encodeURIComponent(`/admin/heroes/${id}/view`)}`);
    }
    redirect("/admin");
  }

  await dbConnect();
  const hero = await Hero.findById(id).populate("medals.medalType").lean();
  if (!hero) notFound();

  interface PopulatedMedalType {
    name: string;
    basePoints: number;
    valorPoints?: number;
    requiresValorDevice?: boolean;
    inherentlyValor?: boolean;
    category?: "valor" | "service" | "foreign" | "other";
    countryCode?: string;
    tier?: number;
  }

  const medalData = hero.medals
    .filter((m: { medalType: PopulatedMedalType | null }) => m.medalType)
    .map(
      (m: {
        medalType: PopulatedMedalType;
        count: number;
        hasValor: boolean;
        valorDevices: number;
      }) => ({
        name: m.medalType.name,
        category: m.medalType.category,
        countryCode: m.medalType.countryCode,
        basePoints: m.medalType.basePoints,
        valorPoints: m.medalType.valorPoints ?? m.medalType.basePoints,
        requiresValorDevice: m.medalType.requiresValorDevice ?? false,
        inherentlyValor: m.medalType.inherentlyValor ?? false,
        valorTier: m.medalType.tier,
        count: m.count,
        hasValor: m.hasValor,
        valorDevices: m.valorDevices,
      }),
    );

  const scoreResult = calculateScore({
    medals: medalData,
    wars: hero.wars,
    combatTours: hero.combatTours,
    hadCombatCommand: hero.hadCombatCommand,
    powHeroism: hero.powHeroism,
    multiServiceOrMultiWar: hero.multiServiceOrMultiWar,
    submarineCommandEligible: hero.submarineCommandEligible !== false,
    combatAchievements: hero.combatAchievements || { type: "none" },
  });

  const [rankCount, totalPublished, contextualRanks] = await Promise.all([
    Hero.countDocuments({ published: true, score: { $gt: hero.score } }).then((c) => c + 1),
    Hero.countDocuments({ published: true }),
    getContextualRanksForHero({
      _id: String(hero._id),
      score: hero.score,
      branch: hero.branch,
      wars: hero.wars ?? [],
      combatAchievements: hero.combatAchievements,
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify(hero)) as HeroDetail;

  const navLeadingOverride = (
    <div className="flex flex-wrap items-center gap-3 min-w-0">
      <Link href="/admin/heroes" className={adminBackNavClass}>
        &lt; Heroes
      </Link>
      <Link href={`/admin/heroes/${id}/edit`} className="btn-primary text-sm py-1.5 px-4 shrink-0">
        Edit Hero
      </Link>
      {!hero.published && (
        <span className="text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 bg-amber-500/15 text-amber-600 border-amber-500/30">
          Draft
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-2">
      <HeroDetailClient
        hero={serialized}
        scoreBreakdown={scoreResult.breakdown}
        scoreTotal={scoreResult.total}
        rankPosition={rankCount}
        totalPublishedHeroes={totalPublished}
        contextualRanks={contextualRanks}
        profileBackHref="/admin/heroes"
        profileBackLabel="← Back to Heroes"
        navLeadingOverride={navLeadingOverride}
        hideSupportAdoptPanel
      />
    </div>
  );
}
