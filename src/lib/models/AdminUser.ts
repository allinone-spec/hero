import mongoose, { Schema } from "mongoose";

export interface IAdminUser {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "superadmin" | "admin" | "editor";
  group?: mongoose.Types.ObjectId | string | null;
  active: boolean;
  status: "pending" | "active" | "suspended";
  note?: string;
  coffeeBalance: number;
  agreedToTermsAt?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken:   { type: String },
  resetPasswordExpires: { type: Date },
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:         { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["superadmin", "admin", "editor"], default: "admin" },
    group:        { type: Schema.Types.ObjectId, ref: "Group", default: null },
    active:       { type: Boolean, default: true },
    status:       { type: String, enum: ["pending", "active", "suspended"], default: "active" },
    note:            { type: String, default: "" },
    coffeeBalance:   { type: Number, default: 0, min: 0 },
    agreedToTermsAt: { type: Date },
    lastLogin:       { type: Date },
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser ||
  mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
