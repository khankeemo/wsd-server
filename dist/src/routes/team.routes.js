"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// PATH: C:\wsd-server\src\routes\team.routes.ts
const express_1 = require("express");
const team_controller_1 = __importDefault(require("../controllers/team.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/team - Get all team members
router.get('/', team_controller_1.default.getAllTeamMembers.bind(team_controller_1.default));
// GET /api/team/role/:role - Get team by role
router.get('/role/:role', team_controller_1.default.getTeamByRole.bind(team_controller_1.default));
// GET /api/team/department/:department - Get team by department
router.get('/department/:department', team_controller_1.default.getTeamByDepartment.bind(team_controller_1.default));
// GET /api/team/:id - Get single team member
router.get('/:id', team_controller_1.default.getTeamMemberById.bind(team_controller_1.default));
// POST /api/team - Create team member
router.post('/', team_controller_1.default.createTeamMember.bind(team_controller_1.default));
// PUT /api/team/:id - Update team member
router.put('/:id', team_controller_1.default.updateTeamMember.bind(team_controller_1.default));
// DELETE /api/team/:id - Delete team member
router.delete('/:id', team_controller_1.default.deleteTeamMember.bind(team_controller_1.default));
exports.default = router;
