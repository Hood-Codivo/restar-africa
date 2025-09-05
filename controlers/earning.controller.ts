import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user_model";

export const getAllUserPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await userModel.find({}, "name email role payouts");

    let totalOverallPayoutNGN = 0;
    let totalOverallPayoutUSD = 0;
    const userPayoutsSummary = [];

    for (const user of users) {
      let userTotalApprovedPayoutNGN = 0;
      let userTotalApprovedPayoutUSD = 0;

      const approvedPayouts = user.payouts.filter(
        (payout) => payout.status === "Approved"
      );

      for (const payout of approvedPayouts) {
        if (payout.currency === "NGN") {
          userTotalApprovedPayoutNGN += payout.amount;
        } else if (payout.currency === "USD") {
          userTotalApprovedPayoutUSD += payout.amount;
        }
      }

      totalOverallPayoutNGN += userTotalApprovedPayoutNGN;
      totalOverallPayoutUSD += userTotalApprovedPayoutUSD;

      userPayoutsSummary.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userTotalApprovedPayoutNGN,
        userTotalApprovedPayoutUSD,
        payoutDetails: approvedPayouts.map((payout) => ({
          amount: payout.amount,
          currency: payout.currency,
          date: payout.date,
          description: payout.description,
          status: payout.status,
        })),
      });
    }

    res.status(200).json({
      success: true,
      totalOverallPayoutNGN,
      totalOverallPayoutUSD,
      userPayoutsSummary,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

export const getUserPayoutsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const user = await userModel.findById(userId, "name email role payouts");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    let userTotalApprovedPayoutNGN = 0;
    let userTotalApprovedPayoutUSD = 0;
    const approvedPayouts = user.payouts.filter(
      (payout) => payout.status === "Approved"
    );

    for (const payout of approvedPayouts) {
      if (payout.currency === "NGN") {
        userTotalApprovedPayoutNGN += payout.amount;
      } else if (payout.currency === "USD") {
        userTotalApprovedPayoutUSD += payout.amount;
      }
    }

    res.status(200).json({
      success: true,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      userTotalApprovedPayoutNGN,
      userTotalApprovedPayoutUSD,
      payoutDetails: approvedPayouts.map((payout) => ({
        amount: payout.amount,
        currency: payout.currency,
        date: payout.date,
        description: payout.description,
        status: payout.status,
      })),
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};
