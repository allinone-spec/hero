import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import HeroSuggestion from "@/lib/models/HeroSuggestion";
import AdminUser from "@/lib/models/AdminUser";
import CoffeeTransaction from "@/lib/models/CoffeeTransaction";
import { getSession } from "@/lib/auth";

// DELETE — admin can delete any, logged-in user can delete their own
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const suggestion = await HeroSuggestion.findById(id);
    if (!suggestion) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Allow admin to delete any, or user to delete their own
    if (suggestion.submittedByEmail !== session.email && session.groupSlug !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await HeroSuggestion.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — admin only, update status (e.g. deny a suggestion)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.groupSlug !== "super-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["new", "reviewed", "denied"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();
    const suggestion = await HeroSuggestion.findById(id);
    if (!suggestion) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Refund coffee when admin denies a "new" suggestion
    if (status === "denied" && suggestion.status === "new" && suggestion.submittedByEmail) {
      const user = await AdminUser.findOneAndUpdate(
        { email: suggestion.submittedByEmail },
        { $inc: { coffeeBalance: 1 } },
        { new: true }
      );
      if (user) {
        await CoffeeTransaction.create({
          userId: user._id,
          amount: 1,
          type: "refund_rejected",
          relatedSuggestionId: suggestion._id,
        });
      }
    }

    suggestion.status = status;
    await suggestion.save();

    return NextResponse.json({ success: true, suggestion });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
