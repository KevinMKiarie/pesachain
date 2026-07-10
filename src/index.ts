import "dotenv/config";
import express from "express";
import initiateRoute from "./routes/initiate";
import callbackRoute from "./routes/callback";
import statusRoute from "./routes/status";
import retryRoute from "./routes/retry";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/bridge/initiate", initiateRoute);
app.use("/bridge/status", statusRoute);
app.use("/bridge/retry", retryRoute);
app.use("/mpesa/callback", callbackRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT}`);
  console.log(`Callback URL base: ${process.env.CALLBACK_BASE_URL}`);
});
