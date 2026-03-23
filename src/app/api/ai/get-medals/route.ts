import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";
import { getMedalList } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const result = await getMedalList(query, session.email);

    // Log usage
    await dbConnect();
    await AIUsage.create({
      userEmail: session.email,
      action: "get_medals",
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      inputPreview: query.slice(0, 200),
    });

    // Try to parse JSON from AI response
    let medals: unknown = [];
    try {
      medals = JSON.parse(result.content);
    } catch {
      medals = result.content;
    }

    return NextResponse.json({
      medals,
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
