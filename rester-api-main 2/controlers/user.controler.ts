import { CatchAsyncError } from "../middleware/catchAsyncErrors";
require("dotenv").config();
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import ejs from "ejs";
import path from "path";
import sendEmail from "../utils/sendMail";
import {
  getAllUsersService,
  getUserByIdC,
  updateUsersRoleService,
} from "../services/user.service";
import cloudinary from "cloudinary";
import bcrypt from "bcryptjs";
import { generateOTP } from "../utils/otpUtils";
import { createToken } from "../utils/createToken";
import userModel from "../models/user_model";
import mongoose from "mongoose";
import Notification from "../models/notificationModel";

const TOKEN_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("token", token, {
    expires: new Date(Date.now() + TOKEN_EXPIRY),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

export const register = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      name,
      email,
      password,
      business_name,
      role,
      gender,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "password",
      "role",
      "gender",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return next(
        new ErrorHandler(
          `Missing required fields: ${missingFields.join(", ")}`,
          400
        )
      );
    }

    // Check existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("User already exists", 409));
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Create user
    const user = await userModel.create({
      name,
      email,
      password,
      business_name,
      gender,
      role,
      otp,
      otpExpiry,
    });

    try {
      // Send verification email
      const emailData = { user: { name }, otp };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activationmail.ejs"),
        emailData
      );

      await sendEmail({
        email,
        subject: "Account Verification OTP",
        template: "activationmail.ejs",
        data: emailData,
      });

      res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email.",
      });
    } catch (emailError: any) {
      // Clean up user if email fails
      await userModel.deleteOne({ _id: user._id });
      return next(new ErrorHandler("Failed to send verification email", 500));
    }
  }
);


export const upgradeToHost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hostId } = req.params;

    // 1. Find the user
    const user = await userModel.findById(hostId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // 2. Check if the user is already a host
    if (user.role === "seller") {
      return next(new ErrorHandler("User is already a host", 400));
    }

    // 3. Prepare for upgrade
    user.role = "seller";
    user.updatedAt = new Date();

    // 4. Send the upgrade email
    const data = { user: user.name };
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/upgrade-email.ejs"),
      data
    );

    try {
      await sendEmail({
        email: user.email,
        subject: "Welcome to Akiba Host",
        template: "upgrade-email.ejs",
        data,
      });
    } catch (emailError: any) {
      // If email fails, don't stop the upgrade process, just log the error.
      // The user still gets their role updated.
      console.error("Email sending failed:", emailError);
    }

    // 5. Create a new notification
    await Notification.create({
      recipient: user._id,
      type: "Welcome to Rester",
      content: `Hi ${user.name}, thanks for upgrading to a host account on this platform.`,
    });

    // 6. Save the user after all other operations are complete
    await user.save();

    // 7. Send the success response
    res.status(200).json({
      success: true,
      message: "Upgraded to host successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    // 8. Centralized error handling
    return next(new ErrorHandler(error.message, 500));
  }
};

export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark user as verified and clear OTP details
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    if (user.role === "seller") {
      // Notify host with their referral code
      await Notification.create({
        recipient: user._id,
        type: "Welcome Host",
        content: `Congratulations ${user.name}! Your host account has been successfully verified. Your unique referral code is: ${user.referral_code}. Share it to earn rewards!`,
      });
    }
    // --- End funding and notification logic ---

    await user.save(); // Save the updated user document

    const token = createToken(user._id); // Generate JWT token

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    next(new ErrorHandler(error.message, 500)); // Use ErrorHandler for consistency
  }
};

// admin login api
export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const user = await userModel.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your account before logging in" });
    }

    // --- New: Check if the user's role is 'admin' ---
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Only administrators can log in here.",
      });
    }
    // --- End New Check ---

    const token = createToken(user._id);
    setTokenCookie(res, token);
    res.status(200).json({
      success: true,
      token,
      user: {
        // Return only necessary user details
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// guest login login api
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const user = await userModel.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your account before logging in" });
    }
    
    const token = createToken(user._id);
    setTokenCookie(res, token);
    res.status(200).json({
      success: true,
      token,
      user: {
        // Return only necessary user details
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const data = { user: { name: user.name }, otp };
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activationmail.ejs"),
      data
    );
    try {
      await sendEmail({
        email: email,
        subject: "Account Verification OTP",
        template: "activationmail.ejs",
        data,
      });
      res.status(200).json({
        success: true,
        message: "OTP resent successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  } catch (error) {
    next(error);
  }
};

export const guestToHostSwitch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {};

export const createHostReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hostId } = req.params;
    const { rating, comment } = req.body;
    const guestId = req.user._id;

    if (!rating) {
      return res.status(400).json({ message: "Please provide a rating" });
    }

    const host = await userModel.findById(hostId);

    if (!host || host.role !== "user") {
      return res.status(404).json({ message: "Host not found" });
    }

    const review = {
      rating,
      comment,
      guest: guestId,
    };

    host.hostDetails.reviews.push(review);
    await host.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const loginWithEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your account before logging in" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    // Email data to be used in the template
    const data = { otp };

    // Render email template with data
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activationmail.ejs"),
      data
    );

    try {
      // Attempt to send OTP email
      await sendEmail({
        email,
        subject: "Account Verification OTP",
        template: "activationmail.ejs",
        data,
      });

      // If email is sent successfully, create the user
      await user.save();

      res.status(200).json({
        success: true,
        message: "OTP sent to your email for login verification",
      });
    } catch (emailError: any) {
      // If email sending fails, return error
      return next(new ErrorHandler(emailError.message, 400));
    }
  } catch (error) {
    next(error);
  }
};

export const verifyLoginOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = createToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const user = await userModel
      .findById(userId)
      .select("-password -otp -otpExpiry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordApi = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    // Email data to be used in the template
    const data = { otp };

    // Render email template with data
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activationmail.ejs"),
      data
    );

    try {
      // Attempt to send OTP email
      await sendEmail({
        email,
        subject: "Account Verification OTP",
        template: "activationmail.ejs",
        data,
      });

      // If email is sent successfully, create the user
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password reset OTP sent to your email",
      });
    } catch (emailError: any) {
      // If email sending fails, return error
      return next(new ErrorHandler(emailError.message, 400));
    }
  } catch (error) {
    next(error);
  }
};

export const resetPasswordApi = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const socialLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Please provide name and email" });
    }

    let user = await userModel.findOne({ email });

    if (!user) {
      // Create a new user if not found
      user = await userModel.create({
        name,
        email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Generate a random password
        isVerified: true, // Social login users are considered verified
      });
    }

    const token = createToken(user._id);
    setTokenCookie(res, token);
    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

interface IUpdateUserPassword {
  currentPassword: string;
  newPassword: string;
}

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body as IUpdateUserPassword;
    console.log(currentPassword, newPassword, "id");

    // Check if the authenticated user is trying to update their own password
    if (userId !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own password." });
    }

    const user = await userModel.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

interface IUpdateUserProfilePic {
  avatar: string;
}

export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { avatar } = req.body as IUpdateUserProfilePic;
    const userId = req.user?._id;

    if (!userId) {
      return next(new ErrorHandler("User ID not provided", 400));
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!avatar) {
      return next(new ErrorHandler("No avatar provided", 400));
    }
    // Delete existing avatar if it exists
    if (user.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    }

    // Upload new avatar
    const uploadedAvatar = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatar",
      width: 400,
    });

    // Update user profile with new avatar
    user.avatar = {
      public_id: uploadedAvatar.public_id,
      url: uploadedAvatar.secure_url,
    };

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

interface IUpdateUserHostId {
  hostidcard: string;
}

export const updateUserHOSTId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hostidcard } = req.body as IUpdateUserHostId;
    const userId = req.user?._id;

    if (!userId) {
      return next(new ErrorHandler("User ID not provided", 400));
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!hostidcard) {
      return next(new ErrorHandler("No Identity card provided", 400));
    }
    // Delete existing avatar if it exists
    if (user.hostidcard?.public_id) {
      await cloudinary.v2.uploader.destroy(user.hostidcard.public_id);
    }

    // Upload new avatar
    const uploadedAvatar = await cloudinary.v2.uploader.upload(hostidcard, {
      folder: "ID Card",
      width: 400,
    });

    // Update user profile with new avatar
    user.hostidcard = {
      public_id: uploadedAvatar.public_id,
      url: uploadedAvatar.secure_url,
    };

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

interface IUpdateUserCertificate {
  certificate: string;
}

export const updateUserCertificate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID not provided" });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { certificate } = req.body as IUpdateUserCertificate; // Expecting base64 string in `certificate`

    if (!certificate || typeof certificate !== "string") {
      return res.status(400).json({
        success: false,
        message: "No Business Certificate provided or incorrect format",
      });
    }

    // Delete existing certificate if it exists
    if (user.certificate?.public_id) {
      await cloudinary.v2.uploader.destroy(user.certificate.public_id);
    }

    // Upload new certificate (expecting base64 string in `data`)
    const uploadedCertificate = await cloudinary.v2.uploader.upload(
      certificate,
      {
        folder: "Business Certificates",
        width: 400,
      }
    );

    // Update user profile with new certificate
    user.certificate = {
      public_id: uploadedCertificate.public_id,
      url: uploadedCertificate.secure_url,
    };

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("Error updating user certificate:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// user profile info
export const updateUserInfoKYC = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, id_number, business_name, reg_number } = req.body;

      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (user) {
        user.type = type;
        user.id_number = id_number;
        user.business_name = business_name;
        user.reg_number = reg_number;
      }

      await user?.save();
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// user profile info
export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        phoneNumber,
        bio,
        location,
        name,
        gender,
        language,
        occupation,
        country,
        propertyDestinationCountry,
        propertyDestinationCity,
        propertyRating,
        propertyType,
        nightlyRate,
      } = req.body;

      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (user) {
        user.name = name;
        user.phoneNumber = phoneNumber;
        user.location = location;
        user.bio = bio;
        user.gender = gender;
        user.language = language;
        user.occupation = occupation;
        (user.country = country),
          (user.propertyDestinationCity = propertyDestinationCity);
        user.propertyDestinationCountry = propertyDestinationCountry;
        user.propertyRating = propertyRating;
        user.propertyType = propertyType;
        user.nightlyRate = nightlyRate;
      }

      await user?.save();
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateUserInfoPreference = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        propertyDestinationCountry,
        propertyDestinationCity,
        propertyRating,
        propertyType,
        nightlyRate,
      } = req.body;

      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (user) {
        user.propertyDestinationCity = propertyDestinationCity;
        user.propertyDestinationCountry = propertyDestinationCountry;
        user.propertyRating = propertyRating;
        user.propertyType = propertyType;
        user.nightlyRate = nightlyRate;
      }

      await user?.save();
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
// user nofications
export const updateUserInfoNotifcation = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notification } = req.body;

      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (user) {
        user.notification = notification;
      }

      await user?.save();
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all users for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user by id
export const getUserById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
      const user = await userModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

// fetching user info
export const getUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserByIdC(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// logout
export const logout = (req: Request, res: Response) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};

// delete user by admin

export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await userModel.findById(id);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      await user.deleteOne({ id });
      res.status(200).json({
        success: true,
        message: "User deleted successful",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user role
export const upDateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role, isSuspend, reason } = req.body;
      updateUsersRoleService(res, id, role, isSuspend, reason);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// chat

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userModel.findById(req.user?._id).select("-password");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Ensure the user is treated as a guest
    const guestUser = {
      ...user.toObject(),
      role: "guest",
    };

    res.status(200).json({
      success: true,
      user: guestUser,
      message: "Current user retrieved successfully as guest",
    });
  } catch (error) {
    next(error);
  }
};

export const getHost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const host = await userModel.findOne({ role: "admin" }).select("-password");
    if (!host) {
      return next(new ErrorHandler("Host not found", 404));
    }
    res.status(200).json({ success: true, user: host });
  } catch (error) {
    next(error);
  }
};

// app.get('/api/user-report', async (req, res) => {
export const getUsersStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalUsers = await userModel.countDocuments();
    const unverifiedUsers = await userModel.countDocuments({
      isVerified: false,
    });
    const verifiedUsers = await userModel.countDocuments({ isVerified: true });
    const hosts = await userModel.countDocuments({ role: "host" });
    const guests = await userModel.countDocuments({ role: "guest" });
    const customerService = await userModel.countDocuments({ role: "admin" });

    const report = {
      total: totalUsers,
      unverified: unverifiedUsers,
      verified: verifiedUsers,
      host: hosts,
      guest: guests,
      customerService: customerService,
    };

    res.json(report);
  } catch (error) {
    console.error("Error generating user report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
