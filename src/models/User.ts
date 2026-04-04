// PATH: C:\wsd-server\src\models\User.ts
// User Model - User schema for authentication and profile

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  role: 'admin' | 'user' | 'client';
  avatar?: string;
  provider?: string;
  providerId?: string;
  isOAuthUser: boolean;
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
      enum: ['admin', 'user', 'client'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);