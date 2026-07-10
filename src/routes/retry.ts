import { Router, Request, Response } from "express";
import { txDB } from "../db";
import { sendUSDC } from "../eth/transfer";

const router = Router();

router.post("/:id", async (req: Request, res: Response) => {
  const tx = txDB.get(req.params.id as string);

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Only retry if M-Pesa already confirmed but ETH leg failed
  const retryableStatuses = ["eth_pending", "failed"];
  if (!retryableStatuses.includes(tx.status) || !tx.mpesa_receipt) {
    res.status(400).json({
      error: "Transaction is not retryable",
      detail: `Status is '${tx.status}'. Only transactions where M-Pesa confirmed but ETH transfer failed can be retried.`,
    });
    return;
  }

  if (!tx.usdc_amount) {
    res.status(400).json({ error: "Transaction has no USDC amount recorded" });
    return;
  }

  txDB.update(tx.id, { status: "eth_pending", error: null });

  res.json({
    transaction_id: tx.id,
    status: "eth_pending",
    message: "Retrying USDC transfer...",
  });

  // Run async — client polls /bridge/status/:id to see outcome
  try {
    const result = await sendUSDC(tx.recipient_address, tx.usdc_amount);
    txDB.update(tx.id, {
      status: "eth_confirmed",
      eth_tx_hash: result.txHash,
    });
    console.log(`[retry] USDC sent! tx: ${result.explorerUrl}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    txDB.update(tx.id, { status: "failed", error: `ETH retry failed: ${message}` });
    console.error(`[retry] ETH retry failed for ${tx.id}: ${message}`);
  }
});

export default router;
