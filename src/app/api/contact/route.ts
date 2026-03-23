import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import Contact from "@/lib/models/Contact";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (message.trim().length > 5000) {
    return NextResponse.json(
      { error: "Message must be under 5000 characters" },
      { status: 400 }
    );
  }

  await dbConnect();

  // Verify user exists and is active
  const user = await AdminUser.findOne({ email: session.email });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Save contact message to database
  await Contact.create({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  });

  // Log the contact message as an activity
  const { logActivity } = await import("@/lib/activity-logger");
  await logActivity({
    action: "contact_message",
    category: "system",
    description: `Contact message from ${name.trim()} (${email.trim()})`,
    userEmail: session.email,
    metadata: {
      contactName: name.trim(),
      contactEmail: email.trim(),
      message: message.trim(),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.groupSlug !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await dbConnect();
    await Contact.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Only super admins can view all contacts
    if (session.groupSlug !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ contacts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
