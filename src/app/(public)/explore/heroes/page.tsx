import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import "@/lib/models/MedalType";
import HeroCard from "@/components/heroes/HeroCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Filtered hero list",
};

interface Props {
  searchParams: Promise<{ country?: string; branch?: string; tag?: string; limit?: string }>;
}

export default async function ExploreHeroesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const country = (sp.country || "US").toUpperCase();
  const branch = sp.branch?.trim() || "";
  const tag = sp.tag?.trim() || "";
  const limit = Math.min(100, Math.max(1, parseInt(sp.limit || "20", 10) || 20));

  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { published: true };
  // Many legacy heroes predate `countryCode`; treat missing/null/"" as US. Other countries require an explicit code.
  if (country === "US") {
    filter.$or = [
      { countryCode: { $regex: /^us$/i } },
      { countryCode: { $in: [null, ""] } },
    ];
  } else {
    filter.countryCode = country;
  }
  if (branch) filter.branch = branch;
  if (tag) filter.metadataTags = tag;

  const heroes = await Hero.find(filter)
    .populate("medals.medalType")
    .sort({ orderOverride: 1, score: -1, name: 1 })
    .limit(limit)
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized: any[] = JSON.parse(JSON.stringify(heroes));

  const qs = new URLSearchParams();
  qs.set("country", country);
  if (branch) qs.set("branch", branch);
  if (tag) qs.set("tag", tag);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link href={`/explore`} className="text-sm" style={{ color: "var(--color-gold)" }}>
          ← Back to explore
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-1">Top {limit} results</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Country: <strong>{country}</strong>
          {branch ? (
            <>
              {" "}
              · Branch: <strong>{branch}</strong>
            </>
          ) : null}
          {tag ? (
            <>
              {" "}
              · Tag: <strong>{tag}</strong>
            </>
          ) : null}
        </p>
      </div>

      {serialized.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No published heroes match these filters.
          {tag
            ? " Try another specialty tag or ask an admin to add metadata tags to hero records."
            : " Try a different country, branch, or specialty."}
        </p>
      ) : (
        <ul className="space-y-2">
          {serialized.map((h, i) => (
            <li key={h._id}>
              <HeroCard rank={i + 1} hero={h} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
