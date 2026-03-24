import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSiteSession } from "@/lib/site-auth";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/lib/models/AdminUser";
import { User } from "@/lib/models/User";
import Contact from "@/lib/models/Contact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(String(email).trim())) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (message.trim().length > 5000) {
    return NextResponse.json(
      { error: "Message must be under 5000 characters" },
      { status: 400 }
    );
  }

  const adminSession = await getSession();
  const siteSession = adminSession ? null : await getSiteSession();

  await dbConnect();

  let actorEmail: string;
  let source: "admin" | "site" | "guest";

  if (adminSession) {
    const user = await AdminUser.findOne({ email: adminSession.email });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    actorEmail = adminSession.email;
    source = "admin";
  } else if (siteSession) {
    const siteUser = await User.findById(siteSession.sub).select("email").lean();
    if (!siteUser?.email || siteUser.email !== siteSession.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (email.trim().toLowerCase() !== String(siteUser.email).toLowerCase()) {
      return NextResponse.json(
        { error: "Use the email on your account" },
        { status: 403 }
      );
    }
    actorEmail = siteSession.email;
    source = "site";
  } else {
    actorEmail = email.trim();
    source = "guest";
  }

  await Contact.create({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  });

  const { logActivity } = await import("@/lib/activity-logger");
  await logActivity({
    action: "contact_message",
    category: "system",
    description: `Contact message from ${name.trim()} (${email.trim()})`,
    userEmail: actorEmail,
    metadata: {
      contactName: name.trim(),
      contactEmail: email.trim(),
      message: message.trim(),
      source,
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
