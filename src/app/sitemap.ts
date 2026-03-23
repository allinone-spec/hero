import { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let heroUrls: MetadataRoute.Sitemap = [];

  try {
    await dbConnect();
    const heroes = await Hero.find({ published: true }).select("slug updatedAt").lean();

    heroUrls = heroes.map((hero) => ({
      url: `https://metalsnbongs.com/heroes/${hero.slug}`,
      lastModified: hero.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB not available at build time, return static entries only
  }

  return [
    {
      url: "https://metalsnbongs.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://metalsnbongs.com/medals",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://metalsnbongs.com/scoring",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...heroUrls,
  ];
}
