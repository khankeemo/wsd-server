"use strict";
// PATH: C:\wsd-server\src\models\User.ts
// User Model - User schema for authentication and profile
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
    },
    phone: {
        type: String,
        trim: true,
        default: "",
    },
    company: {
        type: String,
        trim: true,
        default: "",
    },
    role: {
        type: String,
        enum: ["admin", "client", "developer"],
        default: "client",
    },
    adminLevel: {
        type: String,
        enum: ['super', 'sub', null],
        default: null,
    },
    avatar: {
        type: String,
        default: "",
    },
    preferences: {
        theme: {
            type: String,
            enum: ["light", "dark"],
            default: "light",
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            projectUpdates: { type: Boolean, default: true },
            queryResponses: { type: Boolean, default: true },
        },
    },
    provider: {
        type: String,
        enum: ["google", "yahoo", null],
        default: null,
    },
    providerId: {
        type: String,
        default: "",
    },
    isOAuthUser: {
        type: Boolean,
        default: false,
    },
    customId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
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
    published: {
        type: Boolean,
        default: false,
    },
    headline: {
        type: String,
        trim: true,
        default: "",
    },
    bio: {
        type: String,
        trim: true,
        default: "",
        maxlength: 500,
    },
    skills: {
        type: [String],
        default: [],
    },
    status: {
        type: String,
        enum: ["active", "inactive", "on-leave"],
        default: "active",
    },
    experienceYears: {
        type: Number,
        default: 0,
        min: 0,
    },
    joinedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("User", UserSchema);
