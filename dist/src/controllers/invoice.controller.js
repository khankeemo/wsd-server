"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoiceStats = exports.markInvoicePaid = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = exports.getInvoiceById = exports.getInvoices = void 0;
const Invoice_1 = __importDefault(require("../models/Invoice"));
const getInvoiceScope = (req) => {
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
const buildInvoiceNumber = () => `INV-${Date.now()}`;
const calculateAmount = (items = [], tax = 0, discount = 0) => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return subtotal + Number(tax || 0) - Number(discount || 0);
};
const getInvoices = async (req, res) => {
    try {
        const scope = getInvoiceScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const invoices = await Invoice_1.default.find(scope).sort({ createdAt: -1 });
        res.json({ success: true, data: invoices });
    }
    catch (error) {
        console.error("Get invoices error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch invoices" });
    }
};
exports.getInvoices = getInvoices;
const getInvoiceById = async (req, res) => {
    try {
        const scope = getInvoiceScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const invoice = await Invoice_1.default.findOne({ _id: req.params.id, ...scope });
        if (!invoice)
            return res.status(404).json({ success: false, message: "Invoice not found" });
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        console.error("Get invoice error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch invoice" });
    }
};
exports.getInvoiceById = getInvoiceById;
const createInvoice = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const payload = req.body;
        const invoice = await Invoice_1.default.create({
            ...payload,
            userId,
            invoiceNumber: payload.invoiceNumber || buildInvoiceNumber(),
            amount: calculateAmount(payload.items, payload.tax, payload.discount),
        });
        res.status(201).json({ success: true, data: invoice });
    }
    catch (error) {
        console.error("Create invoice error:", error);
        res.status(500).json({ success: false, message: "Failed to create invoice" });
    }
};
exports.createInvoice = createInvoice;
const updateInvoice = async (req, res) => {
    try {
        const user = req.user;
        const userId = req.userId;
        if (!user || !userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const invoice = await Invoice_1.default.findOne({ _id: req.params.id, userId });
        if (!invoice)
            return res.status(404).json({ success: false, message: "Invoice not found" });
        Object.assign(invoice, req.body);
        invoice.amount = calculateAmount(invoice.items, invoice.tax, invoice.discount);
        await invoice.save();
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        console.error("Update invoice error:", error);
        res.status(500).json({ success: false, message: "Failed to update invoice" });
    }
};
exports.updateInvoice = updateInvoice;
const deleteInvoice = async (req, res) => {
    try {
        const userId = req.userId;
        const user = req.user;
        if (!userId || !user)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        await Invoice_1.default.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ success: true, message: "Invoice deleted" });
    }
    catch (error) {
        console.error("Delete invoice error:", error);
        res.status(500).json({ success: false, message: "Failed to delete invoice" });
    }
};
exports.deleteInvoice = deleteInvoice;
const markInvoicePaid = async (req, res) => {
    try {
        const userId = req.userId;
        const user = req.user;
        if (!userId || !user)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        if (user.role !== "admin")
            return res.status(403).json({ success: false, message: "Forbidden" });
        const invoice = await Invoice_1.default.findOne({ _id: req.params.id, userId });
        if (!invoice)
            return res.status(404).json({ success: false, message: "Invoice not found" });
        invoice.status = "paid";
        await invoice.save();
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        console.error("Mark invoice paid error:", error);
        res.status(500).json({ success: false, message: "Failed to update invoice" });
    }
};
exports.markInvoicePaid = markInvoicePaid;
const getInvoiceStats = async (req, res) => {
    try {
        const scope = getInvoiceScope(req);
        if (!scope)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const invoices = await Invoice_1.default.find(scope);
        res.json({
            success: true,
            data: {
                total: invoices.length,
                paid: invoices.filter((invoice) => invoice.status === "paid").length,
                pending: invoices.filter((invoice) => invoice.status === "pending").length,
                overdue: invoices.filter((invoice) => invoice.status === "overdue").length,
                totalAmount: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
            },
        });
    }
    catch (error) {
        console.error("Get invoice stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch invoice stats" });
    }
};
exports.getInvoiceStats = getInvoiceStats;
