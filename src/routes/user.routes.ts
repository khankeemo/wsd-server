// PATH: C:\wsd-server\src\routes\user.routes.ts
// User Routes - Profile and settings endpoints

import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me - Get current user profile
router.get('/me', userController.getCurrentUser.bind(userController));

// PUT /api/users/update - Update user profile
router.put('/update', userController.updateUserProfile.bind(userController));

// POST /api/users/change-password - Change password
router.post('/change-password', userController.changePassword.bind(userController));

export default router;