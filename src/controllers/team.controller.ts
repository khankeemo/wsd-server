// PATH: C:\wsd-server\src\controllers\team.controller.ts
import { Request, Response } from 'express';
import teamService from '../services/team.service';

export class TeamController {
  // Get all team members
  async getAllTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const teamMembers = await teamService.getAllTeamMembers(userId);
      res.status(200).json({ success: true, data: teamMembers });
    } catch (error) {
      console.error('Get all team members error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch team members' });
    }
  }

  // Get single team member
  async getTeamMemberById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const teamMember = await teamService.getTeamMemberById(id, userId);
      if (!teamMember) {
        res.status(404).json({ success: false, message: 'Team member not found' });
        return;
      }
      
      res.status(200).json({ success: true, data: teamMember });
    } catch (error) {
      console.error('Get team member error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch team member' });
    }
  }

  // Create team member
  async createTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const teamMember = await teamService.createTeamMember(req.body, userId);
      res.status(201).json({ success: true, data: teamMember, message: 'Team member created successfully' });
    } catch (error: any) {
      console.error('Create team member error:', error);
      if (error.code === 11000) {
        res.status(400).json({ success: false, message: 'Email already exists' });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to create team member' });
    }
  }

  // Update team member
  async updateTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const updatedMember = await teamService.updateTeamMember(id, userId, req.body);
      if (!updatedMember) {
        res.status(404).json({ success: false, message: 'Team member not found' });
        return;
      }
      
      res.status(200).json({ success: true, data: updatedMember, message: 'Team member updated successfully' });
    } catch (error) {
      console.error('Update team member error:', error);
      res.status(500).json({ success: false, message: 'Failed to update team member' });
    }
  }

  // Delete team member
  async deleteTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      
      const deleted = await teamService.deleteTeamMember(id, userId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Team member not found' });
        return;
      }
      
      res.status(200).json({ success: true, message: 'Team member deleted successfully' });
    } catch (error) {
      console.error('Delete team member error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete team member' });
    }
  }

  // Get team members by role
  async getTeamByRole(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.params;
      const userId = (req as any).userId;
      
      const teamMembers = await teamService.getTeamByRole(userId, role);
      res.status(200).json({ success: true, data: teamMembers });
    } catch (error) {
      console.error('Get team by role error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch team members by role' });
    }
  }

  // Get team members by department
  async getTeamByDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { department } = req.params;
      const userId = (req as any).userId;
      
      const teamMembers = await teamService.getTeamByDepartment(userId, department);
      res.status(200).json({ success: true, data: teamMembers });
    } catch (error) {
      console.error('Get team by department error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch team members by department' });
    }
  }
}

export default new TeamController();