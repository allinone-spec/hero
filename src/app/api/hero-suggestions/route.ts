import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroSuggestion from "@/lib/models/HeroSuggestion";
import AdminUser from "@/lib/models/AdminUser";
import Hero from "@/lib/models/Hero";
import CoffeeTransaction from "@/lib/models/CoffeeTransaction";
import { getSession } from "@/lib/auth";

// POST — requires login + 1 coffee
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please sign in to submit a suggestion" }, { status: 401 });
    }

    const { wikipediaUrl } = await req.json();

    if (!wikipediaUrl || typeof wikipediaUrl !== "string") {
      return NextResponse.json({ error: "Wikipedia URL is required" }, { status: 400 });
    }

    const trimmed = wikipediaUrl.trim();
    if (!trimmed.includes("wikipedia.org/")) {
      return NextResponse.json({ error: "Please enter a valid Wikipedia URL" }, { status: 400 });
    }

    await dbConnect();

    // Check if hero already published
    const heroName = extractHeroNameFromUrl(trimmed);
    if (heroName) {
      const slug = heroName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const existingHero = await Hero.findOne({ slug, published: true }).lean();
      if (existingHero) {
        return NextResponse.json({ error: "already_published", heroName }, { status: 409 });
      }
    }

    // Atomically deduct 1 coffee (only if balance >= 1)
    const user = await AdminUser.findOneAndUpdate(
      { email: session.email, coffeeBalance: { $gte: 1 } },
      { $inc: { coffeeBalance: -1 } },
      { returnDocument: "after" }
    );

    if (!user) {
      const exists = await AdminUser.findOne({ email: session.email }).lean();
      if (!exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "no_coffee" }, { status: 402 });
    }

    const submittedBy = user.name || session.email;

    const suggestion = await HeroSuggestion.create({
      wikipediaUrl: trimmed,
      submittedBy,
      submittedByEmail: session.email,
    });

    await CoffeeTransaction.create({
      userId: user._id,
      amount: -1,
      type: "submit",
      relatedSuggestionId: suggestion._id,
    });

    return NextResponse.json({ success: true, balance: user.coffeeBalance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — admin gets all, logged-in user with ?mine=true gets own suggestions
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const mine = req.nextUrl.searchParams.get("mine");
    const filter = mine === "true"
      ? { $or: [{ submittedByEmail: session.email }, { submittedByEmail: { $in: ["", null] }, submittedBy: session.email }] }
      : {};
    const suggestions = await HeroSuggestion.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(suggestions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractHeroNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("wikipedia.org")) return null;
    const match = parsed.pathname.match(/^\/wiki\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]).replace(/_/g, " ");
  } catch {
    return null;
  }
}
