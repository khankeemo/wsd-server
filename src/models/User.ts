// PATH: C:\wsd-server\src\models\User.ts
// User Model - User schema for authentication and profile

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  role: 'admin' | 'client' | 'developer';
  adminLevel?: 'super' | 'sub' | null;
  avatar?: string;
  preferences: {
    theme: "light" | "dark";
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  provider?: string;
  providerId?: string;
  isOAuthUser: boolean;
  customId?: string;
  isTemporaryPassword?: boolean;
  isApproved?: boolean;
  setupCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'client', 'developer'],
      default: 'client',
    },
    adminLevel: {
      type: String,
      enum: ['super', 'sub', null],
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
    provider: {
      type: String,
      enum: ['google', 'yahoo', null],
      default: null,
    },
    providerId: {
      type: String,
      default: '',
    },
    isOAuthUser: {
      type: Boolean,
      default: false,
    },
    customId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isTemporaryPassword: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    setupCompleted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
