# PesaChain

An open-source bridge that converts M-Pesa payments (KES) into USDC on the Polygon network. Built to fill a real gap — no developer-focused reference implementation for M-Pesa ↔ Ethereum exists. This is it.

## What It Does

```
User pays KES via M-Pesa STK Push
  → Your backend receives Daraja callback
  → Converts KES to USDC at live rate
  → Sends USDC to recipient's Polygon wallet
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Server:** Express
- **Blockchain:** ethers.js v6 → Polygon Amoy testnet
- **M-Pesa:** Safaricom Daraja API (STK Push)
- **Database:** SQLite (better-sqlite3) — tracks transaction state
- **Tunnel:** ngrok (for local webhook testing)

## Transaction States

```
initiated → mpesa_stk_sent → mpesa_confirmed → eth_pending → eth_confirmed
                                                           ↘ failed (retryable)
```

## API Endpoints

| Method | Path                 | Description                                      |
| ------ | -------------------- | ------------------------------------------------ |
| `GET`  | `/health`            | Server alive check                               |
| `POST` | `/bridge/initiate`   | Start a KES → USDC transaction                   |
| `GET`  | `/bridge/status/:id` | Poll transaction state                           |
| `POST` | `/bridge/retry/:id`  | Retry failed ETH transfer after M-Pesa confirmed |
| `POST` | `/mpesa/callback`    | Safaricom webhook (called by Daraja, not you)    |

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Safaricom Developer](https://developer.safaricom.co.ke) account (sandbox)
- A Polygon Amoy testnet wallet with test MATIC and USDC
- [ngrok](https://ngrok.com) for exposing your local server to Daraja

### 2. Install

```bash
git clone https://github.com/YOUR_USERNAME/pesachain
cd pesachain
npm install
```

### 3. Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
PORT=3000
CALLBACK_BASE_URL=https://YOUR_NGROK_URL   # from: ngrok http 3000

DARAJA_CONSUMER_KEY=your_key
DARAJA_CONSUMER_SECRET=your_secret
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

ETH_PRIVATE_KEY=your_testnet_wallet_private_key

KES_PER_USD=130
```

> **Never commit your `.env` file. Never use a mainnet private key during testing.**

### 4. Run

```bash
# Terminal 1 — tunnel
ngrok http 3000

# Terminal 2 — server
npm run dev
```

### 5. Test

```bash
# Initiate a bridge transaction
curl -X POST http://localhost:3000/bridge/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "kes_amount": 500,
    "recipient_address": "0xYourPolygonWalletAddress"
  }'

# Poll status
curl http://localhost:3000/bridge/status/<transaction_id>

# Retry if ETH leg failed
curl -X POST http://localhost:3000/bridge/retry/<transaction_id>
```

## Project Structure

```
src/
  index.ts              # Server entry point
  db/index.ts           # SQLite transaction store
  mpesa/daraja.ts       # Daraja auth + STK Push
  eth/transfer.ts       # USDC transfer on Polygon
  routes/
    initiate.ts         # POST /bridge/initiate
    callback.ts         # POST /mpesa/callback
    status.ts           # GET  /bridge/status/:id
    retry.ts            # POST /bridge/retry/:id
```

## What's Not Built Yet (Roadmap)

- [ ] Live KES/USD price feed (Chainlink oracle)
- [ ] SMS receipt to user via Africa's Talking
- [ ] KYC/AML layer (CBK compliance)
- [ ] Frontend UI
- [ ] Mainnet deployment guide

## Why This Exists

Every Kenyan Web3 fintech team rebuilds this plumbing from scratch. There is no open reference implementation, no architecture guide, no working code. PesaChain is the foundation layer that should have existed.

## License

MIT
