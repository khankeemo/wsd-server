import { Router } from "express";
import { razorpayWebhook, stripeWebhook } from "../controllers/payment.controller";

const router = Router();

router.post("/stripe", stripeWebhook);
router.post("/razorpay", razorpayWebhook);

export default router;
