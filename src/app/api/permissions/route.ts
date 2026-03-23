import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getSession, getEffectivePermissionLevel } from "@/lib/auth";
import PagePermission, { DEFAULT_PAGES } from "@/lib/models/PagePermission";
import AdminUser from "@/lib/models/AdminUser";

/** Ensure all default page permissions exist (upserts missing entries, removes stale ones) */
async function ensureDefaultPermissions() {
  const count = await PagePermission.countDocuments();
  if (count === 0) {
    await PagePermission.insertMany(DEFAULT_PAGES);
    return;
  }
  // Upsert any missing default pages
  for (const page of DEFAULT_PAGES) {
    await PagePermission.updateOne(
      { path: page.path },
      { $setOnInsert: page },
      { upsert: true }
    );
  }
  // Remove categories page if it was seeded previously
  await PagePermission.deleteOne({ path: "/categories", isSystem: true });
}

// GET — ?mine=true returns accessible pages for current user; otherwise admin gets all pages + users
export async function GET(req: NextRequest) {
  await dbConnect();
  await ensureDefaultPermissions();

  const mine = req.nextUrl.searchParams.get("mine");

  if (mine === "true") {
    // Public endpoint: return accessible pages for current user
    const session = await getSession();
    const allPages = await PagePermission.find().sort({ section: 1, sortOrder: 1 }).lean();

    if (!session) {
      // Not logged in: return only public pages (requiredLevel === 0)
      const publicPages = allPages
        .filter((p) => p.section === "public" && p.requiredLevel === 0)
        .map((p) => ({ path: p.path, label: p.label }));
      return NextResponse.json({ loggedIn: false, publicPages });
    }

    // Logged in: get user's permission level
    const user = await AdminUser.findOne({ email: session.email }).lean();
    if (!user) {
      return NextResponse.json({ loggedIn: false, publicPages: allPages.filter((p) => p.section === "public" && p.requiredLevel === 0).map((p) => ({ path: p.path, label: p.label })) });
    }

    const level = getEffectivePermissionLevel(user);
    const accessible = allPages.filter((p) =>
      p.requiredLevel === 0 || level <= p.requiredLevel
    );

    const publicPages = accessible.filter((p) => p.section === "public").map((p) => ({ path: p.path, label: p.label }));
    const adminPages = accessible.filter((p) => p.section === "admin").map((p) => ({ path: p.path, label: p.label }));

    return NextResponse.json({
      loggedIn: true,
      user: { name: user.name, email: user.email, permissionLevel: level },
      publicPages,
      adminPages,
    });
  }

  // Admin-only: return all pages + all users
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await AdminUser.findOne({ email: session.email }).lean();
  if (!user || getEffectivePermissionLevel(user) !== 1) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const pages = await PagePermission.find().sort({ section: 1, sortOrder: 1 }).lean();
  const users = await AdminUser.find(
    { status: { $ne: "pending" } },
    { name: 1, email: 1, role: 1, permissionLevel: 1, active: 1, status: 1 }
  ).sort({ permissionLevel: 1, name: 1 }).lean();

  // Add effective level for users that might not have it stored
  const usersWithLevel = users.map((u) => ({
    ...u,
    permissionLevel: getEffectivePermissionLevel(u),
  }));

  return NextResponse.json({ pages, users: usersWithLevel });
}

// POST — admin only: add a new page permission
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  await ensureDefaultPermissions();

  const user = await AdminUser.findOne({ email: session.email }).lean();
  if (!user || getEffectivePermissionLevel(user) !== 1) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { path, label, section, requiredLevel } = await req.json();

  if (!path || !label || !section) {
    return NextResponse.json({ error: "Path, label, and section are required" }, { status: 400 });
  }

  const existing = await PagePermission.findOne({ path });
  if (existing) {
    return NextResponse.json({ error: "A permission entry for this path already exists" }, { status: 409 });
  }

  const maxSort = await PagePermission.findOne({ section }).sort({ sortOrder: -1 }).lean();
  const sortOrder = (maxSort?.sortOrder || 0) + 1;

  const page = await PagePermission.create({
    path,
    label,
    section,
    requiredLevel: requiredLevel ?? (section === "admin" ? 1 : 0),
    sortOrder,
    isSystem: false,
  });

  return NextResponse.json(page, { status: 201 });
}
