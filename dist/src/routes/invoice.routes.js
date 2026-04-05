"use strict";
// PATH: C:\wsd-server\src\routes\invoice.routes.ts
// Invoice Routes - API endpoints for invoice management
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const invoice_controller_1 = require("../controllers/invoice.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/invoices - Get all invoices
router.get('/', invoice_controller_1.getInvoices);
// GET /api/invoices/stats - Get invoice statistics
router.get('/stats', invoice_controller_1.getInvoiceStats);
// GET /api/invoices/:id - Get single invoice
router.get('/:id', invoice_controller_1.getInvoiceById);
// POST /api/invoices - Create invoice
router.post('/', invoice_controller_1.createInvoice);
// PUT /api/invoices/:id - Update invoice
router.put('/:id', invoice_controller_1.updateInvoice);
// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', invoice_controller_1.deleteInvoice);
// PATCH /api/invoices/:id/paid - Mark invoice as paid
router.patch('/:id/paid', invoice_controller_1.markInvoicePaid);
// GET /api/invoices/:id/download - Download invoice PDF
router.get('/:id/download', (req, res) => {
    res.status(200).json({ success: true, message: 'Download endpoint' });
});
exports.default = router;
