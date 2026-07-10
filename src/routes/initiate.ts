import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { ethers } from "ethers";
import { txDB } from "../db";
import { triggerSTKPush } from "../mpesa/daraja";
import { kesToUsdc } from "../eth/transfer";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { phone, kes_amount, recipient_address } = req.body as {
    phone: string;
    kes_amount: number;
    recipient_address: string;
  };

  if (!phone || !kes_amount || !recipient_address) {
    res.status(400).json({
      error:
        "phone, kes_amount and recipient_address are required"
    });
    return;
  }

  if (kes_amount < 10) {
    res.status(400).json({ error: "Minimum amount is KES 10" });
    return;
  }

  if (!ethers.isAddress(recipient_address)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  const id = randomUUID();
  const usdc_amount = kesToUsdc(kes_amount);
  const callbackUrl = `${process.env.CALLBACK_BASE_URL}/mpesa/callback`;

  const tx = txDB.create({ id, phone, kes_amount, recipient_address });

  try {
    const result = await triggerSTKPush(phone, kes_amount, id, callbackUrl);

    txDB.update(id, {
      status: "mpesa_stk_sent",
      mpesa_checkout_id: result.checkoutRequestId,
      usdc_amount,
    });

    res.json({
      transaction_id: id,
      status: "mpesa_stk_sent",
      usdc_amount,
      message: "STK Push sent. Check your phone to complete M-Pesa payment.",
      checkout_request_id: result.checkoutRequestId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    txDB.update(id, { status: "failed", error: message });
    res.status(502).json({ error: "Failed to initiate M-Pesa payment", detail: message });
  }
});

export default router;
