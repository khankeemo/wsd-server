"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
// PATH: C:\wsd-server\src\services\team.service.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
class TeamService {
    mapDeveloper(user) {
        return {
            _id: String(user._id),
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            role: "developer",
            department: "development",
            skills: user.skills || [],
            experience: user.experienceYears || 0,
            joinDate: user.joinedAt || user.createdAt,
            status: user.status || "active",
            avatar: user.avatar || "",
            bio: user.bio || "",
            published: Boolean(user.published),
            customId: user.customId || "",
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    async generateCustomId() {
        let next = await User_1.default.countDocuments({ role: "developer" });
        while (true) {
            next += 1;
            const customId = `DEV-${next.toString().padStart(4, "0")}`;
            const existing = await User_1.default.exists({ customId });
            if (!existing)
                return customId;
        }
    }
    // Get all team members for a user
    async getAllTeamMembers(_userId) {
        const developers = await User_1.default.find({ role: "developer" }).sort({ createdAt: -1 });
        return developers.map((developer) => this.mapDeveloper(developer));
    }
    // Get single team member by ID
    async getTeamMemberById(id, _userId) {
        const developer = await User_1.default.findOne({ _id: id, role: "developer" });
        return developer ? this.mapDeveloper(developer) : null;
    }
    // Create new team member
    async createTeamMember(data, _userId) {
        const developer = await User_1.default.create({
            name: data.name,
            email: String(data.email).toLowerCase(),
            password: await bcryptjs_1.default.hash(crypto_1.default.randomBytes(4).toString("hex"), 10),
            phone: data.phone || "",
            role: "developer",
            skills: data.skills || [],
            experienceYears: Number(data.experience) || 0,
            joinedAt: data.joinDate ? new Date(data.joinDate) : null,
            status: data.status || "active",
            bio: data.bio || "",
            published: Boolean(data.published),
            customId: await this.generateCustomId(),
            isTemporaryPassword: true,
            setupCompleted: false,
        });
        return this.mapDeveloper(developer);
    }
    // Update team member
    async updateTeamMember(id, _userId, data) {
        const developer = await User_1.default.findOneAndUpdate({ _id: id, role: "developer" }, {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.email !== undefined ? { email: String(data.email).toLowerCase() } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.skills !== undefined ? { skills: data.skills } : {}),
            ...(data.experience !== undefined ? { experienceYears: Number(data.experience) || 0 } : {}),
            ...(data.joinDate !== undefined ? { joinedAt: data.joinDate ? new Date(data.joinDate) : null } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.bio !== undefined ? { bio: data.bio } : {}),
            ...(data.published !== undefined ? { published: Boolean(data.published) } : {}),
        }, { new: true, runValidators: true });
        return developer ? this.mapDeveloper(developer) : null;
    }
    // Delete team member
    async deleteTeamMember(id, _userId) {
        const result = await User_1.default.findOneAndDelete({ _id: id, role: "developer" });
        return result !== null;
    }
    // Get team members by role
    async getTeamByRole(_userId, role) {
        if (role !== "developer") {
            return [];
        }
        return this.getAllTeamMembers("");
    }
    // Get team members by department
    async getTeamByDepartment(_userId, department) {
        if (department !== "development") {
            return [];
        }
        return this.getAllTeamMembers("");
    }
    // Get active team members count
    async getActiveTeamCount(userId) {
        return await User_1.default.countDocuments({ role: "developer", status: "active" });
    }
}
exports.TeamService = TeamService;
exports.default = new TeamService();
