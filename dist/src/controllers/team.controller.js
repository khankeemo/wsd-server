"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamController = void 0;
const team_service_1 = __importDefault(require("../services/team.service"));
class TeamController {
    // Get all team members
    async getAllTeamMembers(req, res) {
        try {
            const userId = req.userId;
            const teamMembers = await team_service_1.default.getAllTeamMembers(userId);
            res.status(200).json({ success: true, data: teamMembers });
        }
        catch (error) {
            console.error('Get all team members error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch team members' });
        }
    }
    // Get single team member
    async getTeamMemberById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const teamMember = await team_service_1.default.getTeamMemberById(id, userId);
            if (!teamMember) {
                res.status(404).json({ success: false, message: 'Team member not found' });
                return;
            }
            res.status(200).json({ success: true, data: teamMember });
        }
        catch (error) {
            console.error('Get team member error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch team member' });
        }
    }
    // Create team member
    async createTeamMember(req, res) {
        try {
            const userId = req.userId;
            const teamMember = await team_service_1.default.createTeamMember(req.body, userId);
            res.status(201).json({ success: true, data: teamMember, message: 'Team member created successfully' });
        }
        catch (error) {
            console.error('Create team member error:', error);
            if (error.code === 11000) {
                res.status(400).json({ success: false, message: 'Email already exists' });
                return;
            }
            res.status(500).json({ success: false, message: 'Failed to create team member' });
        }
    }
    // Update team member
    async updateTeamMember(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const updatedMember = await team_service_1.default.updateTeamMember(id, userId, req.body);
            if (!updatedMember) {
                res.status(404).json({ success: false, message: 'Team member not found' });
                return;
            }
            res.status(200).json({ success: true, data: updatedMember, message: 'Team member updated successfully' });
        }
        catch (error) {
            console.error('Update team member error:', error);
            res.status(500).json({ success: false, message: 'Failed to update team member' });
        }
    }
    // Delete team member
    async deleteTeamMember(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const deleted = await team_service_1.default.deleteTeamMember(id, userId);
            if (!deleted) {
                res.status(404).json({ success: false, message: 'Team member not found' });
                return;
            }
            res.status(200).json({ success: true, message: 'Team member deleted successfully' });
        }
        catch (error) {
            console.error('Delete team member error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete team member' });
        }
    }
    // Get team members by role
    async getTeamByRole(req, res) {
        try {
            const { role } = req.params;
            const userId = req.userId;
            const teamMembers = await team_service_1.default.getTeamByRole(userId, role);
            res.status(200).json({ success: true, data: teamMembers });
        }
        catch (error) {
            console.error('Get team by role error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch team members by role' });
        }
    }
    // Get team members by department
    async getTeamByDepartment(req, res) {
        try {
            const { department } = req.params;
            const userId = req.userId;
            const teamMembers = await team_service_1.default.getTeamByDepartment(userId, department);
            res.status(200).json({ success: true, data: teamMembers });
        }
        catch (error) {
            console.error('Get team by department error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch team members by department' });
        }
    }
}
exports.TeamController = TeamController;
exports.default = new TeamController();
