import { Request, Response } from "express";
import Payment from "../models/Payment";

const getPaymentScope = (req: Request) => {
  const user = (req as any).user;
  const userId = (req as any).userId;

  if (!user || !userId) {
    return null;
  }

  if (user.role === "admin") {
    return { userId };
  }

  if (user.role === "client") {
    return { clientId: userId };
  }

  return { _id: null };
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const scope = getPaymentScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payments = await Payment.find(scope).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const scope = getPaymentScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payment = await Payment.findOne({ _id: req.params.id, ...scope });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment" });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const payment = await Payment.create({
      ...req.body,
      userId,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ success: false, message: "Failed to create payment" });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const payment = await Payment.findOne({ _id: req.params.id, userId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    Object.assign(payment, req.body);
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({ success: false, message: "Failed to update payment" });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    await Payment.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true, message: "Payment deleted" });
  } catch (error) {
    console.error("Delete payment error:", error);
    res.status(500).json({ success: false, message: "Failed to delete payment" });
  }
};

export const refundPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const payment = await Payment.findOne({ _id: req.params.id, userId });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    payment.status = "refunded";
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Refund payment error:", error);
    res.status(500).json({ success: false, message: "Failed to refund payment" });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.body.transactionId });
    res.json({ success: true, data: { valid: Boolean(payment), payment } });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};

export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const scope = getPaymentScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payments = await Payment.find(scope);
    res.json({
      success: true,
      data: {
        total: payments.length,
        completed: payments.filter((payment) => payment.status === "completed").length,
        pending: payments.filter((payment) => payment.status === "pending").length,
        failed: payments.filter((payment) => payment.status === "failed").length,
        refunded: payments.filter((payment) => payment.status === "refunded").length,
        totalAmount: payments
          .filter((payment) => payment.status === "completed")
          .reduce((sum, payment) => sum + payment.amount, 0),
        monthlyData: [],
      },
    });
  } catch (error) {
    console.error("Get payment stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment stats" });
  }
};
