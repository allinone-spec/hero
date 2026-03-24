import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import type { IUser } from "@/lib/models/User";

export function normalizeVerifyToken(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.trim();
  try {
    return decodeURIComponent(t).trim();
  } catch {
    return t;
  }
}

export async function verifyMemberEmailToken(
  rawToken: string
): Promise<{ ok: true; user: IUser } | { ok: false }> {
  const token = normalizeVerifyToken(rawToken);
  if (!token) return { ok: false };

  const hash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  await dbConnect();
  const user = await User.findOne({
    emailVerifyTokenHash: hash,
    emailVerifyExpires: { $gt: new Date() },
  });

  if (!user) return { ok: false };

  await User.findByIdAndUpdate(user._id, {
    $set: { emailVerified: true },
    $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 },
  });

  return { ok: true, user };
}
