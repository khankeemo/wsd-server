// PATH: C:\wsd-server\src\routes\invoice.routes.ts
// Invoice Routes - API endpoints for invoice management

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createInvoice,
  deleteInvoice,
  downloadInvoicePDF,
  getInvoiceById,
  getInvoices,
  getInvoiceStats,
  markInvoicePaid,
  updateInvoice,
} from '../controllers/invoice.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/invoices - Get all invoices
router.get('/', getInvoices);

// GET /api/invoices/stats - Get invoice statistics
router.get('/stats', getInvoiceStats);

// GET /api/invoices/:id - Get single invoice
router.get('/:id', getInvoiceById);

// POST /api/invoices - Create invoice
router.post('/', createInvoice);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', updateInvoice);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', deleteInvoice);

// PATCH /api/invoices/:id/paid - Mark invoice as paid
router.patch('/:id/paid', markInvoicePaid);

// GET /api/invoices/:id/download - Download invoice PDF
router.get('/:id/download', downloadInvoicePDF);

export default router;
