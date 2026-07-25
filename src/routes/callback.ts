import { Router, Request, Response } from "express";
import { txDB } from "../db";
import { sendUSDC } from "../eth/transfer";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as {
    Body: {
      stkCallback: {
        CheckoutRequestID: string;
        ResultCode: number;
        ResultDesc: string;
        CallbackMetadata?: {
          Item: Array<{ Name: string; Value?: string | number }>;
        };
      };
    };
  };

  const cb = body?.Body?.stkCallback;

  // Always acknowledge Safaricom immediately — they retry on non-200
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  if (!cb) return;

  const tx = txDB.getByCheckoutId(cb.CheckoutRequestID);
  if (!tx) {
    console.error(`[callback] Unknown checkout ID: ${cb.CheckoutRequestID}`);
    return;
  }

  if (cb.ResultCode !== 0) {
    // User cancelled or payment failed
    txDB.update(tx.id, { status: "failed", error: cb.ResultDesc });
    console.log(`[callback] M-Pesa failed for ${tx.id}: ${cb.ResultDesc}`);
    return;
  }

  // Extract M-Pesa receipt from metadata
  const items = cb.CallbackMetadata?.Item ?? [];
  const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value as
    string | undefined;

  txDB.update(tx.id, {
    status: "mpesa_confirmed",
    mpesa_receipt: receipt ?? null,
  });

  console.log(`[callback] M-Pesa confirmed for ${tx.id}, receipt: ${receipt}`);

  // Trigger USDC transfer on Polygon
  txDB.update(tx.id, { status: "eth_pending" });

  try {
    const result = await sendUSDC(tx.recipient_address, tx.usdc_amount!);
    txDB.update(tx.id, {
      status: "eth_confirmed",
      eth_tx_hash: result.txHash,
    });
    console.log(`[callback] USDC sent! tx: ${result.explorerUrl}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    txDB.update(tx.id, {
      status: "failed",
      error: `ETH transfer failed: ${message}`,
    });
    console.error(`[callback] ETH transfer failed for ${tx.id}: ${message}`);
  }
});

export default router;
