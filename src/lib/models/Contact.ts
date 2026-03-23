import mongoose, { Schema } from "mongoose";

export interface IContact {
  _id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true, maxlength: 5000 },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContactSchema.index({ read: 1, createdAt: -1 });

export default mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);