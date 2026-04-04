// C:\wsd-server\src\controllers\client.controller.ts
// Client Controller - Full CRUD operations for clients
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import { Client } from "../models/Client";

// Helper to get userId from request
const getUserId = (req: Request): string | undefined => {
  return (req as any).userId || (req as any).user?.id;
};

// Get all clients for the authenticated user
export const getClients = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const clients = await Client.find({ userId }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ message: "Failed to fetch clients" });
  }
};

// Get single client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOne({ _id: id, userId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ message: "Failed to fetch client" });
  }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
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

    const client = await Client.create({
      userId,
      name,
      email,
      phone: phone || "",
      company: company || "",
      address: address || "",
      status: status || "active",
    });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ message: "Failed to create client" });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, email, phone, company, address, status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOne({ _id: id, userId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (name) client.name = name;
    if (email) client.email = email;
    if (phone !== undefined) client.phone = phone;
    if (company !== undefined) client.company = company;
    if (address !== undefined) client.address = address;
    if (status) client.status = status;

    await client.save();

    res.json({ success: true, data: client });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ message: "Failed to update client" });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOneAndDelete({ _id: id, userId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ message: "Failed to delete client" });
  }
};