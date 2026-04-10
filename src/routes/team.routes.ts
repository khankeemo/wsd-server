// PATH: C:\wsd-server\src\routes\team.routes.ts
import { Router } from 'express';
import teamController from '../controllers/team.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/team - Get all team members
router.get('/', teamController.getAllTeamMembers.bind(teamController));

// GET /api/team/role/:role - Get team by role
router.get('/role/:role', teamController.getTeamByRole.bind(teamController));

// GET /api/team/department/:department - Get team by department
router.get('/department/:department', teamController.getTeamByDepartment.bind(teamController));

// GET /api/team/:id - Get single team member
router.get('/:id', teamController.getTeamMemberById.bind(teamController));

// POST /api/team - Create team member
router.post('/', teamController.createTeamMember.bind(teamController));

// PUT /api/team/:id - Update team member
router.put('/:id', teamController.updateTeamMember.bind(teamController));

// DELETE /api/team/:id - Delete team member
router.delete('/:id', teamController.deleteTeamMember.bind(teamController));

export default router;
