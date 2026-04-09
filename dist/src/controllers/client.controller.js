"use strict";
// C:\wsd-server\src\controllers\client.controller.ts
// Client Controller - Full CRUD operations for clients
// Features: Create, Read, Update, Delete with user authentication
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClients = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const Client_1 = require("../models/Client");
const User_1 = __importDefault(require("../models/User"));
const email_service_1 = require("../services/email.service");
// Helper to get userId from request
const getUserId = (req) => {
    return req.userId || req.user?.id;
};
const normalizeClientPayload = (body) => {
    return {
        name: String(body.name || "").trim(),
        email: String(body.email || "").trim().toLowerCase(),
        phone: String(body.phone || "").trim(),
        company: String(body.company || "").trim(),
        address: String(body.address || "").trim(),
        status: (body.status === "inactive" ? "inactive" : "active"),
    };
};
const buildAdminOwnershipQuery = (adminId) => ({
    $or: [
        { adminId },
        { adminId: { $exists: false }, userId: adminId },
    ],
});
const generateCustomClientId = async () => {
    let nextNumber = await User_1.default.countDocuments({ role: "client" });
    while (true) {
        nextNumber += 1;
        const customId = `CL-${nextNumber.toString().padStart(4, "0")}`;
        const existing = await User_1.default.exists({ customId });
        if (!existing) {
            return customId;
        }
    }
};
const handleClientError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error?.code === 11000) {
        return res.status(409).json({ message: "A client with this email already exists" });
    }
    if (error?.name === "ValidationError") {
        const validationMessage = Object.values(error.errors || {})
            .map((issue) => issue.message)
            .join(", ");
        return res.status(400).json({ message: validationMessage || "Invalid client data" });
    }
    return res.status(500).json({ message: "Failed to process client request" });
};
// Get all clients for the authenticated user
const getClients = async (req, res) => {
    try {
        const adminId = getUserId(req);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const clients = await Client_1.Client.find(buildAdminOwnershipQuery(adminId)).sort({ createdAt: -1 });
        res.json({ success: true, data: clients });
    }
    catch (error) {
        console.error("Get clients error:", error);
        res.status(500).json({ message: "Failed to fetch clients" });
    }
};
exports.getClients = getClients;
// Get single client by ID
const getClientById = async (req, res) => {
    try {
        const adminId = getUserId(req);
        const { id } = req.params;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOne({ _id: id, ...buildAdminOwnershipQuery(adminId) });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json({ success: true, data: client });
    }
    catch (error) {
        console.error("Get client error:", error);
        res.status(500).json({ message: "Failed to fetch client" });
    }
};
exports.getClientById = getClientById;
// Create new client (Admin only)
const createClient = async (req, res) => {
    try {
        const adminId = getUserId(req);
        const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!name || !email) {
            return res.status(400).json({ message: "Missing required fields: name, email" });
        }
        if (!(0, email_service_1.isEmailConfigured)()) {
            return res.status(500).json({
                message: "Client email is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the backend deployment environment.",
            });
        }
        const existingClient = await Client_1.Client.findOne({
            email,
            ...buildAdminOwnershipQuery(adminId),
        });
        if (existingClient) {
            return res.status(409).json({ message: "A client with this email already exists" });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser && existingUser.role !== "client") {
            return res.status(409).json({ message: "A user with this email already exists" });
        }
        let customId = existingUser?.customId;
        if (!customId) {
            customId = await generateCustomClientId();
        }
        const tempPassword = crypto_1.default.randomBytes(4).toString("hex"); // 8 chars
        const hashedTempPassword = await bcryptjs_1.default.hash(tempPassword, 10);
        const newUser = existingUser
            ? await User_1.default.findByIdAndUpdate(existingUser._id, {
                name,
                email,
                password: hashedTempPassword,
                phone: phone || existingUser.phone || "",
                company: company || existingUser.company || "",
                role: "client",
                customId,
                isTemporaryPassword: true,
                isApproved: true,
                setupCompleted: false,
            }, { new: true, runValidators: true })
            : await User_1.default.create({
                name,
                email,
                password: hashedTempPassword,
                phone: phone || "",
                company: company || "",
                role: "client",
                customId,
                isTemporaryPassword: true,
                isApproved: true,
                setupCompleted: false,
            });
        if (!newUser) {
            throw new Error("Failed to create or update client user");
        }
        const client = await Client_1.Client.create({
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
        <p>Hello <strong>${(0, email_service_1.escapeHtml)(name)}</strong>,</p>
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
            await (0, email_service_1.sendEmail)(email, emailSubject, emailText, emailHtml);
        }
        catch (emailError) {
            console.error("Cleanup: Email failed to send, deleting partially created records:", emailError.message);
            // Cleanup: Delete the User and Client if email fails
            if (client?._id)
                await Client_1.Client.findByIdAndDelete(client._id);
            if (newUser?._id)
                await User_1.default.findByIdAndDelete(newUser._id);
            throw new Error(`Client creation failed because the invitation email could not be sent. Error: ${emailError.message}`);
        }
        res.status(201).json({ success: true, data: client });
    }
    catch (error) {
        return handleClientError(res, error, "Create client error:");
    }
};
exports.createClient = createClient;
// Update client
const updateClient = async (req, res) => {
    try {
        const adminId = getUserId(req);
        const { id } = req.params;
        const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOne({ _id: id, ...buildAdminOwnershipQuery(adminId) });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        if (!name || !email) {
            return res.status(400).json({ message: "Missing required fields: name, email" });
        }
        const duplicateClient = await Client_1.Client.findOne({
            email,
            _id: { $ne: id },
            ...buildAdminOwnershipQuery(adminId),
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
    }
    catch (error) {
        return handleClientError(res, error, "Update client error:");
    }
};
exports.updateClient = updateClient;
// Delete client
const deleteClient = async (req, res) => {
    try {
        const adminId = getUserId(req);
        const { id } = req.params;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // 1. Find the client first to get the associated userId
        const client = await Client_1.Client.findOne({ _id: id, ...buildAdminOwnershipQuery(adminId) });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // 2. Delete the associated User account
        if (client.userId && String(client.userId) !== adminId) {
            await User_1.default.findByIdAndDelete(client.userId);
        }
        // 3. Delete the Client profile
        await Client_1.Client.findByIdAndDelete(id);
        res.json({ success: true, message: "Client and associated user account deleted successfully" });
    }
    catch (error) {
        console.error("Delete client error:", error);
        res.status(500).json({ message: "Failed to delete client" });
    }
};
exports.deleteClient = deleteClient;
