"use strict";
// PATH: C:\wsd-server\src\routes\user.routes.ts
// User Routes - Profile and settings endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.get('/public/developers', user_controller_1.default.getPublishedDevelopers.bind(user_controller_1.default));
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/users/me - Get current user profile
router.get('/me', user_controller_1.default.getCurrentUser.bind(user_controller_1.default));
router.get('/notifications', user_controller_1.default.getMyNotifications.bind(user_controller_1.default));
router.patch('/notifications/:id/read', user_controller_1.default.markNotificationRead.bind(user_controller_1.default));
router.get('/role/:role', (0, role_middleware_1.requireRoles)('admin'), user_controller_1.default.getUsersByRole.bind(user_controller_1.default));
router.get('/developers', (0, role_middleware_1.requireRoles)('admin'), user_controller_1.default.getDevelopers.bind(user_controller_1.default));
router.post('/developers', (0, role_middleware_1.requireRoles)('admin'), user_controller_1.default.createDeveloper.bind(user_controller_1.default));
router.put('/developers/:id', (0, role_middleware_1.requireRoles)('admin'), user_controller_1.default.updateDeveloper.bind(user_controller_1.default));
router.delete('/developers/:id', (0, role_middleware_1.requireRoles)('admin'), user_controller_1.default.deleteDeveloper.bind(user_controller_1.default));
// PUT /api/users/update - Update user profile
router.put('/update', user_controller_1.default.updateUserProfile.bind(user_controller_1.default));
// POST /api/users/change-password - Change password
router.post('/change-password', user_controller_1.default.changePassword.bind(user_controller_1.default));
exports.default = router;
