import express from "express";
import {
  createHostReview,
  deleteUser,
  forgotPasswordApi,
  getAllUsers,
  getCurrentUser,
  getHost,
  getUser,
  getUserById,
  getUserInfo,
  getUsersStatistics,
  login,
  loginWithEmail,
  logout,
  register,
  resendOTP,
  resetPasswordApi,
  socialLogin,
  updatePassword,
  updateUserCertificate,
  updateUserHOSTId,
  updateUserInfo,
  updateUserInfoKYC,
  updateUserInfoNotifcation,
  updateUserInfoPreference,
  updateUserProfile,
  upDateUserRole,
  upgradeToHost,
  verifyLoginOTP,
  verifyOTP,
} from "../controlers/user.controler";
import { authenticate, authorize } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post("/register-user", register);
userRouter.post("/verify-otp", verifyOTP);

userRouter.post("/login", login);
userRouter.post("/resent-otp", resendOTP);
userRouter.get("/get-user-info/:userId", authenticate, getUserInfo);
userRouter.post(
  "/host/:hostId",
  authenticate,
  authorize("guest"),
  createHostReview
);
userRouter.post(
  "/upgrade-to-host/:hostId",
  authenticate,
  authorize("user"),
  upgradeToHost
);
userRouter.post("/login-with-email-only", loginWithEmail);
userRouter.post("/login-with-email-only-otp", verifyLoginOTP);
userRouter.post("/reset-password", resetPasswordApi);
userRouter.post("/forgot-password", forgotPasswordApi);
userRouter.post("/social-login", socialLogin);
userRouter.get("/get-users", getAllUsers);
userRouter.put("/user/:userId/password", authenticate, updatePassword);
userRouter.post("/logout", authenticate, logout);
userRouter.get("/user", authenticate, getUser);
userRouter.put("/update-user-info", authenticate, updateUserInfo);
userRouter.put(
  "/update-user-info-preference",
  authenticate,
  updateUserInfoPreference
);
userRouter.put(
  "/update-user-info-notification",
  authenticate,
  updateUserInfoNotifcation
);
userRouter.put("/update-user-avatar", authenticate, updateUserProfile);
userRouter.get("/users/:userId", getUserById);
userRouter.delete("/delete-user/:id", authenticate, deleteUser);
userRouter.put("/update-user-role", authenticate, upDateUserRole);
userRouter.put("/users-kyc", authenticate, updateUserInfoKYC);

userRouter.put("/hostidcard", authenticate, updateUserHOSTId);
userRouter.put("/certificated", authenticate, updateUserCertificate);
userRouter.get("/users-report", authenticate, getUsersStatistics);

// test for chat
userRouter.get("/current", authenticate, getCurrentUser);
userRouter.get("/host", authenticate, getHost);

export default userRouter;
