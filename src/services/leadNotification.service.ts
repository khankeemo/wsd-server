import nodemailer from "nodemailer";
import { ILead } from "../models/Lead";
import { IService } from "../models/Service";

let transporterPromise: Promise<nodemailer.Transporter | null> | null = null;

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
      console.warn("Lead notification email skipped: SMTP credentials are not fully configured.");
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

export const sendLeadNotification = async (lead: ILead, services: IService[]) => {
  const transporter = await getTransporter();
  const salesEmail = process.env.SALES_NOTIFICATION_EMAIL;
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !salesEmail || !fromEmail) {
    if (!salesEmail) {
      console.warn("Lead notification email skipped: SALES_NOTIFICATION_EMAIL is not configured.");
    }
    return;
  }

  const serviceList = services.map((service) => `- ${service.name}`).join("\n");

  await transporter.sendMail({
    from: fromEmail,
    to: salesEmail,
    subject: `New lead: ${lead.name}`,
    text: [
      "A new lead has been captured.",
      "",
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone}`,
      `Company: ${lead.company || "N/A"}`,
      `Budget: ${typeof lead.budget === "number" ? lead.budget : "N/A"}`,
      `Timeline: ${lead.timeline || "N/A"}`,
      `CMS Requirement: ${lead.cmsRequirement || "N/A"}`,
      `App Platform: ${lead.appPlatform || "N/A"}`,
      "",
      "Selected Services:",
      serviceList || "- None",
      "",
      `Notes: ${lead.notes || "N/A"}`,
    ].join("\n"),
    html: `
      <h2>New Lead Captured</h2>
      <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>
      <p><strong>Company:</strong> ${escapeHtml(lead.company || "N/A")}</p>
      <p><strong>Budget:</strong> ${typeof lead.budget === "number" ? lead.budget : "N/A"}</p>
      <p><strong>Timeline:</strong> ${escapeHtml(lead.timeline || "N/A")}</p>
      <p><strong>CMS Requirement:</strong> ${escapeHtml(lead.cmsRequirement || "N/A")}</p>
      <p><strong>App Platform:</strong> ${escapeHtml(lead.appPlatform || "N/A")}</p>
      <p><strong>Services:</strong></p>
      <ul>${services.map((service) => `<li>${escapeHtml(service.name)}</li>`).join("")}</ul>
      <p><strong>Notes:</strong> ${escapeHtml(lead.notes || "N/A")}</p>
    `,
  });
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
