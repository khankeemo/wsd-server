"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// C:\wsd-server\src\routes\oauth.routes.ts
const express_1 = __importDefault(require("express"));
const oauth_controller_1 = require("../controllers/oauth.controller");
const router = express_1.default.Router();
// POST /api/auth/oauth/register - Register/login with OAuth
router.post("/oauth/register", oauth_controller_1.oauthRegister);
// POST /api/auth/oauth/verify - Verify OAuth token
router.post("/oauth/verify", oauth_controller_1.verifyOAuthToken);
exports.default = router;
