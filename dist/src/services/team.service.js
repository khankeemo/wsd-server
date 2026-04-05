"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
// PATH: C:\wsd-server\src\services\team.service.ts
const Team_1 = __importDefault(require("../models/Team"));
const mongoose_1 = __importDefault(require("mongoose"));
class TeamService {
    // Get all team members for a user
    async getAllTeamMembers(userId) {
        return await Team_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    }
    // Get single team member by ID
    async getTeamMemberById(id, userId) {
        return await Team_1.default.findOne({ _id: id, userId: new mongoose_1.default.Types.ObjectId(userId) });
    }
    // Create new team member
    async createTeamMember(data, userId) {
        const teamMember = new Team_1.default({
            ...data,
            userId: new mongoose_1.default.Types.ObjectId(userId),
        });
        return await teamMember.save();
    }
    // Update team member
    async updateTeamMember(id, userId, data) {
        return await Team_1.default.findOneAndUpdate({ _id: id, userId: new mongoose_1.default.Types.ObjectId(userId) }, { ...data, updatedAt: new Date() }, { new: true, runValidators: true });
    }
    // Delete team member
    async deleteTeamMember(id, userId) {
        const result = await Team_1.default.findOneAndDelete({ _id: id, userId: new mongoose_1.default.Types.ObjectId(userId) });
        return result !== null;
    }
    // Get team members by role
    async getTeamByRole(userId, role) {
        return await Team_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId), role });
    }
    // Get team members by department
    async getTeamByDepartment(userId, department) {
        return await Team_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId), department });
    }
    // Get active team members count
    async getActiveTeamCount(userId) {
        return await Team_1.default.countDocuments({ userId: new mongoose_1.default.Types.ObjectId(userId), status: 'active' });
    }
}
exports.TeamService = TeamService;
exports.default = new TeamService();
