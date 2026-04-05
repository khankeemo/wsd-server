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
        const { name, email, phone, company, address, status } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ message: "Missing required fields: name, email" });
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
        console.error("Create client error:", error);
        res.status(500).json({ message: "Failed to create client" });
    }
};
exports.createClient = createClient;
// Update client
const updateClient = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { name, email, phone, company, address, status } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const client = await Client_1.Client.findOne({ _id: id, userId });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        if (name)
            client.name = name;
        if (email)
            client.email = email;
        if (phone !== undefined)
            client.phone = phone;
        if (company !== undefined)
            client.company = company;
        if (address !== undefined)
            client.address = address;
        if (status)
            client.status = status;
        await client.save();
        res.json({ success: true, data: client });
    }
    catch (error) {
        console.error("Update client error:", error);
        res.status(500).json({ message: "Failed to update client" });
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
