import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "owner";
  createdAt?: Date;
  updatedAt?: Date;
  /** When explicitly false, Owner must verify email before login. Omitted/undefined = legacy accounts treated as verified. */
  emailVerified?: boolean;
  emailVerifyTokenHash?: string;
  emailVerifyExpires?: Date;
  stripeCustomerId?: string;
  /** Latest adoption subscription (yearly renewals); one Stripe customer may have multiple subs across heroes. */
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  agreedToTermsAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
  name: { type: String, default: "", trim: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "owner"], default: "user" },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  subscriptionStatus: { type: String },
  agreedToTermsAt: { type: Date },
  emailVerified: { type: Boolean },
  emailVerifyTokenHash: { type: String },
  emailVerifyExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log('Error hashing password:', error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);