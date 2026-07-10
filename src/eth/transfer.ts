import { ethers } from "ethers";

// Minimal ERC-20 ABI — only what we need
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// Polygon Amoy testnet (Mumbai was deprecated April 2024)
const AMOY_RPC = "https://rpc-amoy.polygon.technology";

// Test USDC on Amoy — official Circle testnet address
const USDC_ADDRESS_AMOY = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";

export interface TransferResult {
  txHash: string;
  explorerUrl: string;
}

export async function sendUSDC(
  recipientAddress: string,
  usdcAmount: number
): Promise<TransferResult> {
  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const signer = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, provider);

  const usdc = new ethers.Contract(USDC_ADDRESS_AMOY, ERC20_ABI, signer);
  const decimals: number = await usdc.decimals();

  const amountInUnits = ethers.parseUnits(usdcAmount.toFixed(6), decimals);

  const tx = await usdc.transfer(recipientAddress, amountInUnits);
  await tx.wait(1); // wait for 1 block confirmation

  return {
    txHash: tx.hash,
    explorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
  };
}

export function kesToUsdc(kesAmount: number): number {
  const rate = parseFloat(process.env.KES_PER_USD || "130");
  // Subtract 1% bridge fee
  const usd = (kesAmount / rate) * 0.99;
  return parseFloat(usd.toFixed(6));
}
