import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../bridge.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    kes_amount REAL NOT NULL,
    usdc_amount REAL,
    recipient_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'initiated',
    mpesa_checkout_id TEXT,
    mpesa_receipt TEXT,
    eth_tx_hash TEXT,
    error TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

export type TxStatus =
  | "initiated"
  | "mpesa_stk_sent"
  | "mpesa_confirmed"
  | "eth_pending"
  | "eth_confirmed"
  | "failed";

export interface Transaction {
  id: string;
  phone: string;
  kes_amount: number;
  usdc_amount: number | null;
  recipient_address: string;
  status: TxStatus;
  mpesa_checkout_id: string | null;
  mpesa_receipt: string | null;
  eth_tx_hash: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export const txDB = {
  create(data: {
    id: string;
    phone: string;
    kes_amount: number;
    recipient_address: string;
  }): Transaction {
    db.prepare(
      `INSERT INTO transactions (
      id,
      phone,
      kes_amount,
      recipient_address
      )
       VALUES (
       @id, 
       @phone, 
       @kes_amount, 
       @recipient_address
       )`,
    ).run(data);
    return txDB.get(data.id)!;
  },

  get(id: string): Transaction | undefined {
    return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as
      Transaction | undefined;
  },

  getByCheckoutId(checkoutId: string): Transaction | undefined {
    return db
      .prepare("SELECT * FROM transactions WHERE mpesa_checkout_id = ?")
      .get(checkoutId) as Transaction | undefined;
  },

  update(id: string, fields: Partial<Transaction>): void {
    const setClause = Object.keys(fields)
      .map((k) => `${k} = @${k}`)
      .join(", ");
    db.prepare(
      `UPDATE transactions SET ${setClause}, updated_at = unixepoch() WHERE id = ?`,
    ).run({ ...fields, id } as Record<string, unknown>);
  },
};
