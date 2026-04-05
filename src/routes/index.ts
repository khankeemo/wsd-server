// PATH: C:\wsd-server\src\routes\index.ts
// Main Router - Registers all API routes

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import clientRoutes from './client.routes';
import taskRoutes from './task.routes';
import teamRoutes from './team.routes';
import invoiceRoutes from './invoice.routes';
import paymentRoutes from './payment.routes';
import messageRoutes from './message.routes';
import statsRoutes from './stats.routes';
import ticketRoutes from './ticket.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/clients', clientRoutes);
router.use('/tasks', taskRoutes);
router.use('/team', teamRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/messages', messageRoutes);
router.use('/stats', statsRoutes);
router.use('/tickets', ticketRoutes);

export default router;
