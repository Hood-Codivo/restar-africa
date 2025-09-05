import { NextFunction, Request, Response } from "express";
import userModel from "../models/user_model";

// Add a new bank account for the authenticated user
export const addBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user._id;
    const { account_number, bank, currency, description } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Add the new bank account to the user's banks array
    user.banks.push({ account_number, bank, currency, description });
    await user.save();

    res.status(201).json({
      success: true,
      message: "Bank account added successfully.",
      banks: user.banks,
    });
  } catch (error: any) {
    next(error);
  }
};

// Get all bank accounts for the authenticated user
export const getBankAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId).select("banks");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      success: true,
      banks: user.banks,
    });
  } catch (error: any) {
    next(error);
  }
};

// Update an existing bank account
export const updateBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user._id;
    const { bankId } = req.params;
    const updateData = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Find the specific bank account by its ID
    const bankAccount = (user.banks as any).id(bankId);
    if (!bankAccount) {
      return res.status(404).json({ message: "Bank account not found." });
    }

    // Update the bank account fields
    Object.assign(bankAccount, updateData);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Bank account updated successfully.",
      banks: user.banks,
    });
  } catch (error: any) {
    next(error);
  }
};

// Remove a bank account
export const removeBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user._id;
    const { bankId } = req.params;

    console.log("1. Starting removeBankAccount process...");
    console.log(
      "2. Request received for userId:",
      userId,
      "and bankId:",
      bankId
    );

    const user = await userModel.findById(userId);
    if (!user) {
      console.log("3. Error: User not found with ID:", userId);
      return res.status(404).json({ message: "User not found." });
    }

    console.log("4. User found successfully.");

    // Use the .pull() method on the banks array to remove the subdocument by its _id
    // This is the correct and reliable way to remove a subdocument
    (user.banks as any).pull({ _id: bankId });

    await user.save();

    console.log(
      "9. User saved to database successfully. Final banks count:",
      user.banks.length
    );

    res.status(200).json({
      success: true,
      message: "Bank account removed successfully.",
      banks: user.banks,
    });
  } catch (error: any) {
    console.error(
      "10. An unhandled error occurred in removeBankAccount:",
      error
    );
    next(error);
  }
};
