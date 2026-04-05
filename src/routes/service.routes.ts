import express from "express";
import { getServices } from "../controllers/lead.controller";

const router = express.Router();

router.get("/", getServices);

export default router;
