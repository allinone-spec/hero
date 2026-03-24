import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/mongodb";
import Hero from "@/lib/models/Hero";
import { assertHeroOwnerAccess } from "@/lib/hero-access";
import { getSiteSession } from "@/lib/site-auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "Heroes/TributePortraits";

export async function POST(req: NextRequest) {
  const session = await getSiteSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Image upload is not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slug = String(formData.get("slug") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    await dbConnect();
    const hero = await Hero.findOne({ slug }).select("ownerUserId adoptionExpiry").lean();
    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }
    try {
      assertHeroOwnerAccess(hero, session);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: FOLDER, resource_type: "image" }, (error, res) => {
          if (error || !res) reject(error ?? new Error("Upload failed"));
          else resolve(res as { secure_url: string });
        })
        .end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
