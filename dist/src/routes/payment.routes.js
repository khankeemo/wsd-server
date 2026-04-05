"use strict";
// PATH: C:\wsd-server\src\routes\payment.routes.ts
// Payment Routes - API endpoints for payment management
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const Payment_1 = __importDefault(require("../models/Payment"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/payments - Get all payments
router.get('/', payment_controller_1.getPayments);
// GET /api/payments/stats - Get payment statistics
router.get('/stats', payment_controller_1.getPaymentStats);
// GET /api/payments/status/:status - Get payments by status
router.get('/status/:status', async (req, res) => {
    const user = req.user;
    const userId = req.userId;
    const { status } = req.params;
    if (!user || !userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const scope = user.role === 'admin'
        ? { userId, status }
        : user.role === 'client'
            ? { clientId: userId, status }
            : { _id: null };
    const payments = await Payment_1.default.find(scope).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payments });
});
// GET /api/payments/:id - Get single payment
router.get('/:id', payment_controller_1.getPaymentById);
// POST /api/payments - Create payment
router.post('/', payment_controller_1.createPayment);
// PUT /api/payments/:id - Update payment
router.put('/:id', payment_controller_1.updatePayment);
// DELETE /api/payments/:id - Delete payment
router.delete('/:id', payment_controller_1.deletePayment);
// POST /api/payments/:id/refund - Refund payment
router.post('/:id/refund', payment_controller_1.refundPayment);
// GET /api/payments/:id/receipt - Download receipt
router.get('/:id/receipt', (req, res) => {
    res.status(200).json({ success: true, message: 'Receipt download endpoint' });
});
// POST /api/payments/verify - Verify payment
router.post('/verify', payment_controller_1.verifyPayment);
exports.default = router;
