import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";
import { generateHeroDescription } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scrapedData } = await req.json();
  if (!scrapedData || typeof scrapedData !== "string") {
    return NextResponse.json({ error: "scrapedData is required" }, { status: 400 });
  }

  try {
    const result = await generateHeroDescription(scrapedData, session.email);

    // Log usage
    await dbConnect();
    await AIUsage.create({
      userEmail: session.email,
      action: "generate_description",
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      inputPreview: scrapedData.slice(0, 200),
    });

    return NextResponse.json({
      description: result.content,
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
