// PATH: C:\wsd-server\src\routes\user.routes.ts
// User Routes - Profile and settings endpoints

import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';

const router = Router();

router.get('/public/developers', userController.getPublishedDevelopers.bind(userController));

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me - Get current user profile
router.get('/me', userController.getCurrentUser.bind(userController));

router.get('/notifications', userController.getMyNotifications.bind(userController));
router.patch('/notifications/:id/read', userController.markNotificationRead.bind(userController));
router.post('/notifications/mark-all-read', userController.markAllNotificationsRead.bind(userController));

router.get('/role/:role', requireRoles('admin'), userController.getUsersByRole.bind(userController));
router.get('/notifications', userController.getMyNotifications.bind(userController));
router.patch('/notifications/:id/read', userController.markMyNotificationRead.bind(userController));
router.post('/managed', requireRoles('admin'), userController.createManagedUser.bind(userController));
router.delete('/managed/:id', requireRoles('admin'), userController.deleteManagedUser.bind(userController));

router.get('/developers', requireRoles('admin'), userController.getDevelopers.bind(userController));
router.post('/developers', requireRoles('admin'), userController.createDeveloper.bind(userController));
router.put('/developers/:id', requireRoles('admin'), userController.updateDeveloper.bind(userController));
router.delete('/developers/:id', requireRoles('admin'), userController.deleteDeveloper.bind(userController));

// PUT /api/users/update - Update user profile
router.put('/update', userController.updateUserProfile.bind(userController));

// POST /api/users/change-password - Change password
router.post('/change-password', userController.changePassword.bind(userController));

export default router;
