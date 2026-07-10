import { Router, Request, Response } from "express";
import { txDB } from "../db";

const router = Router();

router.get("/:id", (req: Request, res: Response) => {
  const tx = txDB.get(req.params.id as string);

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({
    transaction_id: tx.id,
    status: tx.status,
    phone: tx.phone,
    kes_amount: tx.kes_amount,
    usdc_amount: tx.usdc_amount,
    recipient_address: tx.recipient_address,
    mpesa_receipt: tx.mpesa_receipt,
    eth_tx_hash: tx.eth_tx_hash,
    explorer_url: tx.eth_tx_hash
      ? `https://amoy.polygonscan.com/tx/${tx.eth_tx_hash}`
      : null,
    error: tx.error,
    created_at: new Date(tx.created_at * 1000).toISOString(),
    updated_at: new Date(tx.updated_at * 1000).toISOString(),
  });
});

export default router;
