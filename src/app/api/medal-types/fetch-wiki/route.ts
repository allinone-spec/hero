import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import { scrapeMedalWikipedia } from "@/lib/medal-wiki-scraper";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const WIKI_HEADERS = { "User-Agent": "HeroesArchive/1.0 (educational research)" };

async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { headers: WIKI_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "Heroes/MedalWiki", resource_type: "image", format: "png" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as { secure_url: string });
        }
      )
      .end(buffer);
  });
  return result.secure_url;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();

    // Bulk mode: default refreshes never-fetched medals.
    // Set forceAll=true to refresh all existing medals.
    if (body.bulk === true) {
      const query = body.forceAll === true ? {} : { wikiLastFetched: null };
      const medals = await MedalType.find(query).select("_id name").lean();
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const medal of medals) {
        try {
          const data = await scrapeMedalWikipedia(medal.name);
          if (!data) {
            failed++;
            errors.push(`${medal.name}: No Wikipedia article found`);
            continue;
          }

          // Upload images to Cloudinary
          const wikiImages = [];
          for (const img of data.images.slice(0, 4)) {
            try {
              const cloudUrl = await uploadImageToCloudinary(img.url);
              wikiImages.push({ url: cloudUrl, caption: img.caption, sourceUrl: img.url });
            } catch { /* skip failed image uploads */ }
          }

          await MedalType.findByIdAndUpdate(medal._id, {
            wikipediaUrl: data.wikipediaUrl,
            wikiSummary: data.wikiSummary,
            history: data.history,
            awardCriteria: data.awardCriteria,
            appearance: data.appearance,
            established: data.established,
            wikiImages,
            wikiLastFetched: new Date(),
          });
          success++;

          // Small delay to be polite to Wikipedia
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          failed++;
          errors.push(`${medal.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      return NextResponse.json({ success, failed, total: medals.length, errors: errors.slice(0, 20) });
    }

    // Single medal mode
    const { medalId } = body;
    if (!medalId) {
      return NextResponse.json({ error: "medalId is required" }, { status: 400 });
    }

    const medal = await MedalType.findById(medalId);
    if (!medal) {
      return NextResponse.json({ error: "Medal not found" }, { status: 404 });
    }

    const data = await scrapeMedalWikipedia(medal.name);
    if (!data) {
      return NextResponse.json({ error: `No Wikipedia article found for "${medal.name}"` }, { status: 404 });
    }

    // Upload images to Cloudinary
    const wikiImages = [];
    for (const img of data.images.slice(0, 4)) {
      try {
        const cloudUrl = await uploadImageToCloudinary(img.url);
        wikiImages.push({ url: cloudUrl, caption: img.caption, sourceUrl: img.url });
      } catch { /* skip failed image uploads */ }
    }

    await MedalType.findByIdAndUpdate(medalId, {
      wikipediaUrl: data.wikipediaUrl,
      wikiSummary: data.wikiSummary,
      history: data.history,
      awardCriteria: data.awardCriteria,
      appearance: data.appearance,
      established: data.established,
      wikiImages,
      wikiLastFetched: new Date(),
    });

    return NextResponse.json({
      success: true,
      wikipediaUrl: data.wikipediaUrl,
      sectionsFound: {
        summary: !!data.wikiSummary,
        history: !!data.history,
        awardCriteria: !!data.awardCriteria,
        appearance: !!data.appearance,
      },
      imagesUploaded: wikiImages.length,
      established: data.established,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Wikipedia content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
