// PATH: C:\wsd-server\src\controllers\user.controller.ts
// PURPOSE: User profile management - Get profile, update, change password
// IMPACT: User can view and edit their profile information
// FEATURES: Profile CRUD, password change with validation

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';

export class UserController {
  /**
   * Get current user profile
   * GET /api/users/me
   * Requires: Authentication token
   * Returns: User object (without password)
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Unauthorized - Please login again' 
        });
        return;
      }
      
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          company: user.company || '',
          role: user.role || 'user',
          avatar: user.avatar || '',
          createdAt: user.createdAt,
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error - Could not fetch user profile' 
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   * Requires: Authentication token
   * Body: { name?, phone?, company? }
   */
  async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { name, phone, company } = req.body;
      
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Unauthorized' 
        });
        return;
      }
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (company) updateData.company = company;
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!updatedUser) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error - Could not update profile' 
      });
    }
  }

  /**
   * Change user password
   * PUT /api/users/change-password
   * Requires: Authentication token
   * Body: { currentPassword, newPassword }
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Unauthorized' 
        });
        return;
      }
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ 
          success: false, 
          message: 'Please provide both current and new password' 
        });
        return;
      }
      
      if (newPassword.length < 6) {
        res.status(400).json({ 
          success: false, 
          message: 'New password must be at least 6 characters' 
        });
        return;
      }
      
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
        return;
      }
      
      // Hash and save new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      user.password = hashedPassword;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error - Could not change password' 
      });
    }
  }
}

export default new UserController();