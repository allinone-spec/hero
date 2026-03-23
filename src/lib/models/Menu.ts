import mongoose, { Schema } from "mongoose";

export interface IMenu {
  _id: string;
  name: string;
  path: string;
  label: string;
  icon: string;
  section: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema = new Schema<IMenu>(
  {
    name:      { type: String, required: true, unique: true, trim: true },
    path:      { type: String, required: true, unique: true, trim: true },
    label:     { type: String, required: true, trim: true },
    icon:      { type: String, default: "" },
    section:   { type: String, required: true, default: "Content" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);
