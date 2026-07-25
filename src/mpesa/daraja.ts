import axios from "axios";

const BASE_URL = "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const { DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET } = process.env;
  const credentials = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`,
  ).toString("base64");

  const res = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  return res.data.access_token as string;
}

function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
}

function getPassword(timestamp: string): string {
  const { DARAJA_SHORTCODE, DARAJA_PASSKEY } = process.env;
  return Buffer.from(
    `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`,
  ).toString("base64");
}

export interface STKPushResult {
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
}

export async function triggerSTKPush(
  phone: string,
  kesAmount: number,
  accountRef: string,
  callbackUrl: string,
): Promise<STKPushResult> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const { DARAJA_SHORTCODE } = process.env;

  const formattedPhone = phone.startsWith("0") ? `254${phone.slice(1)}` : phone;

  const res = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(kesAmount),
      PartyA: formattedPhone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: "M-Pesa to USDC Bridge",
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return {
    checkoutRequestId: res.data.CheckoutRequestID,
    responseCode: res.data.ResponseCode,
    responseDescription: res.data.ResponseDescription,
  };
}
