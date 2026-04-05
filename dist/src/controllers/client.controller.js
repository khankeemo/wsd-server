"use strict";
// C:\wsd-server\src\controllers\client.controller.ts
// Client Controller - Full CRUD operations for clients
// Features: Create, Read, Update, Delete with user authentication
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClients = void 0;
const Client_1 = require("../models/Client");
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
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const clients = await Client_1.Client.find({ userId }).sort({ createdAt: -1 });
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
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOne({ _id: id, userId });
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
// Create new client
const createClient = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!name || !email) {
            return res.status(400).json({ message: "Missing required fields: name, email" });
        }
        const existingClient = await Client_1.Client.findOne({ userId, email });
        if (existingClient) {
            return res.status(409).json({ message: "A client with this email already exists" });
        }
        const client = await Client_1.Client.create({
            userId,
            name,
            email,
            phone: phone || "",
            company: company || "",
            address: address || "",
            status: status || "active",
        });
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
        const userId = getUserId(req);
        const { id } = req.params;
        const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOne({ _id: id, userId });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        if (!name || !email) {
            return res.status(400).json({ message: "Missing required fields: name, email" });
        }
        const duplicateClient = await Client_1.Client.findOne({
            userId,
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
    }
    catch (error) {
        return handleClientError(res, error, "Update client error:");
    }
};
exports.updateClient = updateClient;
// Delete client
const deleteClient = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOneAndDelete({ _id: id, userId });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json({ success: true, message: "Client deleted successfully" });
    }
    catch (error) {
        console.error("Delete client error:", error);
        res.status(500).json({ message: "Failed to delete client" });
    }
};
exports.deleteClient = deleteClient;
