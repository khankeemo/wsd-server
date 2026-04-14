import { Request, Response } from "express";
import mongoose from "mongoose";
import { Service } from "../models/Service";

const normalizeServicePayload = (body: Record<string, unknown>) => {
  const rawIsActive = body.isActive;
  const isActive =
    rawIsActive === false ||
    rawIsActive === "false" ||
    rawIsActive === "inactive" ||
    rawIsActive === 0
      ? false
      : true;

  return {
    name: String(body.name || "").trim(),
    description: String(body.description || "").trim(),
    isActive,
  };
};

const handleServiceError = (res: Response, error: unknown, fallbackMessage: string) => {
  console.error(fallbackMessage, error);

  if ((error as any)?.code === 11000) {
    return res.status(409).json({ success: false, message: "A service with this name already exists" });
  }

  if ((error as any)?.name === "ValidationError") {
    const validationMessage = Object.values((error as any).errors || {})
      .map((issue: any) => issue.message)
      .join(", ");

    return res.status(400).json({ success: false, message: validationMessage || "Invalid service data" });
  }

  return res.status(500).json({ success: false, message: "Failed to process service request" });
};

export const getAllServices = async (_req: Request, res: Response) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json({ success: true, data: services });
  } catch (error) {
    console.error("Get all services error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = normalizeServicePayload(req.body);

    if (!name || !description) {
      return res.status(400).json({ success: false, message: "Name and description are required" });
    }

    const service = await Service.create({
      name,
      description,
      isActive,
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    return handleServiceError(res, error, "Create service error:");
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }

    const { name, description, isActive } = normalizeServicePayload(req.body);

    if (!name || !description) {
      return res.status(400).json({ success: false, message: "Name and description are required" });
    }

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    service.name = name;
    service.description = description;
    service.isActive = isActive;

    await service.save();

    res.json({ success: true, data: service });
  } catch (error) {
    return handleServiceError(res, error, "Update service error:");
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error("Delete service error:", error);
    res.status(500).json({ success: false, message: "Failed to delete service" });
  }
};
