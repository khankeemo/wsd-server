// C:\wsd-server\src\routes\oauth.routes.ts
import express from "express";
import { oauthRegister, verifyOAuthToken } from "../controllers/oauth.controller";

const router = express.Router();

// POST /api/auth/oauth/register - Register/login with OAuth
router.post("/oauth/register", oauthRegister);

// POST /api/auth/oauth/verify - Verify OAuth token
router.post("/oauth/verify", verifyOAuthToken);

export default router;