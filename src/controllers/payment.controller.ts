import { Request, Response } from "express";
import mongoose from "mongoose";
import Payment from "../models/Payment";
import Invoice from "../models/Invoice";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent";
import PDFDocument from "pdfkit";
import {
  constructStripeWebhookEvent,
  createPayment as createProviderPayment,
  getRazorpayOrderPayments,
  getStripeCheckoutSession,
  PaymentProvider,
  verifyRazorpayWebhookSignature,
} from "../services/payment.service";

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

const getInvoiceForUser = async (invoiceId: string, user: any) => {
  if (!invoiceId) return null;

  if (user.role === "client") {
    return Invoice.findOne({ _id: invoiceId, clientId: user._id });
  }

  return Invoice.findById(invoiceId);
};

const updatePaymentAndInvoice = async (
  payment: any,
  updates: Partial<any>,
  session?: mongoose.ClientSession
) => {
  Object.assign(payment, updates);
  await payment.save({ session });

  if (payment.invoiceId) {
    const invoice = await Invoice.findById(payment.invoiceId).session(session || null);
    if (invoice) {
      const completedPayments = await Payment.find({
        invoiceId: payment.invoiceId,
        status: "completed",
      }).session(session || null);

      const totalPaid = completedPayments.reduce((sum, completedPayment) => {
        return sum + Number(completedPayment.amount || 0);
      }, 0);

      invoice.paidAmount = Math.min(totalPaid, Number(invoice.amount || 0));
      invoice.dueAmount = Math.max(Number(invoice.amount || 0) - invoice.paidAmount, 0);

      if (invoice.dueAmount <= 0) {
        invoice.status = "paid";
      } else if (invoice.paidAmount > 0) {
        invoice.status = "partially_paid";
      } else if (invoice.status === "paid") {
        invoice.status = "pending";
      }

      await invoice.save({ session });
    }
  }

  return payment;
};

const updatePaymentByWebhook = async ({
  paymentId,
  status,
  providerPaymentId,
  failureReason,
}: {
  paymentId: string;
  status: "completed" | "failed";
  providerPaymentId?: string | null;
  failureReason?: string;
}) => {
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(dbSession);
      if (!payment) {
        return;
      }

      if (payment.status === "completed") {
        return;
      }

      if (status === "failed" && payment.status === "failed") {
        return;
      }

      await updatePaymentAndInvoice(
        payment,
        {
          status,
          providerPaymentId: providerPaymentId || payment.providerPaymentId,
          date: new Date(),
          notes:
            status === "failed"
              ? failureReason || payment.notes || "Payment failed"
              : payment.notes || "Payment completed via webhook",
        },
        dbSession
      );
    });
  } finally {
    await dbSession.endSession();
  }
};

const normalizeProvider = (provider?: string): PaymentProvider | null => {
  if (provider === "stripe" || provider === "razorpay") {
    return provider;
  }

  return null;
};

const normalizeProviderCurrency = (provider: PaymentProvider, currency?: string) => {
  const fallback = provider === "razorpay" ? "INR" : "USD";
  return (currency || fallback).toUpperCase();
};

const PROD_FRONTEND_URL = "https://websmithdigital.com";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isLoopbackUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const resolveFrontendBaseUrl = (req: Request, requestedFrontendBaseUrl?: string) => {
  const normalizedRequested = String(requestedFrontendBaseUrl || "").trim();
  const explicitFrontendUrl = String(process.env.FRONTEND_URL || "").trim();
  const originHeader = String(req.headers.origin || "").trim();
  const refererHeader = String(req.headers.referer || "").trim();

  const normalizedRequestedUrl = normalizedRequested ? trimTrailingSlash(normalizedRequested) : "";
  const normalizedExplicit = trimTrailingSlash(explicitFrontendUrl || PROD_FRONTEND_URL);
  const normalizedOrigin = originHeader ? trimTrailingSlash(originHeader) : "";

  if (normalizedRequestedUrl && (!isLoopbackUrl(normalizedRequestedUrl) || process.env.NODE_ENV !== "production")) {
    return normalizedRequestedUrl;
  }

  if (normalizedExplicit && (!isLoopbackUrl(normalizedExplicit) || process.env.NODE_ENV !== "production")) {
    return normalizedExplicit;
  }

  if (normalizedOrigin && !isLoopbackUrl(normalizedOrigin)) {
    return normalizedOrigin;
  }

  if (refererHeader) {
    try {
      const refererOrigin = trimTrailingSlash(new URL(refererHeader).origin);
      if (!isLoopbackUrl(refererOrigin)) {
        return refererOrigin;
      }
    } catch {
      // Ignore invalid referer header.
    }
  }

  return normalizedExplicit;
};

const buildStandalonePaymentReference = () => `PAY-${Date.now()}`;

const createPendingPaymentRecord = async ({
  req,
  user,
  invoice,
  provider,
  amount,
  currency,
  notes,
}: {
  req: Request;
  user: any;
  invoice?: any;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  notes?: string;
}) => {
  const userId = (req as any).userId;
  const invoiceNumber = invoice?.invoiceNumber || buildStandalonePaymentReference();

  return Payment.create({
    userId: invoice?.userId || userId,
    clientId: invoice?.clientId || (user.role === "client" ? userId : null),
    invoiceId: invoice?._id || null,
    invoiceNumber,
    clientName: invoice?.clientName || user.name,
    clientEmail: invoice?.clientEmail || user.email,
    amount,
    currency,
    provider,
    providerPaymentId: "",
    method: "card",
    status: "pending",
    transactionId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    date: new Date(),
    notes: notes || `Online payment initiated via ${provider}`,
  });
};

const syncPendingPaymentRecord = async ({
  payment,
  req,
  user,
  invoice,
  provider,
  amount,
  currency,
  notes,
}: {
  payment: any;
  req: Request;
  user: any;
  invoice?: any;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  notes?: string;
}) => {
  const userId = (req as any).userId;

  payment.userId = invoice?.userId || userId;
  payment.clientId = invoice?.clientId || (user.role === "client" ? userId : null);
  payment.invoiceId = invoice?._id || null;
  payment.invoiceNumber = invoice?.invoiceNumber || payment.invoiceNumber || buildStandalonePaymentReference();
  payment.clientName = invoice?.clientName || user.name;
  payment.clientEmail = invoice?.clientEmail || user.email;
  payment.amount = amount;
  payment.currency = currency;
  payment.provider = provider;
  payment.providerPaymentId = "";
  payment.method = "card";
  payment.notes = notes || `Online payment initiated via ${provider}`;

  await payment.save();
  return payment;
};

export const createGatewayPayment = async (req: Request, res: Response) => {
  try {
    console.log("REQ BODY:", req.body);

    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { provider: rawProvider, invoiceId, notes, amount: rawAmount, currency, frontendBaseUrl } = req.body;
    const provider = normalizeProvider(rawProvider);

    if (!provider) {
      return res.status(400).json({ success: false, message: "Invalid payment provider" });
    }

    if (!invoiceId) {
      if (!Number.isFinite(Number(rawAmount)) || Number(rawAmount) <= 0) {
        return res.status(400).json({ success: false, message: "amount must be a valid number" });
      }

      if (!currency || typeof currency !== "string") {
        return res.status(400).json({ success: false, message: "currency is required" });
      }
    }

    let invoice = null;
    if (invoiceId) {
      invoice = await getInvoiceForUser(invoiceId, user);
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      if (invoice.dueAmount <= 0 || invoice.status === "paid") {
        return res.status(400).json({ success: false, message: "Invoice is already paid" });
      }
    }

    const amount = invoice?.dueAmount ?? invoice?.amount ?? Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "A valid amount is required" });
    }

    const providerCurrency = normalizeProviderCurrency(provider, invoice ? undefined : currency);

    const existingPendingFilter: any = {
      provider,
      status: "pending",
    };

    if (invoice?._id) {
      existingPendingFilter.invoiceId = invoice._id;
    } else {
      existingPendingFilter.userId = userId;
      existingPendingFilter.amount = amount;
      existingPendingFilter.currency = providerCurrency;
      existingPendingFilter.invoiceId = null;
    }

    let payment = await Payment.findOne(existingPendingFilter).sort({ createdAt: -1 });
    if (!payment) {
      payment = await createPendingPaymentRecord({
        req,
        user,
        invoice,
        provider,
        amount,
        currency: providerCurrency,
        notes,
      });
    } else {
      payment = await syncPendingPaymentRecord({
        payment,
        req,
        user,
        invoice,
        provider,
        amount,
        currency: providerCurrency,
        notes,
      });
    }

    console.log("PAYMENT INIT:", {
      paymentId: payment._id.toString(),
      provider,
      amount: payment.amount,
      currency: payment.currency,
      invoiceId: invoice?._id?.toString() || null,
      invoiceNumber: payment.invoiceNumber,
    });

    const frontendUrl = resolveFrontendBaseUrl(req, frontendBaseUrl);
    const providerResponse = await createProviderPayment({
      provider,
      amount: payment.amount,
      currency: payment.currency,
      paymentId: payment._id.toString(),
      invoiceId: invoice?._id?.toString(),
      invoiceNumber: payment.invoiceNumber,
      clientId: String(payment.clientId || ""),
      projectId: String(invoice?.projectId || ""),
      notes: payment.notes,
      customerEmail: payment.clientEmail,
      successUrl: `${frontendUrl}/client/invoices?paymentStatus=success&provider=${provider}&paymentId=${payment._id.toString()}&invoiceId=${invoice?._id?.toString() || ""}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/client/invoices?paymentStatus=cancelled&provider=${provider}&paymentId=${payment._id.toString()}&invoiceId=${invoice?._id?.toString() || ""}`,
    });

    if (provider === "stripe") {
      payment.providerPaymentId = providerResponse.sessionId;
      await payment.save();

      return res.status(201).json({
        success: true,
        data: {
          provider: "stripe",
          checkoutUrl: providerResponse.checkoutUrl,
          paymentId: payment._id,
        },
      });
    }

    payment.providerPaymentId = providerResponse.order.id;
    await payment.save();

    return res.status(201).json({
      success: true,
      data: {
        provider: "razorpay",
        order: providerResponse.order,
        keyId: providerResponse.keyId,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error("PAYMENT ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initialize payment";
    return res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
      error: errorMessage,
    });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  if (!signature) {
    return res.status(400).send("Missing Stripe webhook signature.");
  }

  let event;
  try {
    const rawBody = (req as any).rawBody as Buffer | string;
    if (!rawBody) {
      throw new Error("Missing raw body for Stripe webhook verification.");
    }

    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (error: any) {
    console.error("Stripe webhook verification failed:", error.message || error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const eventId = String(event.id || "");
    const existingEvent = eventId
      ? await PaymentWebhookEvent.findOne({ provider: "stripe", providerEventId: eventId })
      : null;
    if (existingEvent) {
      return res.json({ received: true, duplicate: true });
    }

    const webhookEvent = await PaymentWebhookEvent.create({
      provider: "stripe",
      providerEventId: eventId || `stripe-${Date.now()}`,
      eventType: event.type,
      payload: event,
      status: "received",
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const paymentId = session.metadata?.paymentId || session.client_reference_id;
      const providerPaymentId = session.payment_intent || session.id;

      if (paymentId) {
        await updatePaymentByWebhook({
          paymentId,
          status: "completed",
          providerPaymentId,
        });
      }
    } else if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const object = event.data.object as any;
      const paymentId = object.metadata?.paymentId || object.client_reference_id;
      const failureReason =
        object?.last_payment_error?.message || object?.cancellation_reason || "Stripe payment failed";

      if (paymentId) {
        await updatePaymentByWebhook({
          paymentId,
          status: "failed",
          providerPaymentId: object.id,
          failureReason,
        });
      }
    }
    webhookEvent.status = "processed";
    await webhookEvent.save();
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).send("Webhook processing error");
  }

  res.json({ received: true });
};

export const razorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    return res.status(400).send("Missing Razorpay webhook signature.");
  }

  const payload = req.body;
  const rawBody = (req as any).rawBody as Buffer | string;

  if (!rawBody || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    console.error("Invalid Razorpay webhook signature");
    return res.status(400).send("Invalid signature");
  }

  try {
    const eventType = payload.event;
    const eventId = String(payload?.payload?.payment?.entity?.id || payload?.payload?.order?.entity?.id || "");
    const eventReference = `${eventType}:${eventId || Date.now()}`;
    const existingEvent = await PaymentWebhookEvent.findOne({
      provider: "razorpay",
      providerEventId: eventReference,
    });
    if (existingEvent) {
      return res.json({ received: true, duplicate: true });
    }

    const webhookEvent = await PaymentWebhookEvent.create({
      provider: "razorpay",
      providerEventId: eventReference,
      eventType,
      payload,
      status: "received",
    });

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const paymentId = paymentEntity?.notes?.paymentId || orderEntity?.notes?.paymentId || orderEntity?.receipt || null;
    const providerPaymentId = paymentEntity?.id || orderEntity?.id || null;

    if (!paymentId) {
      return res.status(200).json({ received: true });
    }

    if (eventType === "payment.captured" || eventType === "order.paid") {
      await updatePaymentByWebhook({
        paymentId,
        status: "completed",
        providerPaymentId,
      });
    } else if (eventType === "payment.failed") {
      await updatePaymentByWebhook({
        paymentId,
        status: "failed",
        providerPaymentId,
        failureReason: paymentEntity?.error_description || paymentEntity?.error_reason || "Razorpay payment failed",
      });
    }
    webhookEvent.status = "processed";
    await webhookEvent.save();
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return res.status(500).send("Webhook processing error");
  }

  res.json({ received: true });
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
    const payload = { ...req.body };

    if (user.role === "client") {
      const invoice = await Invoice.findOne({ _id: payload.invoiceId, clientId: userId });
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ success: false, message: "Invoice is already paid" });
      }

      const payment = await Payment.create({
        userId: invoice.userId,
        clientId: userId,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        amount: invoice.amount,
        method: payload.method || "card",
        status: "completed",
        transactionId: payload.transactionId || `TXN-${Date.now()}`,
        date: payload.date ? new Date(payload.date) : new Date(),
        notes: payload.notes || `Client payment for ${invoice.invoiceNumber}`,
      });

      await updatePaymentAndInvoice(payment, {});

      return res.status(201).json({ success: true, data: payment });
    }

    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });

    const payment = await Payment.create({
      ...payload,
      userId,
      transactionId: payload.transactionId || `TXN-${Date.now()}`,
      date: payload.date ? new Date(payload.date) : new Date(),
    });

    await updatePaymentAndInvoice(payment, {});

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
    await updatePaymentAndInvoice(payment, {});

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

export const confirmGatewayPayment = async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: "Manual payment confirmation is disabled. Payment status is updated via secure webhooks only.",
  });
};

const reconcileGatewayPayment = async (payment: any) => {
  if (payment.status !== "pending" || !payment.provider) {
    return payment;
  }

  if (payment.provider === "stripe" && payment.providerPaymentId) {
    const session = await getStripeCheckoutSession(payment.providerPaymentId);
    if (session.payment_status === "paid") {
      await updatePaymentByWebhook({
        paymentId: payment._id.toString(),
        status: "completed",
        providerPaymentId: String(session.payment_intent || session.id),
      });
      return Payment.findById(payment._id);
    }

    if (session.status === "expired") {
      await updatePaymentByWebhook({
        paymentId: payment._id.toString(),
        status: "failed",
        providerPaymentId: String(session.id),
        failureReason: "Stripe checkout expired",
      });
      return Payment.findById(payment._id);
    }
  }

  if (payment.provider === "razorpay" && payment.providerPaymentId) {
    const orderPayments = await getRazorpayOrderPayments(payment.providerPaymentId);
    const capturedPayment = (orderPayments.items || []).find((item: any) => {
      const status = String(item?.status || "").toLowerCase();
      return status === "captured" || status === "authorized";
    });

    if (capturedPayment) {
      await updatePaymentByWebhook({
        paymentId: payment._id.toString(),
        status: "completed",
        providerPaymentId: capturedPayment.id || payment.providerPaymentId,
      });
      return Payment.findById(payment._id);
    }
  }

  const pendingTimeoutMinutes = Number(process.env.GATEWAY_PENDING_TIMEOUT_MINUTES || 20);
  const pendingSinceMs = Date.now() - new Date(payment.createdAt || payment.date || Date.now()).getTime();
  if (Number.isFinite(pendingTimeoutMinutes) && pendingTimeoutMinutes > 0) {
    const timeoutMs = pendingTimeoutMinutes * 60 * 1000;
    if (pendingSinceMs >= timeoutMs) {
      await updatePaymentByWebhook({
        paymentId: payment._id.toString(),
        status: "failed",
        providerPaymentId: payment.providerPaymentId || null,
        failureReason: "Payment verification timed out. Please retry.",
      });
      return Payment.findById(payment._id);
    }
  }

  return payment;
};

export const getGatewayPaymentStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = (req as any).userId;
    if (!user || !userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const paymentId = req.params.id;
    const scope = user.role === "client" ? { _id: paymentId, clientId: userId } : { _id: paymentId, userId };
    const payment = await Payment.findOne(scope);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const reconciled = await reconcileGatewayPayment(payment);
    return res.json({ success: true, data: reconciled });
  } catch (error) {
    console.error("Get gateway payment status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const downloadPaymentReceipt = async (req: Request, res: Response) => {
  try {
    const scope = getPaymentScope(req);
    if (!scope) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payment = await Payment.findOne({ _id: req.params.id, ...scope });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt-${payment.invoiceNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font("Helvetica-Bold").text("Payment Receipt", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(12).font("Helvetica");
    doc.text(`Receipt ID: ${payment._id}`, { align: "right" });
    doc.text(`Invoice Number: ${payment.invoiceNumber}`, { align: "right" });
    doc.text(`Transaction ID: ${payment.transactionId}`, { align: "right" });
    doc.text(`Payment Date: ${new Date(payment.date).toLocaleDateString()}`, { align: "right" });
    doc.text(`Status: ${payment.status.toUpperCase()}`, { align: "right" });
    doc.moveDown(1);

    doc.fontSize(16).font("Helvetica-Bold").text("Paid By");
    doc.moveDown(0.4);
    doc.fontSize(12).font("Helvetica");
    doc.text(payment.clientName);
    doc.text(payment.clientEmail);

    if (payment.notes) {
      doc.moveDown(1);
      doc.fontSize(14).font("Helvetica-Bold").text("Notes");
      doc.moveDown(0.3);
      doc.fontSize(12).font("Helvetica").text(payment.notes);
    }

    doc.moveDown(1);
    doc.fontSize(16).font("Helvetica-Bold").text("Amount Paid");
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor("#007AFF").text(`$${payment.amount.toFixed(2)}`);
    doc.fillColor("black");

    if (payment.invoiceId) {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        doc.moveDown(1);
        doc.fontSize(12).font("Helvetica-Bold").text("Invoice Summary");
        doc.moveDown(0.3);
        doc.fontSize(12).font("Helvetica");
        doc.text(`Invoice Status: ${invoice.status}`);
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      }
    }

    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica").text("Thank you for your payment.", { align: "center" });
    doc.end();
  } catch (error) {
    console.error("Download payment receipt error:", error);
    res.status(500).json({ success: false, message: "Failed to generate payment receipt" });
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
