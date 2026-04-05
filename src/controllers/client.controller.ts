// C:\wsd-server\src\controllers\client.controller.ts
// Client Controller - Full CRUD operations for clients
// Features: Create, Read, Update, Delete with user authentication

import { Request, Response } from "express";
import { Client } from "../models/Client";

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
    const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name, email" });
    }

    const existingClient = await Client.findOne({ userId, email });

    if (existingClient) {
      return res.status(409).json({ message: "A client with this email already exists" });
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
    return handleClientError(res, error, "Create client error:");
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, email, phone, company, address, status } = normalizeClientPayload(req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await Client.findOne({ _id: id, userId });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields: name, email" });
    }

    const duplicateClient = await Client.findOne({
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
  } catch (error) {
    return handleClientError(res, error, "Update client error:");
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
