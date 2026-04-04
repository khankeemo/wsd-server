// PATH: C:\wsd-server\src\models\Team.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'developer' | 'designer' | 'manager' | 'intern';
  department: 'development' | 'design' | 'management' | 'sales' | 'support';
  skills: string[];
  experience: number;
  salary?: number;
  joinDate: Date;
  status: 'active' | 'inactive' | 'on-leave';
  avatar?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'developer', 'designer', 'manager', 'intern'],
      default: 'developer',
    },
    department: {
      type: String,
      enum: ['development', 'design', 'management', 'sales', 'support'],
      default: 'development',
    },
    skills: [{
      type: String,
      trim: true,
    }],
    experience: {
      type: Number,
      default: 0,
    },
    salary: {
      type: Number,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave'],
      default: 'active',
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITeam>('Team', TeamSchema);