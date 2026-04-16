// PATH: C:\wsd-server\src\routes\payment.routes.ts
// Payment Routes - API endpoints for payment management

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createGatewayPayment,
  confirmGatewayPayment,
  createPayment,
  deletePayment,
  downloadPaymentReceipt,
  getPaymentById,
  getGatewayPaymentStatus,
  getPaymentStats,
  getPayments,
  razorpayWebhook,
  refundPayment,
  stripeWebhook,
  updatePayment,
  verifyPayment,
} from '../controllers/payment.controller';
import Payment from '../models/Payment';

const router = Router();

router.post('/stripe/webhook', stripeWebhook);
router.post('/razorpay/webhook', razorpayWebhook);

// All remaining routes require authentication
router.use(authMiddleware);

// POST /api/payments/create - Initialize provider payment flow
router.post('/create', createGatewayPayment);

// POST /api/payments/confirm - Confirm provider payment after redirect/callback
router.post('/confirm', confirmGatewayPayment);

// GET /api/payments - Get all payments
router.get('/', getPayments);

// GET /api/payments/stats - Get payment statistics
router.get('/stats', getPaymentStats);

// POST /api/payments/verify - Verify payment
router.post('/verify', verifyPayment);

// GET /api/payments/status/:status - Get payments by status
router.get('/status/:status', async (req, res) => {
  const user = (req as any).user;
  const userId = (req as any).userId;
  const { status } = req.params;

  if (!user || !userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const scope =
    user.role === 'admin'
      ? { userId, status }
      : user.role === 'client'
        ? { clientId: userId, status }
        : { _id: null };

  const payments = await Payment.find(scope).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: payments });
});

// GET /api/payments/:id/status - Reconcile and get gateway payment status
router.get('/:id/status', getGatewayPaymentStatus);

// GET /api/payments/:id - Get single payment
router.get('/:id', getPaymentById);

// POST /api/payments - Create payment
router.post('/', createPayment);

// PUT /api/payments/:id - Update payment
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', deletePayment);

// POST /api/payments/:id/refund - Refund payment
router.post('/:id/refund', refundPayment);

// GET /api/payments/:id/receipt - Download receipt
router.get('/:id/receipt', downloadPaymentReceipt);

export default router;
