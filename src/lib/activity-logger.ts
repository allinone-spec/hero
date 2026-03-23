import dbConnect from "./mongodb";
import ActivityLog from "./models/ActivityLog";

interface LogEntry {
  action: string;
  category: "hero" | "medal" | "user" | "scoring" | "auth" | "system";
  description: string;
  userEmail: string;
  userName?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(entry: LogEntry) {
  try {
    await dbConnect();
    await ActivityLog.create({
      ...entry,
      userName: entry.userName || "System",
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
