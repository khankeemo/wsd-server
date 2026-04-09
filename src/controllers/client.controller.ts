// C:\wsd-server\src\controllers\client.controller.ts
// Client Controller - Full CRUD operations for clients
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Client } from "../models/Client";
import User from "../models/User";
import { sendEmail, escapeHtml } from "../services/email.service";

// Helper to get userId from request
const getUserId = (req: Request): string | undefined => {
  return (req as any).userId || (req as any).user?.id;
};

const normalizeClientPayload = (body: Record<string, unknown>) => {
  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    company: String(body.company || "").trim(),
    address: String(body.address || "").trim(),
    status: (body.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
  };
};

const handleClientError = (res: Response, error: unknown, fallbackMessage: string) => {
  console.error(fallbackMessage, error);

  if ((error as any)?.code === 11000) {
    return res.status(409).json({ message: "A client with this email already exists" });
  }

  if ((error as any)?.name === "ValidationError") {
    const validationMessage = Object.values((error as any).errors || {})
      .map((issue: any) => issue.message)
      .join(", ");

    return res.status(400).json({ message: validationMessage || "Invalid client data" });
  }

  return res.status(500).json({ message: "Failed to process client request" });
};

// Get all clients for the authenticated user
export const getClients = async (req: Request, res: Response) => {
  try {
    const adminId = getUserId(req);
    
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const clients = await Client.find({ adminId }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
};

// Get single client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const adminId = getUserId(req);
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOne({ _id: id, adminId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ message: "Failed to fetch client" });
  }
};

// Create new client (Admin only)
export const createClient = async (req: Request, res: Response) => {
  try {
    const adminId = getUserId(req);
    const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name, email" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    // 1. Generate unique customId (CL-XXXX)
    const count = await User.countDocuments({ role: "client" });
    const customId = `CL-${(count + 1).toString().padStart(4, "0")}`;

    // 2. Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString("hex"); // 8 chars
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Create User account
    const newUser = await User.create({
      name,
      email,
      password: hashedTempPassword,
      role: "client",
      customId,
      isTemporaryPassword: true,
      isApproved: true,         // Admin creating the account = approval granted
      setupCompleted: false,
    });

    // 4. Create Client profile
    const client = await Client.create({
      userId: newUser._id,
      adminId,
      name,
      email,
      phone: phone || "",
      company: company || "",
      address: address || "",
      status: status || "active",
      customId,
    });

    // 5. Send Email with credentials
    const emailSubject = "Your Websmith Client Account Credentials";
    const emailText = `
      Welcome to Websmith, ${name}!
      
      Your client account has been created. Please use the following credentials to log in:
      
      Client ID: ${customId}
      Temporary Password: ${tempPassword}
      
      Log in here: ${process.env.FRONTEND_URL || "http://localhost:3000"}/login
      
      Note: You will be required to change your password upon your first login.
    `;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5ea; border-radius: 12px;">
        <h2 style="color: #007AFF;">Welcome to Websmith!</h2>
        <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
        <p>Your client account has been successfully created. You can now access your dashboard using the credentials below:</p>
        <div style="background-color: #f2f2f7; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; margin-bottom: 8px;"><strong>Client ID:</strong> ${customId}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background-color: #e5e5ea; padding: 2px 4px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p>Please log in through our portal:</p>
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login" style="display: inline-block; background-color: #007AFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Log In to Dashboard</a>
        <p style="margin-top: 20px; font-size: 14px; color: #8E8E93;">Note: For security reasons, you will be required to change this temporary password upon your first login.</p>
      </div>
    `;

    try {
      await sendEmail(email, emailSubject, emailText, emailHtml);
    } catch (emailError: any) {
      console.error("Cleanup: Email failed to send, deleting partially created records:", emailError.message);
      
      // Cleanup: Delete the User and Client if email fails
      if (client?._id) await Client.findByIdAndDelete(client._id);
      if (newUser?._id) await User.findByIdAndDelete(newUser._id);
      
      throw new Error(`Client creation failed because the invitation email could not be sent. Error: ${emailError.message}`);
    }

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    return handleClientError(res, error, "Create client error:");
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const adminId = getUserId(req);
    const { id } = req.params;
    const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOne({ _id: id, adminId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name, email" });
    }

    const duplicateClient = await Client.findOne({
      adminId,
      email,
      _id: { $ne: id },
    });

    if (duplicateClient) {
      return res.status(409).json({ message: "A client with this email already exists" });
    }

    client.name = name;
    client.email = email;
    client.phone = phone;
    client.company = company;
    client.address = address;
    client.status = status;

    await client.save();

    res.json({ success: true, data: client });
  } catch (error) {
    return handleClientError(res, error, "Update client error:");
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const adminId = getUserId(req);
    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Find the client first to get the associated userId
    const client = await Client.findOne({ _id: id });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // 2. Delete the associated User account
    if (client.userId) {
      await User.findByIdAndDelete(client.userId);
    }

    // 3. Delete the Client profile
    await Client.findByIdAndDelete(id);

    res.json({ success: true, message: "Client and associated user account deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ message: "Failed to delete client" });
  }
};
