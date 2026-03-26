import mongoose, { Schema, Document } from "mongoose";

export interface IPagePermission extends Document {
  path: string;
  label: string;
  section: "public" | "admin";
  requiredLevel: number; // 0 = public (no login), 1-10 = requires permissionLevel <= this
  sortOrder: number;
  isSystem: boolean; // System pages can't be deleted
}

const PagePermissionSchema = new Schema<IPagePermission>(
  {
    path:          { type: String, required: true, unique: true },
    label:         { type: String, required: true },
    section:       { type: String, enum: ["public", "admin"], required: true },
    requiredLevel: { type: Number, default: 0, min: 0, max: 10 },
    sortOrder:     { type: Number, default: 0 },
    isSystem:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DEFAULT_PAGES = [
  // Public pages
  { path: "/",             label: "Home",        section: "public", requiredLevel: 0, sortOrder: 0, isSystem: true },
  { path: "/rankings",     label: "Heroes",      section: "public", requiredLevel: 0, sortOrder: 1, isSystem: true },
  { path: "/medals",       label: "Medals",      section: "public", requiredLevel: 0, sortOrder: 2, isSystem: true },
  { path: "/scoring",      label: "USM-25",      section: "public", requiredLevel: 0, sortOrder: 3, isSystem: true },
  { path: "/suggestions",  label: "Suggestions", section: "public", requiredLevel: 0, sortOrder: 4, isSystem: true },
  // Admin pages
  { path: "/admin",              label: "Dashboard",   section: "admin", requiredLevel: 1, sortOrder: 0, isSystem: true },
  { path: "/admin/heroes",       label: "Heroes",      section: "admin", requiredLevel: 1, sortOrder: 1, isSystem: true },
  { path: "/admin/suggestions",  label: "Suggestions", section: "admin", requiredLevel: 1, sortOrder: 2, isSystem: true },
  { path: "/admin/medals",       label: "Medals",      section: "admin", requiredLevel: 1, sortOrder: 3, isSystem: true },
  { path: "/admin/scoring",      label: "Scoring",     section: "admin", requiredLevel: 1, sortOrder: 4, isSystem: true },
  { path: "/admin/wars",         label: "Wars",        section: "admin", requiredLevel: 1, sortOrder: 5, isSystem: true },
  { path: "/admin/users",        label: "Users",       section: "admin", requiredLevel: 1, sortOrder: 6, isSystem: true },
  { path: "/admin/logs",         label: "Logs",        section: "admin", requiredLevel: 1, sortOrder: 7, isSystem: true },
  { path: "/admin/ai-usage",     label: "AI",          section: "admin", requiredLevel: 1, sortOrder: 8, isSystem: true },
  { path: "/admin/marketplace", label: "Marketplace", section: "admin", requiredLevel: 1, sortOrder: 8.5, isSystem: true },
  { path: "/admin/permissions",  label: "Permissions", section: "admin", requiredLevel: 1, sortOrder: 9, isSystem: true },
];

export default mongoose.models.PagePermission ||
  mongoose.model<IPagePermission>("PagePermission", PagePermissionSchema);
