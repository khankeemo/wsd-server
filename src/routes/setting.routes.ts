import express, { Request, Response } from "express";
import Setting from "../models/Setting";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";

const router = express.Router();

/**
 * @route   GET /api/settings/public/:key
 * @desc    Get a public setting by key
 * @access  Public
 */
router.get("/public/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });
    
    if (!setting) {
      res.json({ success: true, data: null });
      return;
    }
    
    res.json({ success: true, data: setting.value });
  } catch (error) {
    console.error("Error fetching public setting:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   PUT /api/settings/public/:key
 * @desc    Update a public setting
 * @access  Private/Admin
 */
router.put("/public/:key", authMiddleware, requireRoles("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      res.status(400).json({ success: false, message: "Value is required" });
      return;
    }

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true } // upsert creates it if it doesn't exist
    );
    
    res.json({ success: true, data: setting.value });
  } catch (error) {
    console.error("Error updating public setting:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
