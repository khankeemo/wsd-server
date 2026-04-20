import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User";

type OAuthProvider = "google" | "yahoo";

type OAuthProfile = {
  email: string;
  name: string;
  providerId: string;
};

const normalizeProvider = (provider: unknown): OAuthProvider | null => {
  if (provider === "google" || provider === "yahoo") {
    return provider;
  }
  return null;
};

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

const issueAuthResponse = (res: Response, user: any) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );

  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminLevel: user.role === "admin" ? user.adminLevel || "super" : null,
      isTemporaryPassword: user.isTemporaryPassword,
      setupCompleted: user.setupCompleted,
      isApproved: user.isApproved,
    },
  });
};

const createOAuthPassword = async () => {
  const randomPassword = crypto.randomBytes(24).toString("hex");
  return bcrypt.hash(randomPassword, 10);
};

const upsertOAuthUser = async ({
  provider,
  email,
  name,
  providerId,
}: {
  provider: OAuthProvider;
  email: string;
  name: string;
  providerId: string;
}) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      provider,
      providerId,
      password: await createOAuthPassword(),
      isOAuthUser: true,
      role: "client",
    });
    return user;
  }

  let shouldSave = false;
  if (!user.provider) {
    user.provider = provider;
    shouldSave = true;
  }
  if (!user.providerId) {
    user.providerId = providerId;
    shouldSave = true;
  }
  if (!user.isOAuthUser) {
    user.isOAuthUser = true;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const fetchJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const text = await response.text();

  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      parsed?.error_description ||
      parsed?.error ||
      parsed?.message ||
      `OAuth provider request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parsed;
};

const fetchGoogleProfile = async (token: string): Promise<OAuthProfile> => {
  let profile: any;

  try {
    profile = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    profile = await fetchJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  }

  const email = normalizeEmail(profile?.email);
  const name = String(profile?.name || profile?.given_name || email.split("@")[0] || "Google User").trim();
  const providerId = String(profile?.sub || "").trim();

  if (!email || !providerId) {
    throw new Error("Google account details were incomplete.");
  }

  return { email, name, providerId };
};

const fetchYahooProfile = async (token: string): Promise<OAuthProfile> => {
  const profile = await fetchJson("https://api.login.yahoo.com/openid/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const email = normalizeEmail(profile?.email);
  const name = String(
    profile?.name ||
      profile?.given_name ||
      profile?.nickname ||
      email.split("@")[0] ||
      "Yahoo User"
  ).trim();
  const providerId = String(profile?.sub || "").trim();

  if (!email || !providerId) {
    throw new Error("Yahoo account details were incomplete.");
  }

  return { email, name, providerId };
};

const fetchOAuthProfile = async (provider: OAuthProvider, token: string) => {
  if (provider === "google") {
    return fetchGoogleProfile(token);
  }

  return fetchYahooProfile(token);
};

export const oauthRegister = async (req: Request, res: Response) => {
  try {
    const provider = normalizeProvider(req.body?.provider);
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || "").trim();
    const providerId = String(req.body?.providerId || `${provider || "oauth"}_${Date.now()}`).trim();

    if (!provider || !email || !name) {
      return res.status(400).json({
        message: "Missing required fields: provider, email, and name are required",
      });
    }

    const user = await upsertOAuthUser({ provider, email, name, providerId });
    return issueAuthResponse(res, user);
  } catch (error) {
    console.error("OAuth registration error:", error);
    return res.status(500).json({ message: "OAuth registration failed. Please try again." });
  }
};

export const verifyOAuthToken = async (req: Request, res: Response) => {
  try {
    const provider = normalizeProvider(req.body?.provider);
    const token = String(req.body?.token || "").trim();

    if (!provider || !token) {
      return res.status(400).json({ message: "Provider and token are required" });
    }

    const profile = await fetchOAuthProfile(provider, token);
    const user = await upsertOAuthUser({
      provider,
      email: profile.email,
      name: profile.name,
      providerId: profile.providerId,
    });

    return issueAuthResponse(res, user);
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      message: error instanceof Error ? error.message : "Token verification failed",
    });
  }
};
