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
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/users/me - Get current user profile
router.get('/me', user_controller_1.default.getCurrentUser.bind(user_controller_1.default));
// PUT /api/users/update - Update user profile
router.put('/update', user_controller_1.default.updateUserProfile.bind(user_controller_1.default));
// POST /api/users/change-password - Change password
router.post('/change-password', user_controller_1.default.changePassword.bind(user_controller_1.default));
exports.default = router;
