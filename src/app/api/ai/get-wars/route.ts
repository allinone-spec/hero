import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AIUsage from "@/lib/models/AIUsage";
import { getSession } from "@/lib/auth";
import { getWarList } from "@/lib/openai";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getWarList(session.email);

    // Log usage
    await dbConnect();
    await AIUsage.create({
      userEmail: session.email,
      action: "get_wars",
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      inputPreview: "Get US war list",
    });

    // Try to parse JSON from AI response
    let wars: unknown = [];
    try {
      wars = JSON.parse(result.content);
    } catch {
      wars = result.content;
    }

    return NextResponse.json({
      wars,
      tokens: result.totalTokens,
      cost: result.estimatedCost,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
