import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter | null> | null = null;

export const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    (process.env.SMTP_FROM || process.env.SMTP_USER)
  );
};

const getTransporter = async () => {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn("Email service skipped: SMTP credentials are not fully configured.");
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  })();

  return transporterPromise;
};

export const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  const transporter = await getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !fromEmail) {
    const errorMsg = "Email sending failed: SMTP credentials are not fully configured in .env.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error: any) {
    console.error("Email send error:", error);
    throw new Error(`Failed to send email: ${error.message || "Unknown SMTP error"}`);
  }
};

export const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
