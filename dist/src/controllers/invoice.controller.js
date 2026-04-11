"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoiceStats = exports.markInvoicePaid = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = exports.getInvoiceById = exports.getInvoices = void 0;
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Project_1 = require("../models/Project");
const User_1 = __importDefault(require("../models/User"));
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
const hydrateInvoicePayload = async (payload) => {
    const hydrated = { ...payload };
    if (payload.projectId) {
        const project = await Project_1.Project.findById(payload.projectId).populate("clientId", "name email company");
        if (!project) {
            throw new Error("Selected project not found");
        }
        const populatedClient = project.clientId;
        hydrated.projectId = project._id;
        hydrated.clientId = populatedClient?._id || hydrated.clientId || null;
        hydrated.clientName = hydrated.clientName || project.client || populatedClient?.name || "";
        hydrated.clientEmail = hydrated.clientEmail || project.clientEmail || populatedClient?.email || "";
        hydrated.clientAddress = hydrated.clientAddress || project.clientCompany || populatedClient?.company || "";
    }
    if (payload.clientId && (!hydrated.clientName || !hydrated.clientEmail)) {
        const client = await User_1.default.findOne({ _id: payload.clientId, role: "client" });
        if (!client) {
            throw new Error("Selected client not found");
        }
        hydrated.clientId = client._id;
        hydrated.clientName = hydrated.clientName || client.name;
        hydrated.clientEmail = hydrated.clientEmail || client.email;
        hydrated.clientAddress = hydrated.clientAddress || client.company || "";
    }
    if (!hydrated.clientName || !hydrated.clientEmail) {
        throw new Error("Client name and email are required");
    }
    hydrated.billingType = hydrated.billingType || "project_completion";
    hydrated.milestoneLabel =
        hydrated.billingType === "milestone" ? String(hydrated.milestoneLabel || "").trim() : "";
    return hydrated;
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
        const payload = await hydrateInvoicePayload(req.body);
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
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to create invoice" });
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
        const payload = await hydrateInvoicePayload({ ...invoice.toObject(), ...req.body });
        Object.assign(invoice, payload);
        invoice.amount = calculateAmount(invoice.items, invoice.tax, invoice.discount);
        await invoice.save();
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        console.error("Update invoice error:", error);
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to update invoice" });
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
