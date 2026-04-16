import express from "express";
import {
  login,
  register,
  changePassword,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password/request", requestForgotPasswordOtp);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);
router.post("/change-password", authMiddleware, changePassword);
export default router;