import { Request, Response } from "express";
const Flutterwave = require("flutterwave-node-v3");
import dotenv from "dotenv";

dotenv.config();

const { FLW_PUBLIC_KEY, FLW_SECRET_KEY, FLW_ENCRYPTION_KEY } = process.env;

if (!FLW_PUBLIC_KEY || !FLW_SECRET_KEY || !FLW_ENCRYPTION_KEY) {
  console.error("Missing required Flutterwave API keys");
  process.exit(1);
}

const flw = new Flutterwave(FLW_PUBLIC_KEY, FLW_SECRET_KEY);

interface PaymentRequest {
  card_number: string;
  cvv: string;
  expiry_month: string;
  expiry_year: string;
  currency: string;
  amount: string;
  fullname: string;
  email: string;
  phone_number: string;
  tx_ref: string;
}

export const makePaymentApi = async (
  req: Request<{}, {}, PaymentRequest>,
  res: Response
) => {
  try {
    const payload = {
      ...req.body,
      redirect_url: "https://www.example.com/payment-callback",
      enckey: FLW_ENCRYPTION_KEY,
    };

    const response = await flw.Charge.card(payload);
    console.log("Initial charge response:", response);

    if (response.status === "success") {
      if (response.meta.authorization.mode === "pin") {
        // For PIN transactions
        const payload2 = {
          ...payload,
          authorization: {
            mode: "pin",
            fields: ["pin"],
            pin: 3310, // In a real application, this should be collected from the user
          },
        };
        const reCallCharge = await flw.Charge.card(payload2);
        console.log("PIN charge response:", reCallCharge);

        res.json({
          status: "success",
          message: "PIN required",
          data: {
            flw_ref: reCallCharge.data.flw_ref,
          },
        });
      } else if (response.meta.authorization.mode === "redirect") {
        // For 3DS or VBV transactions
        res.json({
          status: "success",
          message: "Redirect required",
          data: {
            redirect_url: response.meta.authorization.redirect,
          },
        });
      } else {
        res.json({ status: "success", data: response.data });
      }
    } else {
      res.status(400).json({ status: "error", message: response.message });
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({
      error: "An error occurred while processing the payment",
      details: error.message,
    });
  }
};

export const validatePayment = async (req: Request, res: Response) => {
  try {
    const { otp, flw_ref } = req.body;

    const callValidate = await flw.Charge.validate({
      otp,
      flw_ref,
    });

    console.log("Validation response:", callValidate);

    if (callValidate.status === "success") {
      res.json({ status: "success", data: callValidate.data });
    } else {
      res.status(400).json({ status: "error", message: callValidate.message });
    }
  } catch (error) {
    console.error("Payment validation error:", error);
    res.status(500).json({
      error: "An error occurred while validating the payment",
      details: error.message,
    });
  }
};

export const getPaymentApi = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;
    const response = await flw.Transaction.verify({ id: transaction_id });
    res.json(response);
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      error: "An error occurred while verifying the payment",
      details: error.message,
    });
  }
};
