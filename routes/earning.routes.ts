import express from "express";
import {
  getAllUserPayouts,
  getUserPayoutsById
} from "../controlers/earning.controller";
import { authenticate, authorize } from "../middleware/auth";
import { cancelWithdrawal, getEarnings, withdrawFunds } from "../controlers/earnings.controller";

const earningRouter = express.Router();

earningRouter.get(
  "/admin/payouts",
  authenticate,
  authorize("admin"),
  getAllUserPayouts
);
earningRouter.get("/guest/payouts/:userId", authenticate, getUserPayoutsById);

// new earnings
earningRouter.get("/user-earnings", authenticate, getEarnings);
earningRouter.post("/user-withdraw", authenticate, withdrawFunds);
earningRouter.put("/user-withdrawals/:payoutId/cancel",authenticate, cancelWithdrawal);
export default earningRouter;
