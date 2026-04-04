// PATH: C:\wsd-server\src\services\team.service.ts
import Team, { ITeam } from '../models/Team';
import mongoose from 'mongoose';

export class TeamService {
  // Get all team members for a user
  async getAllTeamMembers(userId: string): Promise<ITeam[]> {
    return await Team.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  // Get single team member by ID
  async getTeamMemberById(id: string, userId: string): Promise<ITeam | null> {
    return await Team.findOne({ _id: id, userId: new mongoose.Types.ObjectId(userId) });
  }

  // Create new team member
  async createTeamMember(data: Partial<ITeam>, userId: string): Promise<ITeam> {
    const teamMember = new Team({
      ...data,
      userId: new mongoose.Types.ObjectId(userId),
    });
    return await teamMember.save();
  }

  // Update team member
  async updateTeamMember(id: string, userId: string, data: Partial<ITeam>): Promise<ITeam | null> {
    return await Team.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  // Delete team member
  async deleteTeamMember(id: string, userId: string): Promise<boolean> {
    const result = await Team.findOneAndDelete({ _id: id, userId: new mongoose.Types.ObjectId(userId) });
    return result !== null;
  }

  // Get team members by role
  async getTeamByRole(userId: string, role: string): Promise<ITeam[]> {
    return await Team.find({ userId: new mongoose.Types.ObjectId(userId), role });
  }

  // Get team members by department
  async getTeamByDepartment(userId: string, department: string): Promise<ITeam[]> {
    return await Team.find({ userId: new mongoose.Types.ObjectId(userId), department });
  }

  // Get active team members count
  async getActiveTeamCount(userId: string): Promise<number> {
    return await Team.countDocuments({ userId: new mongoose.Types.ObjectId(userId), status: 'active' });
  }
}

export default new TeamService();