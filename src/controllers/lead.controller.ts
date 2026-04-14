import { Request, Response } from "express";
import mongoose from "mongoose";
import { Lead } from "../models/Lead";
import { Service } from "../models/Service";
import { getActiveServices } from "../services/leadCatalog.service";
import { sendLeadNotification } from "../services/leadNotification.service";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s\-()]{8,20}$/;

const normalizeString = (value: unknown) => String(value || "").trim();

const parseBudget = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
};

export const getServices = async (_req: Request, res: Response) => {
  try {
    const services = await getActiveServices();
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    res.json({
      success: true,
      data: services.map((service) => ({
        id: service._id,
        name: service.name,
        description: service.description,
      })),
    });
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const name = normalizeString(req.body.name);
    const email = normalizeString(req.body.email).toLowerCase();
    const phone = normalizeString(req.body.phone);
    const company = normalizeString(req.body.company);
    const timeline = normalizeString(req.body.timeline);
    const notes = normalizeString(req.body.notes);
    const cmsRequirement = normalizeString(req.body.cmsRequirement);
    const appPlatform = normalizeString(req.body.appPlatform);
    const budget = parseBudget(req.body.budget);
    const serviceIds = Array.isArray(req.body.services) ? req.body.services : [];

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Name, email, and phone are required" });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email address is required" });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({ success: false, message: "A valid phone number is required" });
    }

    if (Number.isNaN(budget)) {
      return res.status(400).json({ success: false, message: "Budget must be a valid number" });
    }

    if (!serviceIds.length) {
      return res.status(400).json({ success: false, message: "At least one service must be selected" });
    }

    const normalizedServiceIds = serviceIds.map((serviceId) => String(serviceId)).filter(Boolean);

    if (
      normalizedServiceIds.some((serviceId) => !mongoose.Types.ObjectId.isValid(serviceId))
    ) {
      return res.status(400).json({ success: false, message: "One or more selected services are invalid" });
    }

    const services = await Service.find({
      _id: { $in: normalizedServiceIds },
      isActive: true,
    });

    if (services.length !== normalizedServiceIds.length) {
      return res.status(400).json({ success: false, message: "One or more selected services are unavailable" });
    }

    if (appPlatform && !["iOS", "Android", "Both"].includes(appPlatform)) {
      return res.status(400).json({ success: false, message: "App platform must be iOS, Android, or Both" });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      company: company || "",
      budget,
      timeline: timeline || "",
      notes: notes || "",
      cmsRequirement: cmsRequirement || "",
      appPlatform: appPlatform || null,
      services: services.map((service) => ({
        serviceId: service._id,
        serviceName: service.name,
      })),
    });

    await sendLeadNotification(lead, services);

    res.status(201).json({
      success: true,
      data: {
        id: lead._id,
        name: lead.name,
        email: lead.email,
        createdAt: lead.createdAt,
      },
    });
  } catch (error) {
    console.error("Create lead error:", error);
    res.status(500).json({ success: false, message: "Failed to create lead" });
  }
};
