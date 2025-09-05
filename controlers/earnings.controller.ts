import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user_model";
import mongoose from "mongoose";

// @desc    Get total sum of user's payouts_revenue
// @route   GET /api/v1/user/earnings
// @access  Private (User)
export const getEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id; // Get userId from authenticated request

    if (!userId) {
      return next(new ErrorHandler("User not authenticated.", 401));
    }

    const user = await userModel.findById(userId).select("payouts_revenue");

    if (!user) {
      return next(new ErrorHandler("User not found.", 404));
    }

    res.status(200).json({
      success: true,
      totalEarnings: user.payouts_revenue,
      message: "User earnings retrieved successfully.",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// @desc    Cancel a pending withdrawal and refund to payouts_revenue
// @route   PUT /api/v1/user/withdrawals/:payoutId/cancel
// @access  Private (User)
export const cancelWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session: mongoose.ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?._id;
    const { payoutId } = req.params;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("User not authenticated.", 401));
    }

    const user = await userModel.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("User not found.", 404));
    }

    // Find the specific payout within the user's payouts array
    const payout = (user.payouts as any).id(payoutId);

    if (!payout) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("Payout not found.", 404));
    }

    // Only allow cancellation if the payout status is 'Pending'
    if (payout.status !== "Pending") {
      await session.abortTransaction();
      session.endSession();
      return next(
        new ErrorHandler(
          `Cannot cancel a payout with status '${payout.status}'.`,
          400
        )
      );
    }

    // Revert the funds back to the user's payouts_revenue
    user.payouts_revenue += payout.amount;

    // Update the payout status to 'Cancelled'
    payout.status = "Cancelled";

    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message:
        "Withdrawal cancelled successfully. Funds have been returned to your earnings balance.",
      newBalance: user.payouts_revenue,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error during withdrawal cancellation:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};

// @desc    Withdraw funds from a user's payouts_revenue
// @route   POST /api/v1/user/withdraw
// @access  Private (User)
export const withdrawFunds = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session: mongoose.ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?._id; // Get userId from authenticated request
    const { amount, bankName, description, currency = "NGN" } = req.body;

    console.log(req.body, "fhhfh");

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("User not authenticated.", 401));
    }

    if (!amount || amount <= 0 || !bankName) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new ErrorHandler("Invalid amount or missing bank details.", 400)
      );
    }

    const user = await userModel.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("User not found.", 404));
    }

    // Check if the user has sufficient funds
    if (user.payouts_revenue < amount) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("Insufficient funds for withdrawal.", 400));
    }

    // Deduct the amount from the total earnings
    user.payouts_revenue -= amount;

    // Create a new payout record
    const newPayout = {
      amount: amount,
      currency: currency,
      description: description || `Withdrawal to bank account: ${bankName}`,
      status: "Pending" as "Pending", // Mark as pending
      date: new Date(),
    };
    user.payouts.push(newPayout);

    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message:
        "Withdrawal request submitted successfully. It is now pending approval.",
      newBalance: user.payouts_revenue,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error during fund withdrawal:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};
