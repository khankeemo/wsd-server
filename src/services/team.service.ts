// PATH: C:\wsd-server\src\services\team.service.ts
import bcrypt from "bcryptjs";
import mongoose from 'mongoose';
import crypto from "crypto";
import User from "../models/User";

export class TeamService {
  private mapDeveloper(user: any) {
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

  private async generateCustomId() {
    let next = await User.countDocuments({ role: "developer" });
    while (true) {
      next += 1;
      const customId = `DEV-${next.toString().padStart(4, "0")}`;
      const existing = await User.exists({ customId });
      if (!existing) return customId;
    }
  }

  // Get all team members for a user
  async getAllTeamMembers(_userId: string): Promise<any[]> {
    const developers = await User.find({ role: "developer" }).sort({ createdAt: -1 });
    return developers.map((developer) => this.mapDeveloper(developer));
  }

  // Get single team member by ID
  async getTeamMemberById(id: string, _userId: string): Promise<any | null> {
    const developer = await User.findOne({ _id: id, role: "developer" });
    return developer ? this.mapDeveloper(developer) : null;
  }

  // Create new team member
  async createTeamMember(data: any, _userId: string): Promise<any> {
    const developer = await User.create({
      name: data.name,
      email: String(data.email).toLowerCase(),
      password: await bcrypt.hash(crypto.randomBytes(4).toString("hex"), 10),
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
  async updateTeamMember(id: string, _userId: string, data: any): Promise<any | null> {
    const developer = await User.findOneAndUpdate(
      { _id: id, role: "developer" },
      {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: String(data.email).toLowerCase() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.skills !== undefined ? { skills: data.skills } : {}),
        ...(data.experience !== undefined ? { experienceYears: Number(data.experience) || 0 } : {}),
        ...(data.joinDate !== undefined ? { joinedAt: data.joinDate ? new Date(data.joinDate) : null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.published !== undefined ? { published: Boolean(data.published) } : {}),
      },
      { new: true, runValidators: true }
    );
    return developer ? this.mapDeveloper(developer) : null;
  }

  // Delete team member
  async deleteTeamMember(id: string, _userId: string): Promise<boolean> {
    const result = await User.findOneAndDelete({ _id: id, role: "developer" });
    return result !== null;
  }

  // Get team members by role
  async getTeamByRole(_userId: string, role: string): Promise<any[]> {
    if (role !== "developer") {
      return [];
    }
    return this.getAllTeamMembers("");
  }

  // Get team members by department
  async getTeamByDepartment(_userId: string, department: string): Promise<any[]> {
    if (department !== "development") {
      return [];
    }
    return this.getAllTeamMembers("");
  }

  // Get active team members count
  async getActiveTeamCount(userId: string): Promise<number> {
    return await User.countDocuments({ role: "developer", status: "active" });
  }
}

export default new TeamService();
