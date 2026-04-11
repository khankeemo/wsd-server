import { Request, Response } from "express";
import Invoice from "../models/Invoice";
import { Project } from "../models/Project";
import User from "../models/User";

const getInvoiceScope = (req: Request) => {
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

const buildInvoiceNumber = () => `INV-${Date.now()}`;

const calculateAmount = (items: any[] = [], tax = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return subtotal + Number(tax || 0) - Number(discount || 0);
};

const hydrateInvoicePayload = async (payload: any) => {
  const hydrated = { ...payload };

  if (payload.projectId) {
    const project = await Project.findById(payload.projectId).populate("clientId", "name email company");
    if (!project) {
      throw new Error("Selected project not found");
    }
    const populatedClient = project.clientId as any;

    hydrated.projectId = project._id;
    hydrated.clientId = populatedClient?._id || hydrated.clientId || null;
    hydrated.clientName = hydrated.clientName || project.client || populatedClient?.name || "";
    hydrated.clientEmail = hydrated.clientEmail || project.clientEmail || populatedClient?.email || "";
    hydrated.clientAddress = hydrated.clientAddress || project.clientCompany || populatedClient?.company || "";
  }

  if (payload.clientId && (!hydrated.clientName || !hydrated.clientEmail)) {
    const client = await User.findOne({ _id: payload.clientId, role: "client" });
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

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const scope = getInvoiceScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const invoices = await Invoice.find(scope).sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const scope = getInvoiceScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const invoice = await Invoice.findOne({ _id: req.params.id, ...scope });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice" });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const payload = await hydrateInvoicePayload(req.body);
    const invoice = await Invoice.create({
      ...payload,
      userId,
      invoiceNumber: payload.invoiceNumber || buildInvoiceNumber(),
      amount: calculateAmount(payload.items, payload.tax, payload.discount),
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to create invoice" });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    const payload = await hydrateInvoicePayload({ ...invoice.toObject(), ...req.body });
    Object.assign(invoice, payload);
    invoice.amount = calculateAmount(invoice.items as any[], invoice.tax, invoice.discount);
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to update invoice" });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = (req as any).user;
    if (!userId || !user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    await Invoice.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to delete invoice" });
  }
};

export const markInvoicePaid = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = (req as any).user;
    if (!userId || !user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    invoice.status = "paid";
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error("Mark invoice paid error:", error);
    res.status(500).json({ success: false, message: "Failed to update invoice" });
  }
};

export const getInvoiceStats = async (req: Request, res: Response) => {
  try {
    const scope = getInvoiceScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const invoices = await Invoice.find(scope);
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
  } catch (error) {
    console.error("Get invoice stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice stats" });
  }
};
