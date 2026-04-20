// C:\wsd-server\src\routes\oauth.routes.ts
import express from "express";
import { oauthRegister, verifyOAuthToken } from "../controllers/oauth.controller";

const router = express.Router();

router.post("/", oauthRegister);
router.post("/oauth/register", oauthRegister);

router.post("/oauth/verify", verifyOAuthToken);

export default router;
