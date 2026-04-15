import express from "express";
import {
  login,
  register,
  changePassword,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  issueTemporaryPasswordAfterOtp,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password/request", requestForgotPasswordOtp);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/issue-temp-password", issueTemporaryPasswordAfterOtp);
router.post("/change-password", authMiddleware, changePassword);
export default router;