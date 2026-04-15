import express from "express";
import { login, register, changePassword } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
router.post("/login", login);
router.post("/register", register);
router.post("/change-password", authMiddleware, changePassword);
export default router;