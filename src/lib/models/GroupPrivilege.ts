import mongoose, { Schema } from "mongoose";

export interface IGroupPrivilege {
  _id: string;
  group: mongoose.Types.ObjectId;
  menu: mongoose.Types.ObjectId;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupPrivilegeSchema = new Schema<IGroupPrivilege>(
  {
    group:     { type: Schema.Types.ObjectId, ref: "Group", required: true },
    menu:      { type: Schema.Types.ObjectId, ref: "Menu",  required: true },
    canView:   { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    canEdit:   { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GroupPrivilegeSchema.index({ group: 1, menu: 1 }, { unique: true });

export default mongoose.models.GroupPrivilege ||
  mongoose.model<IGroupPrivilege>("GroupPrivilege", GroupPrivilegeSchema);
