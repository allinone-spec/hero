import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import dbConnect from "./mongodb";
import AdminUser from "./models/AdminUser";
import Group from "./models/Group";
import Menu from "./models/Menu";
import GroupPrivilege from "./models/GroupPrivilege";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret";

const SYSTEM_MENUS = [
  { name: "dashboard",        path: "/admin",                  label: "Dashboard",        section: "Content",  sortOrder: 0 },
  { name: "heroes",           path: "/admin/heroes",           label: "Heroes",           section: "Content",  sortOrder: 1 },
  { name: "rankings",         path: "/admin/rankings",         label: "Rankings",         section: "Content",  sortOrder: 1.5 },
  { name: "submit",           path: "/admin/submit",           label: "Submit Hero",      section: "Content",  sortOrder: 1.7 },
  { name: "suggestions",      path: "/admin/suggestions",      label: "Suggestions",      section: "Content",  sortOrder: 2 },
  { name: "medals",           path: "/admin/medals",           label: "Medals",           section: "Content",  sortOrder: 3 },
  { name: "medals-gallery",   path: "/admin/medals-gallery",   label: "Medal",            section: "Content",  sortOrder: 3.5 },
  { name: "usm-25",           path: "/admin/usm-25",           label: "USM-25",           section: "Content",  sortOrder: 3.7 },
  { name: "scoring",          path: "/admin/scoring",          label: "Scoring",          section: "Content",  sortOrder: 4 },
  { name: "wars",             path: "/admin/wars",             label: "Wars",             section: "Content",  sortOrder: 5 },
  { name: "users",            path: "/admin/users",            label: "Users",            section: "System",   sortOrder: 6 },
  { name: "groups",           path: "/admin/groups",           label: "Groups",           section: "System",   sortOrder: 7 },
  { name: "menus",            path: "/admin/menus",            label: "Menus",            section: "System",   sortOrder: 8 },
  { name: "group-privileges", path: "/admin/group-privileges", label: "Group Privileges", section: "System",   sortOrder: 9 },
  { name: "logs",             path: "/admin/logs",             label: "Logs",             section: "Reports",  sortOrder: 10 },
  { name: "ai-usage",         path: "/admin/ai-usage",         label: "AI Usage",         section: "Reports",  sortOrder: 11 },
];

let _seeded = false;

export async function ensureSeedAdmin() {
  if (_seeded) return;           // already ran this server process
  _seeded = true;                // set early to prevent re-entry

  // Step 1: Ensure system groups exist
  let superAdminGroup = await Group.findOne({ slug: "super-admin" }).lean();
  if (!superAdminGroup) {
    superAdminGroup = await Group.create({
      name: "Super Admin",
      slug: "super-admin",
      description: "Full system access. Cannot be deleted.",
      isSystem: true,
    });
  }

  let defaultGroup = await Group.findOne({ slug: "default-group" }).lean();
  if (!defaultGroup) {
    defaultGroup = await Group.create({
      name: "Default Group",
      slug: "default-group",
      description: "New users land here. No access by default.",
      isSystem: true,
    });
  }

  // Step 2: Upsert system menus
  for (const m of SYSTEM_MENUS) {
    try {
      await Menu.updateOne(
        { name: m.name },
        { $set: { path: m.path, label: m.label, section: m.section, sortOrder: m.sortOrder } },
        { upsert: true }
      );
    } catch (err: unknown) {
      // Handle duplicate path: update existing menu by path instead
      if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
        await Menu.updateOne(
          { path: m.path },
          { $set: { name: m.name, label: m.label, section: m.section, sortOrder: m.sortOrder } }
        );
      } else {
        console.error(`Menu upsert error for "${m.name}":`, err);
      }
    }
  }

  // Step 3: Super-admin group gets all privileges (upsert only, no overwrites)
  const allMenus = await Menu.find().lean();
  for (const menu of allMenus) {
    await GroupPrivilege.updateOne(
      { group: superAdminGroup._id, menu: menu._id },
      {
        $setOnInsert: {
          group: superAdminGroup._id,
          menu: menu._id,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
      },
      { upsert: true }
    );
  }

  // Step 4: Ensure seed admin user → super-admin group
  const seedEmail = (process.env.ADMIN_EMAIL || "admin@heroesarchive.com").toLowerCase();
  const seedPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await AdminUser.findOne({ email: seedEmail });
  if (!existing) {
    const passwordHash = await bcrypt.hash(seedPassword, 12);
    await AdminUser.create({
      email: seedEmail,
      name: "Administrator",
      passwordHash,
      role: "superadmin",
      active: true,
      status: "active",
      group: superAdminGroup._id,
    });
  } else {
    await AdminUser.updateOne(
      { email: seedEmail },
      { active: true, status: "active", group: superAdminGroup._id }
    );
  }

  // Step 5: Migrate users with no group → default-group
  await AdminUser.updateMany(
    { group: null },
    { $set: { group: defaultGroup._id } }
  );
}

export type VerifyCredentialsResult =
  | { success: true; email: string; name: string }
  | { success: false; error: string };

export async function verifyCredentials(
  email: string,
  password: string
): Promise<VerifyCredentialsResult> {
  await dbConnect();
  await ensureSeedAdmin();

  const user = await AdminUser.findOne({ email: email.toLowerCase() });
  if (!user) return { success: false, error: "Invalid credentials" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { success: false, error: "Invalid credentials" };

  if (user.status === "pending") {
    return {
      success: false,
      error: "Your account is pending admin approval. Please wait for an administrator to activate your account.",
    };
  }
  if (user.status === "suspended") {
    return { success: false, error: "Your account has been suspended. Please contact an administrator." };
  }
  if (!user.active) {
    return { success: false, error: "Your account is inactive. Please contact an administrator." };
  }

  await AdminUser.updateOne({ _id: user._id }, { lastLogin: new Date() });
  const name = String(user.name || "Admin").trim() || "Admin";
  return { success: true, email: user.email, name };
}

export async function getGroupSlugForUser(email: string): Promise<string> {
  await dbConnect();
  // Ensure Group model is registered before populate
  await import("./models/Group");
  const user = await AdminUser.findOne({ email }).populate("group").lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = user?.group as any;
  return group?.slug || "default-group";
}

export function createToken(email: string, groupSlug: string): string {
  return jwt.sign({ email, groupSlug }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { email: string; groupSlug: string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      email: payload.email,
      // Support old tokens that had { role } instead of groupSlug
      groupSlug: payload.groupSlug ?? "default-group",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ email: string; groupSlug: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<{ email: string; groupSlug: string }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requirePrivilege(
  menuPath: string,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
): Promise<{ email: string; groupSlug: string }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (session.groupSlug === "super-admin") return session;

  await dbConnect();

  const menu = await Menu.findOne({ path: menuPath }).lean();
  if (!menu) throw new Error("Forbidden");

  const group = await Group.findOne({ slug: session.groupSlug }).lean();
  if (!group) throw new Error("Forbidden");

  const priv = await GroupPrivilege.findOne({ group: group._id, menu: menu._id }).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!priv || !(priv as any)[action]) throw new Error("Forbidden");

  return session;
}

/** @deprecated Use requirePrivilege instead */
export function getEffectivePermissionLevel(user: { role?: string }): number {
  switch (user.role) {
    case "superadmin": return 1;
    case "admin":      return 2;
    case "editor":     return 3;
    default:           return 99;
  }
}
