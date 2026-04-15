import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";

export type PaymentProvider = "stripe" | "razorpay";

const toMinorUnit = (amount: number) => Math.round(amount * 100);

const getStripeSecretKey = () => process.env.STRIPE_SECRET_KEY || "";
const getStripeWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || "";
const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID || "";
const getRazorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET || "";
const getRazorpayWebhookSecret = () =>
  process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

const getStripeClient = () => {
  const stripeSecretKey = getStripeSecretKey();
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2022-11-15",
  });
};

const getRazorpayClient = () => {
  const razorpayKeyId = getRazorpayKeyId();
  const razorpayKeySecret = getRazorpayKeySecret();
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
};

export interface CreateStripeCheckoutSessionPayload {
  amount: number;
  currency: string;
  paymentId: string;
  invoiceNumber: string;
  successUrl: string;
  cancelUrl: string;
  notes?: string;
  invoiceId?: string;
  customerEmail?: string;
}

export interface CreateRazorpayOrderPayload {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface UnifiedCreatePaymentPayload {
  provider: PaymentProvider;
  amount: number;
  currency: string;
  paymentId: string;
  invoiceNumber: string;
  successUrl?: string;
  cancelUrl?: string;
  notes?: string;
  invoiceId?: string;
  customerEmail?: string;
}

export const createStripeCheckoutSession = async (payload: CreateStripeCheckoutSessionPayload) => {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: payload.customerEmail,
    client_reference_id: payload.paymentId,
    line_items: [
      {
        price_data: {
          currency: payload.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${payload.invoiceNumber}`,
          },
          unit_amount: toMinorUnit(payload.amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId: payload.paymentId,
      invoiceId: payload.invoiceId || "",
      invoiceNumber: payload.invoiceNumber,
      notes: payload.notes || "",
    },
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session.");
  }

  return session;
};

export const getStripeCheckoutSession = async (sessionId: string) => {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
};

export const createRazorpayOrder = async (payload: CreateRazorpayOrderPayload) => {
  const razorpay = getRazorpayClient();
  return razorpay.orders.create({
    amount: toMinorUnit(payload.amount),
    currency: payload.currency.toUpperCase(),
    receipt: payload.receipt,
    notes: payload.notes || {},
  });
};

export const getRazorpayPayment = async (providerPaymentId: string) => {
  const razorpay = getRazorpayClient();
  return razorpay.payments.fetch(providerPaymentId);
};

export const verifyRazorpayCheckoutSignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const razorpayKeySecret = getRazorpayKeySecret();
  if (!razorpayKeySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};

export const createPayment = async (payload: UnifiedCreatePaymentPayload) => {
  console.log("PAYMENT ENV CHECK:", {
    stripeSecretKeyLoaded: Boolean(getStripeSecretKey()),
    razorpayKeyIdLoaded: Boolean(getRazorpayKeyId()),
    razorpayKeySecretLoaded: Boolean(getRazorpayKeySecret()),
  });

  if (payload.provider === "stripe") {
    const session = await createStripeCheckoutSession({
      amount: payload.amount,
      currency: payload.currency,
      paymentId: payload.paymentId,
      invoiceNumber: payload.invoiceNumber,
      successUrl: payload.successUrl || "",
      cancelUrl: payload.cancelUrl || "",
      notes: payload.notes,
      invoiceId: payload.invoiceId,
      customerEmail: payload.customerEmail,
    });

    return {
      provider: "stripe" as const,
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }

  if (payload.provider === "razorpay") {
    const order = await createRazorpayOrder({
      amount: payload.amount,
      currency: payload.currency,
      receipt: payload.paymentId,
      notes: {
        paymentId: payload.paymentId,
        invoiceId: payload.invoiceId || "",
        invoiceNumber: payload.invoiceNumber,
      },
    });

    return {
      provider: "razorpay" as const,
      order,
      keyId: getRazorpayKeyId(),
    };
  }

  throw new Error(`Unsupported payment provider: ${payload.provider}`);
};

export const constructStripeWebhookEvent = (rawBody: Buffer | string, signature: string) => {
  const stripeWebhookSecret = getStripeWebhookSecret();
  if (!stripeWebhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  return getStripeClient().webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
};

export const verifyRazorpayWebhookSignature = (rawBody: Buffer | string, signature: string) => {
  const razorpayWebhookSecret = getRazorpayWebhookSecret();
  if (!razorpayWebhookSecret) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
};
