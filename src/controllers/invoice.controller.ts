import { Request, Response } from "express";
import Invoice from "../models/Invoice";
import { Project } from "../models/Project";
import User from "../models/User";
import Notification from "../models/Notification";
import PDFDocument from "pdfkit";

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

  if (!hydrated.clientId && hydrated.clientEmail) {
    const email = String(hydrated.clientEmail).toLowerCase().trim();
    const clientUser = await User.findOne({ email, role: "client" });
    if (clientUser) {
      hydrated.clientId = clientUser._id;
      hydrated.clientName = hydrated.clientName || clientUser.name;
    }
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

    if (invoice.clientId) {
      try {
        const dueStr = new Date(invoice.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const amt = Number(invoice.amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        await Notification.create({
          recipientId: invoice.clientId,
          senderId: userId,
          type: "invoice_created",
          message: `New invoice ${invoice.invoiceNumber} for $${amt}. Due ${dueStr}.`,
          isRead: false,
          metadata: {
            invoiceId: String(invoice._id),
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
          },
        });
      } catch (notifyErr) {
        console.error("Invoice notification error:", notifyErr);
      }
    }

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
    const isOverdue = (inv: (typeof invoices)[0]) => {
      if (inv.status === "paid") return false;
      if (inv.status === "overdue") return true;
      const due = new Date(inv.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      return due < today && (inv.status === "pending" || inv.status === "draft");
    };
    const isPendingDisplay = (inv: (typeof invoices)[0]) => {
      if (inv.status === "paid" || inv.status === "overdue") return false;
      if (isOverdue(inv)) return false;
      return inv.status === "pending" || inv.status === "draft";
    };
    let pending = 0;
    let overdue = 0;
    for (const inv of invoices) {
      if (isOverdue(inv)) overdue++;
      else if (isPendingDisplay(inv)) pending++;
    }
    res.json({
      success: true,
      data: {
        total: invoices.length,
        paid: invoices.filter((invoice) => invoice.status === "paid").length,
        pending,
        overdue,
        totalAmount: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      },
    });
  } catch (error) {
    console.error("Get invoice stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice stats" });
  }
};

export const downloadInvoicePDF = async (req: Request, res: Response) => {
  try {
    const scope = getInvoiceScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const invoice = await Invoice.findOne({ _id: req.params.id, ...scope });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(28).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    doc.moveDown(0.5);
    
    // Invoice details
    doc.fontSize(12).font("Helvetica");
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: "right" });
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: "right" });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: "right" });
    doc.moveDown(1);

    // Client information
    doc.fontSize(16).font("Helvetica-Bold").text("Bill To:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica");
    doc.text(invoice.clientName);
    doc.text(invoice.clientEmail);
    if (invoice.clientAddress) {
      doc.text(invoice.clientAddress);
    }
    doc.moveDown(1);

    // Items table header
    const tableTop = doc.y;
    const itemX = 50;
    const descX = 150;
    const qtyX = 350;
    const rateX = 420;
    const amountX = 500;

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Description", descX, tableTop, { width: 150 });
    doc.text("Qty", qtyX, tableTop, { width: 50, align: "center" });
    doc.text("Rate", rateX, tableTop, { width: 60, align: "right" });
    doc.text("Amount", amountX, tableTop, { width: 70, align: "right" });
    
    // Draw line
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    // Items
    doc.fontSize(11).font("Helvetica");
    let currentY = doc.y;
    invoice.items.forEach((item, index) => {
      doc.text(item.description, descX, currentY, { width: 150 });
      doc.text(String(item.quantity), qtyX, currentY, { width: 50, align: "center" });
      doc.text(`$${item.rate.toFixed(2)}`, rateX, currentY, { width: 60, align: "right" });
      doc.text(`$${item.amount.toFixed(2)}`, amountX, currentY, { width: 70, align: "right" });
      currentY += 25;
      if (index < invoice.items.length - 1) {
        doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).stroke();
      }
    });

    doc.y = currentY + 10;
    
    // Draw line before totals
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Subtotal:", rateX, doc.y, { width: 60, align: "right" });
    doc.text(`$${subtotal.toFixed(2)}`, amountX, doc.y, { width: 70, align: "right" });
    doc.moveDown(0.5);

    if (invoice.tax > 0) {
      doc.text("Tax:", rateX, doc.y, { width: 60, align: "right" });
      doc.text(`$${invoice.tax.toFixed(2)}`, amountX, doc.y, { width: 70, align: "right" });
      doc.moveDown(0.5);
    }

    if (invoice.discount > 0) {
      doc.text("Discount:", rateX, doc.y, { width: 60, align: "right" });
      doc.text(`-$${invoice.discount.toFixed(2)}`, amountX, doc.y, { width: 70, align: "right" });
      doc.moveDown(0.5);
    }

    // Total amount
    doc.fontSize(16).font("Helvetica-Bold");
    doc.text("Total:", rateX, doc.y, { width: 60, align: "right" });
    doc.text(`$${invoice.amount.toFixed(2)}`, amountX, doc.y, { width: 70, align: "right" });
    
    // Notes
    if (invoice.notes) {
      doc.moveDown(2);
      doc.fontSize(12).font("Helvetica-Bold").text("Notes:", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica").text(invoice.notes);
    }

    // Footer
    doc.fontSize(10).text("Thank you for your business!", 50, doc.page.height - 100, { align: "center" });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Download invoice PDF error:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice PDF" });
  }
};
