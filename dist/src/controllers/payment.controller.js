"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStats = exports.verifyPayment = exports.refundPayment = exports.deletePayment = exports.updatePayment = exports.createPayment = exports.getPaymentById = exports.getPayments = void 0;
const Payment_1 = __importDefault(require("../models/Payment"));
const getPaymentScope = (req) => {
    const user = req.user;
    const userId = req.userId;
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
const getPayments = async (req, res) => {
    try {
        const scope = getPaymentScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const payments = await Payment_1.default.find(scope).sort({ createdAt: -1 });
        res.json({ success: true, data: payments });
    }
    catch (error) {
        console.error("Get payments error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
};
exports.getPayments = getPayments;
const getPaymentById = async (req, res) => {
    try {
        const scope = getPaymentScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const payment = await Payment_1.default.findOne({ _id: req.params.id, ...scope });
        if (!payment)
            return res.status(404).json({ success: false, message: "Payment not found" });
        res.json({ success: true, data: payment });
    }
    catch (error) {
        console.error("Get payment error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payment" });
    }
};
exports.getPaymentById = getPaymentById;
const createPayment = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const payment = await Payment_1.default.create({
            ...req.body,
            userId,
        });
        res.status(201).json({ success: true, data: payment });
    }
    catch (error) {
        console.error("Create payment error:", error);
        res.status(500).json({ success: false, message: "Failed to create payment" });
    }
};
exports.createPayment = createPayment;
const updatePayment = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const payment = await Payment_1.default.findOne({ _id: req.params.id, userId });
        if (!payment)
            return res.status(404).json({ success: false, message: "Payment not found" });
        Object.assign(payment, req.body);
        await payment.save();
        res.json({ success: true, data: payment });
    }
    catch (error) {
        console.error("Update payment error:", error);
        res.status(500).json({ success: false, message: "Failed to update payment" });
    }
};
exports.updatePayment = updatePayment;
const deletePayment = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        await Payment_1.default.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ success: true, message: "Payment deleted" });
    }
    catch (error) {
        console.error("Delete payment error:", error);
        res.status(500).json({ success: false, message: "Failed to delete payment" });
    }
};
exports.deletePayment = deletePayment;
const refundPayment = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const payment = await Payment_1.default.findOne({ _id: req.params.id, userId });
        if (!payment)
            return res.status(404).json({ success: false, message: "Payment not found" });
        payment.status = "refunded";
        await payment.save();
        res.json({ success: true, data: payment });
    }
    catch (error) {
        console.error("Refund payment error:", error);
        res.status(500).json({ success: false, message: "Failed to refund payment" });
    }
};
exports.refundPayment = refundPayment;
const verifyPayment = async (req, res) => {
    try {
        const payment = await Payment_1.default.findOne({ transactionId: req.body.transactionId });
        res.json({ success: true, data: { valid: Boolean(payment), payment } });
    }
    catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ success: false, message: "Failed to verify payment" });
    }
};
exports.verifyPayment = verifyPayment;
const getPaymentStats = async (req, res) => {
    try {
        const scope = getPaymentScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const payments = await Payment_1.default.find(scope);
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
    }
    catch (error) {
        console.error("Get payment stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payment stats" });
    }
};
exports.getPaymentStats = getPaymentStats;
