import { NextFunction, Request, Response } from "express";
import Booking from "../models/book.model";
import cron from "node-cron";
import path from "path";
import ejs from "ejs";
import Notification from "../models/notificationModel";
import sendEmail from "../utils/sendMail";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user_model";
import mongoose from "mongoose";
import listingModel from "../models/listing.model";
import PDFDocument from "pdfkit";
import {
  format,
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  differenceInHours,
} from "date-fns";
import Refund from "../models/Refund.model";
import OfflineRefund from "../models/offlineRefund.model";

// Helper function to normalize dates to YYYY-MM-DD UTC string
const toYYYYMMDD = (dateInput: Date | string): string => {
  let d: Date;
  if (typeof dateInput === "string") {
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }
  d.setUTCHours(0, 0, 0, 0); // Ensure UTC midnight
  return format(d, "yyyy-MM-dd"); // Always format to the exact string
};

// Helper function to get all dates in a range (inclusive) as YYYY-MM-DD strings
const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  const dates = eachDayOfInterval({ start, end });
  return dates.map((d) => format(d, "yyyy-MM-dd")); // Explicitly format each date from the interval
};

// Booking Controller

// Booking Controller

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session: any = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      userId,
      userName,
      email,
      totalAmount,
      room,
      roomId,
      propertyName,
      propertyImage,
      totalNights,
    } = req.body;

    // Validate User and Property
    const user = await userModel.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const property = await listingModel
      .findById(propertyId)
      .select(
        "property_type apartment_availability hotel_room_types title location host images"
      )
      .session(session);

    if (!property) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Property not found." });
    }

    // Date Validations
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    checkInDate.setUTCHours(0, 0, 0, 0);
    checkOutDate.setUTCHours(0, 0, 0, 0);
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    if (checkInDate < currentDate && !isSameDay(checkInDate, currentDate)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past.",
      });
    }
    if (checkInDate >= checkOutDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date.",
      });
    }

    const bookingDates = getDatesInRange(checkInDate, checkOutDate);

    let bookingType: "apartment" | "hotel";
    let alreadyReservedDates: string[] = [];

    // Determine booking type and fetch reserved dates
    if (property.property_type === "apartment") {
      bookingType = "apartment";
      alreadyReservedDates =
        property.apartment_availability?.available_dates || [];
    } else if (property.property_type === "hotel") {
      bookingType = "hotel";
      if (!roomId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Room ID is required for hotel bookings.",
        });
      }
      const selectedRoom: any = property.hotel_room_types.find(
        (r: any) => r._id.toString() === roomId
      );
      if (!selectedRoom) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid room type." });
      }
      alreadyReservedDates = selectedRoom.availability || [];
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `This booking API is only for apartments and hotels. Property type: ${property.property_type}`,
      });
    }

    console.log("Existing Booked Dates (from DB):", alreadyReservedDates);

    // Conflict Check
    const conflictingDates: string[] = [];
    for (const date of bookingDates) {
      if (alreadyReservedDates.includes(date)) {
        conflictingDates.push(date);
      }
    }
    if (conflictingDates.length > 0) {
      await session.abortTransaction();
      session.endSession();
      const messageDates =
        conflictingDates.length > 3
          ? `${conflictingDates.slice(0, 3).join(", ")} and ${
              conflictingDates.length - 3
            } more dates`
          : conflictingDates.join(", ");
      return res.status(400).json({
        success: false,
        message: `The ${bookingType} is already booked for these dates: ${messageDates}. Please choose different dates.`,
      });
    }

    // --- All pre-checks passed, proceed with DB operations within transaction ---
    await user.save({ session });

    // Create new booking
    const newBooking = new Booking({
      user: userId,
      userName,
      host: property.host?.host_id,
      property: propertyId,
      propertyName: propertyName || property.title,
      propertyImage: propertyImage,
      propertyAddress: property.location?.address || "N/A",
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
      type: bookingType,
      room: room,
      bookingMeans: "Online",
      roomId: bookingType === "hotel" ? roomId : undefined,
      rewardPointsEarned: 1,
      email,
      paymentStatus: "completed",
      paymentMethod: "Flutterwave",
      bookingStatus: "pending", // Assuming online booking is confirmed upon payment success
      paymentRef: `ONLINE-BOOK-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`,
      totalNights: totalNights,
    });
    await newBooking.save({ session });

    // Update property's reserved dates
    if (bookingType === "apartment") {
      await listingModel.findByIdAndUpdate(
        propertyId,
        {
          $addToSet: {
            "apartment_availability.available_dates": { $each: bookingDates },
          },
        },
        { session }
      );
    } else if (bookingType === "hotel" && roomId) {
      await listingModel.findOneAndUpdate(
        { _id: propertyId, "hotel_room_types._id": roomId },
        {
          $addToSet: {
            "hotel_room_types.$.availability": { $each: bookingDates },
          },
        },
        { session }
      );
    }

    // Create Notifications (for user and host)
    await Notification.create(
      [
        {
          recipient: newBooking.user,
          type: "Booking Confirmation",
          content: `Your booking for '${
            newBooking.propertyName
          }' from ${toYYYYMMDD(newBooking.checkIn)} to ${toYYYYMMDD(
            newBooking.checkOut
          )} is successful.`,
          booking: newBooking._id,
          property: newBooking.property,
        },
      ],
      { session }
    );

    if (property.host?.host_id) {
      await Notification.create(
        [
          {
            recipient: property.host.host_id,
            type: "New Booking Received",
            content: `Your property '${
              property.title
            }' has a new booking from ${userName} for ${toYYYYMMDD(
              newBooking.checkIn
            )} to ${toYYYYMMDD(newBooking.checkOut)}.`,
            booking: newBooking._id,
            property: propertyId,
          },
        ],
        { session }
      );
    }

    // --- Transaction Commit ---
    await session.commitTransaction();
    session.endSession();
    console.log(
      "MongoDB transaction committed successfully for booking:",
      newBooking._id
    );

    // --- Post-Transaction Operations (Email, User Preferences, Security) ---
    // These should not cause a rollback of the booking if they fail.

    // Prepare email data (assuming it's safe to prepare outside the upcoming try/catch for email send)
    const emailData = {
      destination: property.location?.address || "N/A",
      city: property.location?.city || "N/A",
      propertyName: property.title,
      checkInDate: newBooking.checkIn,
      checkOutDate: newBooking.checkOut,
      bookingType: newBooking.type,
      numberOfGuests: newBooking.guests,
      roomType: newBooking.type,
      amount: newBooking.totalAmount,
      method: newBooking.paymentMethod,
      status: newBooking.paymentStatus,
      paymentRef: newBooking.paymentRef,
    };

    let postTransactionSuccess = true;
    let postTransactionMessages: string[] = [];

    // Send Email
    try {
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/bookingemail.ejs"),
        emailData
      );
      await sendEmail({
        email: newBooking.email,
        subject: "Booking Confirmation",
        template: "bookingemail.ejs",
        data: emailData, // Use emailData for consistency
      });
      console.log("Confirmation email sent successfully.");
    } catch (emailError: any) {
      postTransactionSuccess = false;
      postTransactionMessages.push("Failed to send confirmation email.");
      console.error(
        "Error sending confirmation email (post-transaction):",
        emailError
      );
      // Do NOT re-throw
    }

    // Final Response
    if (postTransactionSuccess) {
      res.status(201).json({
        success: true,
        booking: newBooking,
        message:
          "Your booking was successful and all post-booking actions completed.",
      });
    } else {
      // If some post-transaction steps failed, respond with 200 OK (booking is still successful)
      // but include a warning message.
      res.status(200).json({
        success: true, // Booking itself was successful
        booking: newBooking,
        message: `Your booking was successful, but with warnings: ${postTransactionMessages.join(
          " "
        )}.`,
        details: postTransactionMessages,
      });
    }
  } catch (error: any) {
    // This catch block handles errors that occur *during* the transaction (before commit)
    // or unexpected critical errors.
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.error("MongoDB transaction aborted due to error.");
    }
    session.endSession();

    console.error(
      "Critical Booking Process Error (pre-commit or unexpected):",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate booking detected. This booking might already exist.",
      });
    }

    // General error handling
    if (typeof next === "function" && error instanceof Error) {
      // If it's a known ErrorHandler, use it
      return next(new ErrorHandler(error.message, 500));
    } else {
      // Otherwise, send a generic 500
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred during the booking process.",
        details: error.message,
      });
    }
  } finally {
    // Ensure session is always ended, regardless of success or failure
    if (session.id && !session.ended) {
      session.endSession();
      console.log("MongoDB session ended in finally block.");
    }
  }
};

export const createOfflineBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session: any = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      userName,
      email,
      totalAmount,
      room,
      roomId,
      phoneNumber,
      propertyName,
      propertyImage,
      totalNights,
    } = req.body;

    console.log(req.body, "dkdk");

    // 1. Convert incoming checkInDate and checkOutDate strings to robust Date objects
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Crucial: Normalize these to UTC midnight for precise comparisons later
    checkInDate.setUTCHours(0, 0, 0, 0);
    checkOutDate.setUTCHours(0, 0, 0, 0);

    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0); // Normalize current date to UTC midnight

    // Validate date logic
    if (checkInDate < currentDate && !isSameDay(checkInDate, currentDate)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past.",
      });
    }

    if (checkInDate >= checkOutDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date.",
      });
    }

    // Generate the list of requested dates for booking, ensuring they are YYYY-MM-DD strings
    const bookingDates = getDatesInRange(checkInDate, checkOutDate);

    // Fetch the property with all necessary data
    const property = await listingModel
      .findById(propertyId)
      .select(
        "property_type apartment_availability hotel_room_types title location host images"
      )
      .session(session);

    if (!property) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Property not found." });
    }

    let bookingType: "apartment" | "hotel";
    let alreadyReservedDates: string[] = [];

    // Determine booking type and fetch already reserved dates
    if (property.property_type === "apartment") {
      bookingType = "apartment";
      alreadyReservedDates =
        property.apartment_availability?.available_dates || [];
    } else if (property.property_type === "hotel") {
      bookingType = "hotel";

      if (!roomId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Room ID is required for hotel bookings.",
        });
      }

      const selectedRoom: any = property.hotel_room_types.find(
        (room: any) => room._id.toString() === roomId
      );

      if (!selectedRoom) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: "Invalid room type." });
      }

      alreadyReservedDates = selectedRoom.availability || [];
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `This booking API is only for apartments and hotels. Property type: ${property.property_type}`,
      });
    }

    // Validate booking dates against already reserved dates (conflict check)
    const conflictingDates: string[] = [];
    for (const date of bookingDates) {
      if (alreadyReservedDates.includes(date)) {
        conflictingDates.push(date);
      }
    }

    if (conflictingDates.length > 0) {
      await session.abortTransaction();
      session.endSession();
      const messageDates =
        conflictingDates.length > 3
          ? `${conflictingDates.slice(0, 3).join(", ")} and ${
              conflictingDates.length - 3
            } more dates`
          : conflictingDates.join(", ");

      return res.status(400).json({
        success: false,
        message: `The ${bookingType} is already reserved for these dates: ${messageDates}. Please choose different dates.`,
      });
    }

    // All checks passed, proceed to create booking
    const newBooking = new Booking({
      userName,
      property: propertyId,
      propertyName: propertyName || property.title,
      propertyImage: propertyImage,
      propertyAddress: property.location?.address || "N/A",
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      host: property.host?.host_id,
      phoneNumber,
      room: room,
      email,
      bookingMeans: "Offline",
      totalAmount,
      paymentStatus: "completed",
      paymentMethod: "Flutterwave",
      bookingStatus: "pending",
      paymentRef: `OFFLINE-BOOK-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`,
      type: bookingType,
      roomId: bookingType === "hotel" ? roomId : undefined,
      totalNights: totalNights,
    });

    await newBooking.save({ session });

    // Update the property's reserved dates in the database
    if (bookingType === "apartment") {
      await listingModel.findByIdAndUpdate(
        propertyId,
        {
          $addToSet: {
            "apartment_availability.available_dates": { $each: bookingDates },
          },
        },
        { session }
      );
    } else if (bookingType === "hotel" && roomId) {
      await listingModel.findOneAndUpdate(
        { _id: propertyId, "hotel_room_types._id": roomId },
        {
          $addToSet: {
            "hotel_room_types.$.availability": { $each: bookingDates },
          },
        },
        { session }
      );
    }

    // Create Notification
    const normalizedCheckInString = toYYYYMMDD(checkInDate);
    const normalizedCheckOutString = toYYYYMMDD(checkOutDate);

    await Notification.create(
      [
        {
          recipient: property.host?.host_id,
          type: "New offline booking",
          content: `A new offline booking has been made for your property '${property.title}' from ${normalizedCheckInString} to ${normalizedCheckOutString}.`,
          booking: newBooking._id,
          property: propertyId,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Email sending happens after transaction commit
    const data = {
      destination: property.location?.address || "N/A",
      city: property.location?.city || "N/A",
      propertyName: property.title,
      checkInDate: newBooking.checkIn,
      checkOutDate: newBooking.checkOut,
      bookingType: newBooking.type,
      numberOfGuests: newBooking.guests,
      roomType: newBooking.type,
      amount: newBooking.totalAmount,
      method: newBooking.paymentMethod,
      status: newBooking.paymentStatus,
      paymentRef: newBooking.paymentRef,
    };

    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/bookingemail.ejs"),
      data
    );

    try {
      await sendEmail({
        email: email,
        subject: "Booking Confirmation",
        template: "bookingemail.ejs",
        data,
      });
      res.status(201).json({
        success: true,
        booking: newBooking,
        message:
          "Offline booking created successfully and confirmation email sent!",
      });
    } catch (emailError: any) {
      console.error(
        "Email sending error after successful booking:",
        emailError
      );
      res.status(200).json({
        success: true,
        booking: newBooking,
        message:
          "Offline booking created successfully, but failed to send confirmation email.",
        emailError: emailError.message,
      });
    }
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate booking detected. This booking might already exist.",
      });
    }

    if (typeof next === "function" && error instanceof Error) {
      return next(new ErrorHandler(error.message, 500));
    } else {
      return res.status(500).json({
        success: false,
        message: "An error occurred while processing your booking",
        details: error.message,
      });
    }
  } finally {
    if (session.id && session.inTransaction() === false && !session.ended) {
      session.endSession();
    }
  }
};
// Update Booking
export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session: mongoose.ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId } = req.params;
    const {
      bookingStatus,
      cancellationReason,
      whoCancelledRole,
      whoCancelled,
    } = req.body;

    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("Booking not found.", 404));
    }

    // --- CANCELLATION & STATUS UPDATE PRE-CONDITIONS ---
    const now = new Date();
    const checkOutDate = new Date(booking.checkOut);

    if (bookingStatus === "cancelled") {
      if (checkOutDate < now) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ErrorHandler(
            "Cannot cancel booking as the check-out date has already passed.",
            400
          )
        );
      }

      if (booking.bookingStatus === "completed") {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ErrorHandler(
            "Cannot cancel a booking that has already been completed.",
            400
          )
        );
      }

      if (booking.bookingStatus === "cancelled") {
        await session.abortTransaction();
        session.endSession();
        return next(new ErrorHandler("Booking is already cancelled.", 400));
      }
    }

    if (
      bookingStatus &&
      booking.bookingStatus !== "pending" &&
      bookingStatus !== "pending"
    ) {
      // Prevent changing status of an already completed/cancelled booking, except for a specific status change if needed.
      if (
        (booking.bookingStatus === "cancelled" &&
          bookingStatus !== "cancelled") ||
        (booking.bookingStatus === "completed" && bookingStatus !== "completed")
      ) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ErrorHandler(
            `Booking is already ${booking.bookingStatus}. Cannot change status.`,
            400
          )
        );
      }
    }

    let userNotificationContent: string | null = null;
    let userNotificationType: string | null = null;
    let property: any = null;
    const user = await userModel.findById(booking.user).session(session);
    const host = await userModel.findById(booking.host).session(session);

    // Fetch property details for all scenarios to ensure data is available for notifications/emails
    property = await listingModel
      .findById(booking.property)
      .select(
        "property_type apartment_availability hotel_room_types title location host images"
      )
      .session(session);

    if (!property) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorHandler("Associated property not found.", 404));
    }

    // --- HANDLE CANCELLATION ---
    if (bookingStatus === "cancelled") {
      const datesToFree = getDatesInRange(booking.checkIn, booking.checkOut);

      let updateQuery: mongoose.UpdateQuery<any>;
      let findQuery: mongoose.FilterQuery<any> | undefined;

      if (property.property_type === "apartment") {
        // Ensure apartment_availability is not null or undefined before attempting to use it
        if (!property.apartment_availability) {
          await session.abortTransaction();
          session.endSession();
          return next(
            new ErrorHandler("Apartment availability data not found.", 500)
          );
        }

        updateQuery = {
          $pullAll: { "apartment_availability.available_dates": datesToFree },
        };
        await listingModel.findByIdAndUpdate(property._id, updateQuery, {
          session,
        });
      } else if (property.property_type === "Hotel") {
        if (!booking.roomId) {
          await session.abortTransaction();
          session.endSession();
          return next(
            new ErrorHandler(
              "Room ID is missing from booking for hotel cancellation.",
              400
            )
          );
        }
        // Fix: Check if hotel_room_types exists and has a length before iterating
        const hotelRoomType = property.hotel_room_types.find(
          (room: any) => room._id.toString() === booking.roomId.toString()
        );

        if (!hotelRoomType) {
          await session.abortTransaction();
          session.endSession();
          return next(new ErrorHandler("Hotel room type not found.", 404));
        }

        // Fix the update query to use findOneAndUpdate with the correct subdocument path
        findQuery = {
          _id: property._id,
          "hotel_room_types._id": booking.roomId,
        };
        updateQuery = {
          $pullAll: { "hotel_room_types.$.availability": datesToFree },
        };
        await listingModel.findOneAndUpdate(findQuery, updateQuery, {
          session,
        });
      } else {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ErrorHandler(
            `Cannot process cancellation for unsupported property type: ${property.property_type}.`,
            400
          )
        );
      }

      // --- REFUND LOGIC ---
      let refundableAmount: number = 0;
      let refundReason: string = "No refund";
      const checkInDateTime = new Date(booking.checkIn);
      const nowDateTime = new Date();

      const daysUntilCheckIn = differenceInDays(checkInDateTime, nowDateTime);
      const hoursUntilCheckIn = differenceInHours(checkInDateTime, nowDateTime);

      if (nowDateTime > checkInDateTime) {
        refundableAmount = 0;
        refundReason = "Cancellation after check-in";
      } else if (hoursUntilCheckIn <= 24 && hoursUntilCheckIn >= 0) {
        refundableAmount = 0; // Or partial refund as per policy. Setting to 0 here.
        refundReason = "Cancellation within 24 hours before check-in";
      } else if (daysUntilCheckIn >= 2) {
        refundableAmount = booking.totalAmount;
        refundReason = "Cancellation before 2 days to check-in";
      } else {
        refundableAmount = 0;
        refundReason =
          "Cancellation between 24 hours and 2 days before check-in";
      }

      booking.refundableAmount = refundableAmount;

      if (refundableAmount > 0) {
        if (booking.bookingMeans === "Online" && user) {
          // If refund is for an online booking by a registered user
          await Refund.create(
            [
              {
                user: user._id,
                booking: booking._id,
                amount: refundableAmount,
                reason: refundReason,
                method: booking.paymentMethod,
                status: "completed", // or 'pending'
              },
            ],
            { session }
          );
        } else {
          // For offline bookings or missing user
          await OfflineRefund.create(
            [
              {
                email: booking.email,
                booking: booking._id,
                amount: refundableAmount,
                reason: refundReason,
                status: "pending", // Requires manual intervention
              },
            ],
            { session }
          );
        }
      }

      // Update the booking status and cancellation reason
      booking.bookingStatus = bookingStatus;
      booking.rewardPointsEarned = 0;
      booking.whoCancelled = whoCancelled;
      booking.whoCancelledRole = whoCancelledRole;
      booking.cancellationReason = cancellationReason || refundReason;
      (booking as any).cancelledAt = new Date();
      await booking.save({ session });

      userNotificationType = "Booking Cancellation";
      userNotificationContent =
        `Your booking for '${booking.propertyName}' from ${toYYYYMMDD(
          booking.checkIn
        )} to ${toYYYYMMDD(booking.checkOut)} has been cancelled. ` +
        `Refund amount: ₦${refundableAmount.toLocaleString()}. Reason: ${
          cancellationReason || refundReason
        }.`;

      // Notify the host about cancellation (always send)
      if (property.host?.host_id) {
        await Notification.create(
          [
            {
              recipient: property.host.host_id,
              type: "Booking Cancellation",
              content:
                `Booking ID ${booking._id} for your property '${
                  property.title
                }' from ${toYYYYMMDD(booking.checkIn)} to ${toYYYYMMDD(
                  booking.checkOut
                )} has been cancelled by ${whoCancelled} (${
                  whoCancelledRole || "N/A"
                }). ` +
                `Refund amount to customer: ₦${refundableAmount.toLocaleString()}.`,
              booking: booking._id,
              property: booking.property,
            },
          ],
          { session }
        );
      }
    } else if (bookingStatus === "completed") {
      // The inner 'if (booking.bookingStatus == "completed")' is redundant here
      // as the outer 'else if (bookingStatus === "completed")' already ensures this.
      const commissionRevenueHost = booking.totalAmount * 0.85; // 85% commsion for host
      // const commissionRevenueAdmin = booking.totalAmount * 0.135; // 13.5 (8.5% commission) + (5% commsion VAT)

      property.revenue = (property.revenue || 0) + booking.totalAmount;

      host.payouts_revenue =
        (host.payouts_revenue || 0) + commissionRevenueHost;
      await host.save({ session });

      await property.save({ session });
      await host.save({ session });

      booking.bookingStatus = bookingStatus;
      await booking.save({ session });

      // Find paying user (which is the host of the property)
    } else {
      // Handle other status changes (e.g., from pending to confirmed)
      booking.bookingStatus = bookingStatus;
      // Clear cancellation fields if status is no longer cancelled
      if (booking.cancellationReason && bookingStatus !== "cancelled") {
        booking.cancellationReason = undefined;
        booking.whoCancelled = undefined;
        booking.whoCancelledRole = undefined;
        (booking as any).cancelledAt = undefined;
      }
      await booking.save({ session });

      userNotificationType = "Booking Update";
      userNotificationContent = `Your booking status for '${booking.propertyName}' has been updated to ${bookingStatus}.`;
    }

    // --- Transaction Commit ---
    await session.commitTransaction();
    console.log(
      `Booking ${bookingId} status updated to ${booking.bookingStatus} and transaction committed.`
    );

    // --- Post-Transaction Operations (Notifications and Emails) ---
    // User Notification for ONLINE bookings
    if (
      booking.bookingMeans === "Online" &&
      userNotificationContent &&
      userNotificationType &&
      booking.user // Ensure booking has a user ID for notification
    ) {
      try {
        await Notification.create({
          recipient: booking.user,
          type: userNotificationType,
          content: userNotificationContent,
          booking: booking._id,
          property: booking.property,
        });
        console.log("User notification sent successfully for online booking.");
      } catch (notifError: any) {
        console.error(
          "Error sending user notification (post-transaction):",
          notifError
        );
      }
    } else if (booking.bookingMeans === "Offline") {
      console.log("Skipping user notification for offline booking.");
    }

    // Always send email to the user regardless of online/offline booking method
    if (userNotificationContent && booking.email) {
      try {
        const emailData = {
          userName: booking.userName,
          destination: booking.propertyAddress || "N/A",
          city: property?.location?.city || "N/A",
          propertyName: booking.propertyName,
          checkInDate: toYYYYMMDD(booking.checkIn),
          checkOutDate: toYYYYMMDD(booking.checkOut),
          bookingType: booking.type,
          propertyAddress: booking.propertyAddress,
          numberOfGuests: booking.guests,
          roomType: booking.room,
          amount: booking.totalAmount,
          paymentMethod: booking.paymentMethod,
          status: booking.bookingStatus,
          paymentRef: booking.paymentRef,
          cancellationReason: booking.cancellationReason,
          whoCancelled: booking.whoCancelled,
          whoCancelledRole: booking.whoCancelledRole,
          message: userNotificationContent,
          bookingDetailsLink: `https://rester.africa/booking-detail/${booking._id}`,
          contactUsLink: "https://rester.africam/help",
          privacyPolicyLink: "https://rester.africa/privacy-policy",
          refundableAmount: booking.refundableAmount,
          isRefunded: (booking.refundableAmount || 0) > 0,
          refundNote: booking.cancellationReason,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/bookingstatusupdateemail.ejs"),
          emailData
        );

        await sendEmail({
          email: booking.email,
          subject: `Booking Status Update: ${booking.bookingStatus}`,
          template: "bookingstatusupdateemail.ejs",
          data: emailData,
        });
        console.log("Confirmation email sent successfully to user.");
      } catch (emailError: any) {
        console.error("Error sending booking status update email:", emailError);
      }
    }

    let finalResponseMessage = `Booking status updated to ${booking.bookingStatus}.`;
    if (booking.bookingStatus === "cancelled") {
      finalResponseMessage += ` Refund amount processed: ₦${
        booking.refundableAmount?.toLocaleString() || 0
      }.`;
    }

    res.status(200).json({
      success: true,
      data: booking,
      message: finalResponseMessage,
    });
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.error(
        "MongoDB transaction aborted due to error in updateBooking."
      );
    }
    console.error("Error updating booking:", error);
    next(new ErrorHandler(error.message, 500));
  } finally {
    if (session.id && !session.hasEnded) {
      session.endSession();
    }
  }
};

// auto completed booking
const autoCompleteBookings = async () => {
  console.log(
    `[${format(
      new Date(),
      "yyyy-MM-dd HH:mm:ss"
    )}] Starting auto-complete booking job...`
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of today for comparison

    // Find bookings that are:
    // 1. Not already 'completed' or 'cancelled'
    // 2. Have a checkOut date strictly in the past (before today)
    const pastBookings = await Booking.find({
      bookingStatus: { $nin: ["completed", "cancelled"] },
      checkOut: { $lt: now },
    }).session(session);

    console.log(`Found ${pastBookings?.length} bookings to auto-complete.`);

    for (const booking of pastBookings) {
      try {
        // Fetch the user for notification/email purposes
        const user = await userModel.findById(booking.user).session(session);

        // Fetch the property listing to update its revenue and availability
        const listing = await listingModel
          .findById(booking.property)
          .session(session);

        if (!listing) {
          console.warn(
            `Listing ${booking.property} not found for booking ${booking._id}. Skipping revenue/availability update.`
          );
          // Continue processing the booking itself (mark as completed), but log the warning.
          // Or, if property being missing means the booking is invalid, you could skip the whole booking.
          // For now, we'll proceed with marking booking completed but skip property updates.
        } else {
          // Update property revenue
          listing.revenue = (listing.revenue || 0) + booking.totalAmount;

          // --- NEW LOGIC: Remove booked dates from property availability ---
          const datesToRemove = getDatesInRange(
            booking.checkIn,
            booking.checkOut
          );
          console.log(
            `Booking ${
              booking._id
            } completed. Dates to remove from availability: ${datesToRemove
              .map((d) => format(new Date(d), "yyyy-MM-dd"))
              .join(", ")}`
          );

          let updateAvailabilityQuery: mongoose.UpdateQuery<any>;
          let findAvailabilityQuery: mongoose.FilterQuery<any> | undefined;

          if (listing.property_type === "apartment") {
            // For apartment/event center, remove dates from apartment_availability.available_dates
            updateAvailabilityQuery = {
              $pullAll: {
                "apartment_availability.available_dates": datesToRemove,
              },
            };
          } else if (listing.property_type === "hotel") {
            // For hotel, remove dates from hotel_room_types.$.availability for the specific room booked
            if (!booking.roomId) {
              console.warn(
                `Booking ${booking._id} is for a Hotel, but missing roomId. Cannot remove dates from specific room availability.`
              );
              // In this case, you might choose to skip updating availability or log a critical error.
              // For robustness, we'll just log and continue.
            } else {
              findAvailabilityQuery = {
                _id: listing._id,
                "hotel_room_types._id": booking.roomId,
              };
              updateAvailabilityQuery = {
                $pullAll: { "hotel_room_types.$.availability": datesToRemove },
              };
            }
          } else {
            console.warn(
              `Unsupported property type (${listing.property_type}) for booking ${booking._id}. Cannot update availability.`
            );
          }

          // Execute the availability update
          if (updateAvailabilityQuery) {
            if (findAvailabilityQuery) {
              await listingModel.findOneAndUpdate(
                findAvailabilityQuery,
                updateAvailabilityQuery,
                { session }
              );
            } else {
              // This path is for Apartment/Event center or if findAvailabilityQuery was not set for hotel (e.g., missing roomId)
              await listingModel.findByIdAndUpdate(
                listing._id,
                updateAvailabilityQuery,
                { session }
              );
            }
            console.log(
              `Availability updated for listing ${listing._id} for booking ${booking._id}`
            );
          }

          await listing.save({ session }); // Save revenue update and other listing changes
          console.log(
            `Revenue updated for listing ${listing._id} for booking ${booking._id}`
          );
        }

        // Update booking status to 'completed'
        booking.bookingStatus = "completed";
        await booking.save({ session });

        const notificationContent = `Your booking for '${
          booking.propertyName
        }' from ${format(new Date(booking.checkIn), "MMM d, yyyy")} to ${format(
          new Date(booking.checkOut),
          "MMM d, yyyy"
        )} has been automatically marked as completed.`;

        // Only send in-app notification if a user object exists and booking is online
        if (user && booking.bookingMeans === "Online") {
          await Notification.create(
            [
              {
                recipient: booking.user,
                type: "Booking Completed",
                content: notificationContent,
                booking: booking._id,
                property: booking.property,
              },
            ],
            { session }
          );
          console.log(
            `In-app notification created for user ${user._id} for booking ${booking._id}.`
          );
        } else if (!user) {
          console.warn(
            `User for booking ${booking._id} not found. Skipping in-app notification.`
          );
        } else {
          // bookingMeans === "Offline"
          console.log(
            `Skipping in-app notification for offline booking ${booking._id}.`
          );
        }

        // Prepare email data
        if (booking.email) {
          const emailData = {
            userName: booking.userName || "Valued Customer",
            propertyName: booking.propertyName,
            checkInDate: format(new Date(booking.checkIn), "MMM d, yyyy"),
            checkOutDate: format(new Date(booking.checkOut), "MMM d, yyyy"),
            propertyAddress: booking.propertyAddress || "N/A",
            bookingId: booking._id,
            totalAmount: booking.totalAmount,
            message: `Your booking for ${booking.propertyName} has been successfully completed. We hope you enjoyed your stay!`,
            bookingDetailsLink: `https://restr.africa/booking-detail/${booking._id}`,
            contactUsLink: "https://restr.africa/help",
            privacyPolicyLink: "https://restr.africa/privacy-policy",
          };

          const html = await ejs.renderFile(
            path.join(__dirname, "../mails/bookingcompletedemail.ejs"),
            emailData
          );

          await sendEmail({
            email: booking.email,
            subject: `Your restr Booking for ${booking.propertyName} is Completed!`,
            template: "bookingcompletedemail.ejs",
            data: emailData,
          });
          console.log(
            `Completion email sent to ${booking.email} for booking ${booking._id}.`
          );
        } else {
          console.warn(
            `Email address not found for booking ${booking._id}. Skipping completion email.`
          );
        }

        console.log(`Booking ${booking._id} auto-completed.`);
      } catch (innerError) {
        console.error(
          `Error processing single booking ${booking._id}:`,
          innerError.message
        );
        // Continue to the next booking. The transaction will attempt to commit for successfully processed ones.
      }
    }

    await session.commitTransaction();
    console.log(
      "Auto-complete booking job completed and transaction committed."
    );
  } catch (error) {
    await session.abortTransaction();
    console.error(
      "Error during auto-complete booking job transaction:",
      error.message
    );
  } finally {
    session.endSession();
    console.log("Session ended for auto-complete booking job.");
  }
};

// Schedule the cron job to run daily at, for example, 3:00 AM (server time)
cron.schedule("0 3 * * *", autoCompleteBookings, {
  scheduled: true,
  timezone: "Africa/Lagos",
});

console.log("Auto-complete booking cron job scheduled.");

export const getAllBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await Booking.find()
      .populate("user host property")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get Revenue Analysis
export const getRevenueAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const completedBookings = await Booking.find({
      bookingStatus: "completed",
      paymentStatus: "completed",
    });

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    const bookingCount = completedBookings.length;
    const averageRevenue = bookingCount > 0 ? totalRevenue / bookingCount : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        bookingCount,
        averageRevenue,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Find the booking by ID
    const booking = await Booking.findById(id);

    // Check if the booking exists
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (
      booking.bookingStatus === "confirmed" ||
      booking.bookingStatus === "pending" ||
      booking.bookingStatus === "completed"
    ) {
      return res.status(403).json({
        message: `Cannot delete a booking with status '${booking.bookingStatus}'.`,
      });
    }

    // 3. If the booking can be deleted, proceed with deletion
    await Booking.findByIdAndDelete(id);

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error); // Log the error for debugging
    res.status(500).json({
      message: "An internal server error occurred while deleting the booking.",
    });
  }
};

export const getRevenueStats = async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const stats = await Booking.aggregate([
      {
        $match: {
          bookingStatus: "completed",
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id",
          totalRevenue: 1,
          count: 1,
          _id: 0,
        },
      },
      { $sort: { month: 1 } },
    ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedStats = monthNames.map((month, index) => {
      const monthStat = stats.find((stat) => stat.month === index + 1);
      return {
        month,
        totalRevenue: monthStat ? monthStat.totalRevenue : 0,
        count: monthStat ? monthStat.count : 0,
      };
    });

    const totalRevenue = formattedStats.reduce(
      (sum, stat) => sum + stat.totalRevenue,
      0
    );

    res.json({ monthlyStats: formattedStats, totalRevenue });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching revenue statistics", error });
  }
};

export const getBookingStatusStats = async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const stats = await Booking.aggregate([
      {
        $match: {
          bookingStatus: {
            $in: ["pending", "confirmed", "cancelled", "completed"],
          },
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            status: "$bookingStatus",
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
              totalAmount: "$totalAmount",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedStats = monthNames.map((month, index) => {
      const monthStat = stats.find((stat) => stat._id === index + 1);
      const statusStats = monthStat ? monthStat.statuses : [];
      return {
        month,
        pending: statusStats.find((s: any) => s.status === "pending") || {
          count: 0,
          totalAmount: 0,
        },
        confirmed: statusStats.find((s: any) => s.status === "confirmed") || {
          count: 0,
          totalAmount: 0,
        },
        cancelled: statusStats.find((s: any) => s.status === "cancelled") || {
          count: 0,
          totalAmount: 0,
        },
        completed: statusStats.find((s: any) => s.status === "completed") || {
          count: 0,
          totalAmount: 0,
        },
      };
    });

    res.json(formattedStats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching booking statistics", error });
  }
};

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings", error });
  }
};

// Get bookings by guest bookings ID

export const getMyBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Ensure the authenticated user is requesting their own bookings
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only access your own bookings" });
    }

    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by most recent first
      .populate("property", "title address facility_images location") // Populate property details
      .populate("host", "name email"); // Populate host details

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to get the first day of the previous month
function getFirstDayOfPreviousMonth(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(1);
  return date;
}

// Helper function to get the last day of the previous month
function getLastDayOfPreviousMonth(): Date {
  const date = new Date();
  date.setDate(0);
  return date;
}

// Helper function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): number {
  return previous !== 0 ? ((current - previous) / previous) * 100 : 100;
}

// API endpoint to get booking statistics for a host
export const getMyHostBookingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const hostId = req.params.hostId;

    const bookings = await Booking.find({ host: hostId });

    const currentDate = new Date();
    const firstDayOfCurrentMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const firstDayOfPreviousMonth = getFirstDayOfPreviousMonth();
    const lastDayOfPreviousMonth = getLastDayOfPreviousMonth();

    const currentMonthBookings = bookings.filter(
      (booking) => booking.checkIn >= firstDayOfCurrentMonth
    );
    const previousMonthBookings = bookings.filter(
      (booking) =>
        booking.checkIn >= firstDayOfPreviousMonth &&
        booking.checkIn <= lastDayOfPreviousMonth
    );

    // Revenue calculations
    const totalRevenue = currentMonthBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    const previousMonthRevenue = previousMonthBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    const revenuePercentageIncrease = calculatePercentageChange(
      totalRevenue,
      previousMonthRevenue
    );

    // Average nights calculations
    const calculateAverageNights = (bookings: typeof currentMonthBookings) => {
      const totalNights = bookings.reduce((sum, booking) => {
        const nights =
          (booking.checkOut.getTime() - booking.checkIn.getTime()) /
          (1000 * 3600 * 24);
        return sum + nights;
      }, 0);
      return bookings.length > 0 ? totalNights / bookings.length : 0;
    };

    const currentAverageNights = calculateAverageNights(currentMonthBookings);
    const previousAverageNights = calculateAverageNights(previousMonthBookings);
    const averageNightsPercentageIncrease = calculatePercentageChange(
      currentAverageNights,
      previousAverageNights
    );

    // Total bookings calculations
    const totalBookings = currentMonthBookings.length;
    const previousTotalBookings = previousMonthBookings.length;
    const totalBookingsPercentageIncrease = calculatePercentageChange(
      totalBookings,
      previousTotalBookings
    );

    // Completed bookings and nights
    const completedBookings = currentMonthBookings.filter(
      (b) => b.bookingStatus === "completed"
    );
    const completedNights = completedBookings.reduce((sum, booking) => {
      const nights =
        (booking.checkOut.getTime() - booking.checkIn.getTime()) /
        (1000 * 3600 * 24);
      return sum + nights;
    }, 0);

    const stats = {
      totalRevenue,
      revenueIncrease: {
        percentage: revenuePercentageIncrease.toFixed(2),
        text: `${revenuePercentageIncrease >= 0 ? "+" : "-"}${Math.abs(
          revenuePercentageIncrease
        ).toFixed(0)}% from last month`,
      },
      averageNights: currentAverageNights.toFixed(1),
      averageNightsIncrease: {
        percentage: averageNightsPercentageIncrease.toFixed(2),
        text: `${averageNightsPercentageIncrease >= 0 ? "+" : "-"}${Math.abs(
          averageNightsPercentageIncrease
        ).toFixed(0)}% from last month`,
      },
      completedNights,
      totalBookings,
      totalBookingsIncrease: {
        percentage: totalBookingsPercentageIncrease.toFixed(2),
        text: `${totalBookingsPercentageIncrease >= 0 ? "+" : "-"}${Math.abs(
          totalBookingsPercentageIncrease
        ).toFixed(0)}% from last month`,
      },
      other: {
        upcomingBookings: currentMonthBookings.filter(
          (b) => b.bookingStatus === "pending"
        ).length,
        ongoingBookings: currentMonthBookings.filter(
          (b) => b.bookingStatus === "confirmed"
        ).length,
        completedBookings: completedBookings.length,
      },
      bookings,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getMyHostBookingById:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching host statistics" });
  }
};

// booking detail api
export const getBookingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error("Error in getBookingById:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cancel a booking
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure the authenticated user is the owner of the booking
    if (req.user.id !== booking.user) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only cancel your own bookings" });
    }

    booking.bookingStatus = "cancelled";
    booking.cancellationReason = req.body.reason || "No reason provided";
    await booking.save();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// confirm booking

export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure the authenticated user is the owner of the booking
    if (req.user.id !== booking.user) {
      return res.status(403).json({
        message: "Forbidden: You can only confirmed your own bookings",
      });
    }

    booking.bookingStatus = "confirmed";
    booking.cancellationReason = req.body.reason || "No reason provided";
    await booking.save();

    res.json({ message: "Booking confirmed successfully", booking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to handle different date ranges
// This is an essential function that was missing from your code.
const getDateRange = (range: string) => {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "last7days":
      start.setDate(end.getDate() - 7);
      break;
    case "last30days":
      start.setDate(end.getDate() - 30);
      break;
    case "last3months":
      start.setMonth(end.getMonth() - 3);
      break;
    case "last6months":
      start.setMonth(end.getMonth() - 6);
      break;
    case "last12months":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default: // 'last30days' as default
      start.setDate(end.getDate() - 30);
      break;
  }

  return { start, end };
};

export const hostDashboardSummary = async (req: Request, res: Response) => {
  try {
    const hostId = req.query.hostId as string;

    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ message: "Invalid hostId provided." });
    }

    const { start, end } = getDateRange(req.query.range as string);

    // Calculate the previous period based on the current period's duration
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - durationMs);

    // Fetch properties owned by the host
    const properties = await listingModel.find({ "host.host_id": hostId });

    console.log(properties, "djd");
    const totalRooms = properties.reduce(
      (sum, property) => sum + property.hotel_room_types.length,
      0
    );
    const averageRating =
      properties.length > 0
        ? properties.reduce(
            (sum, property) => sum + (property.average_rating || 0),
            0
          ) / properties.length
        : 0;

    // Fetch bookings for both current and previous periods in parallel
    const [currentBookings, prevBookings] = await Promise.all([
      Booking.find({
        host: hostId,
        bookingStatus: "completed",
        checkIn: { $gte: start, $lte: end },
      }),
      Booking.find({
        host: hostId,
        bookingStatus: "completed",
        checkIn: { $gte: prevStart, $lte: prevEnd },
      }),
    ]);

    // Helper function to process booking data for a given period
    const processBookings = (
      bookings: any[],
      periodStart: Date,
      periodEnd: Date
    ) => {
      const totalRevenue = bookings.reduce(
        (sum, booking) => sum + (booking.totalAmount || 0),
        0
      );
      const totalBookings = bookings.length;
      const totalDays =
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 3600 * 24);

      const occupiedRoomNights = bookings.reduce((sum, booking) => {
        const checkInTime = booking.checkIn.getTime();
        const checkOutTime = booking.checkOut.getTime();
        const nights = (checkOutTime - checkInTime) / (1000 * 3600 * 24);
        // Assuming one booking means one room for simplicity.
        // If a booking can have multiple rooms, adjust here: sum + (nights * booking.numRooms)
        return sum + (nights > 0 ? nights : 0);
      }, 0);

      const averageDailyRate =
        occupiedRoomNights > 0 ? totalRevenue / occupiedRoomNights : 0;

      const occupancyRate =
        totalRooms > 0 && totalDays > 0
          ? (occupiedRoomNights / (totalRooms * totalDays)) * 100
          : 0;

      const dailyRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;
      const dailyBookings = totalDays > 0 ? totalBookings / totalDays : 0;

      return {
        totalRevenue,
        totalBookings,
        averageDailyRate,
        occupancyRate,
        dailyRevenue,
        dailyBookings,
      };
    };

    const currentData = processBookings(currentBookings, start, end);
    const previousData = processBookings(prevBookings, prevStart, prevEnd);

    // Helper function to calculate percentage increase, handling division by zero
    const calculatePercentageIncrease = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0; // If previous is 0 and current is > 0, it's a 100% increase
      }
      return ((current - previous) / previous) * 100;
    };

    const formatChange = (percentageChange: number) => {
      return `${percentageChange.toFixed(1)}% from last period`;
    };

    res.json({
      totalRevenue: currentData.totalRevenue,
      averageDailyRate: currentData.averageDailyRate,
      totalBookings: currentData.totalBookings,
      occupancyRate: currentData.occupancyRate,
      averageRating: averageRating,
      revenueChange: formatChange(
        calculatePercentageIncrease(
          currentData.dailyRevenue,
          previousData.dailyRevenue
        )
      ),
      averageDailyRateChange: formatChange(
        calculatePercentageIncrease(
          currentData.averageDailyRate,
          previousData.averageDailyRate
        )
      ),
      totalBookingsChange: formatChange(
        calculatePercentageIncrease(
          currentData.dailyBookings,
          previousData.dailyBookings
        )
      ),
      occupancyRateChange: formatChange(
        calculatePercentageIncrease(
          currentData.occupancyRate,
          previousData.occupancyRate
        )
      ),
    });
  } catch (error) {
    console.error("Error fetching host dashboard summary:", error);
    res
      .status(500)
      .json({ message: "Error fetching dashboard summary", error });
  }
};

// Get monthly revenue, occupancy, and bookings
export const hostMonthlyStats = async (req: Request, res: Response) => {
  try {
    const hostId = req.query.hostId as string;
    const { start, end } = getDateRange(req.query.range as string);

    const bookings = await Booking.find({
      host: hostId,
      checkIn: { $gte: start, $lte: end },
      bookingStatus: "completed",
    });

    const monthlyStats: {
      [key: string]: {
        revenue: number;
        bookings: number;
        occupiedNights: number;
      };
    } = {};
    bookings.forEach((booking) => {
      const month = booking.checkIn.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { revenue: 0, bookings: 0, occupiedNights: 0 };
      }
      monthlyStats[month].revenue += booking.totalAmount;
      monthlyStats[month].bookings += 1;
      const nights =
        (booking.checkOut.getTime() - booking.checkIn.getTime()) /
        (1000 * 3600 * 24);
      monthlyStats[month].occupiedNights += nights;
    });

    const properties = await listingModel.find({ "host.host_id": hostId });
    const totalRooms = properties.reduce(
      (sum: any, property: any) => sum + property.hotel_room_types.length,
      0
    );

    const result = Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      bookings: stats.bookings,
      occupancyRate: (stats.occupiedNights / (totalRooms * 30)) * 100, // Assuming 30 days per month
    }));

    res.json(
      result.sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
      )
    );
  } catch (error) {
    res.status(500).json({ message: "Error fetching monthly stats", error });
  }
};

// Get property performance
export const hostPropertyPerformance = async (req: Request, res: Response) => {
  try {
    const hostId = req.query.hostId as string;
    const { start, end } = getDateRange(req.query.range as string);

    const properties = await listingModel.find({ "host.host_id": hostId });
    const bookings = await Booking.find({
      host: hostId,
      checkIn: { $gte: start, $lte: end },
      bookingStatus: "completed",
    });

    const performance = properties.map((property) => {
      const propertyBookings = bookings.filter(
        (booking) => booking.property.toString() === property._id.toString()
      );
      const revenue = propertyBookings.reduce(
        (sum, booking) => sum + booking.totalAmount,
        0
      );
      const occupiedNights = propertyBookings.reduce((sum, booking) => {
        const nights =
          (booking.checkOut.getTime() - booking.checkIn.getTime()) /
          (1000 * 3600 * 24);
        return sum + nights;
      }, 0);
      const totalNights =
        property.hotel_room_types.length *
        ((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      const occupancyRate = (occupiedNights / totalNights) * 100;

      return {
        name: property.title,
        revenue,
        occupancyRate,
      };
    });

    res.json(performance);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching property performance", error });
  }
};

// Get booking sources
export const hostBookingSources = async (req: Request, res: Response) => {
  try {
    const hostId = req.query.hostId as string;
    const { start, end } = getDateRange(req.query.range as string);

    const bookings = await Booking.find({
      host: hostId,
      checkIn: { $gte: start, $lte: end },
      bookingStatus: "completed",
    });

    const sources: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      const source = booking.type; // Assuming 'type' field represents the booking source
      if (!sources[source]) {
        sources[source] = 0;
      }
      sources[source]++;
    });

    const result = Object.entries(sources).map(([name, value]) => ({
      name,
      value,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching booking sources", error });
  }
};

export const downloadReportHost = async (req: Request, res: Response) => {
  try {
    const hostId = req.query.hostId as string;
    const { start, end } = getDateRange(req.query.range as string);

    // Fetch all necessary data
    const bookings = await Booking.find({
      host: hostId,
      checkIn: { $gte: start, $lte: end },
      bookingStatus: "completed",
    });

    const properties = await listingModel.find({ "host.host_id": hostId });

    // Calculate summary data
    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    const totalBookings = bookings.length;
    const occupiedRoomNights = bookings.reduce((sum, booking) => {
      const nights =
        (booking.checkOut.getTime() - booking.checkIn.getTime()) /
        (1000 * 3600 * 24);
      return sum + nights;
    }, 0);
    const totalRooms = properties.reduce(
      (sum, property) => sum + property.hotel_room_types.length,
      0
    );
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const occupancyRate = (occupiedRoomNights / (totalRooms * totalDays)) * 100;
    const averageDailyRate = totalRevenue / occupiedRoomNights;

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=host_report_${req.query.range}.pdf`
    );

    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(18).text("Host Dashboard Report", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Report Period: ${start.toDateString()} - ${end.toDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text("Summary");
    doc.fontSize(10).text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    doc.text(`Total Bookings: ${totalBookings}`);
    doc.text(`Occupancy Rate: ${occupancyRate.toFixed(2)}%`);
    doc.text(`Average Daily Rate: $${averageDailyRate.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text("Property Performance");
    properties.forEach((property) => {
      const propertyBookings = bookings.filter(
        (booking) => booking.property.toString() === property._id.toString()
      );
      const propertyRevenue = propertyBookings.reduce(
        (sum, booking) => sum + booking.totalAmount,
        0
      );
      const propertyOccupiedNights = propertyBookings.reduce((sum, booking) => {
        const nights =
          (booking.checkOut.getTime() - booking.checkIn.getTime()) /
          (1000 * 3600 * 24);
        return sum + nights;
      }, 0);
      const propertyOccupancyRate =
        (propertyOccupiedNights /
          (property.hotel_room_types.length * totalDays)) *
        100;

      doc.fontSize(12).text(property.title);
      doc.fontSize(10).text(`Revenue: $${propertyRevenue.toFixed(2)}`);
      doc.text(`Occupancy Rate: ${propertyOccupancyRate.toFixed(2)}%`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error("Error generating report:", error);
    res
      .status(500)
      .json({ message: "Error generating report", error: error.message });
  }
};

// host financials analysis

export const getHostRevenueStats = async (req: Request, res: Response) => {
  try {
    const hostId = req.params.hostId;
    const currentYear = new Date().getFullYear();
    const stats = await Booking.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(hostId),
          bookingStatus: "completed",
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id",
          totalRevenue: 1,
          count: 1,
          _id: 0,
        },
      },
      { $sort: { month: 1 } },
    ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedStats = monthNames.map((month, index) => {
      const monthStat = stats.find((stat) => stat.month === index + 1);
      return {
        month,
        totalRevenue: monthStat ? monthStat.totalRevenue : 0,
        count: monthStat ? monthStat.count : 0,
      };
    });

    const totalRevenue = formattedStats.reduce(
      (sum, stat) => sum + stat.totalRevenue,
      0
    );

    res.json({ monthlyStats: formattedStats, totalRevenue });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching revenue statistics", error });
  }
};

export const getHostBookingStatusStats = async (
  req: Request,
  res: Response
) => {
  try {
    const hostId = req.params.hostId;
    const currentYear = new Date().getFullYear();
    const stats = await Booking.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(hostId),
          bookingStatus: {
            $in: ["pending", "confirmed", "cancelled", "completed"],
          },
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            status: "$bookingStatus",
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
              totalAmount: "$totalAmount",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formattedStats = monthNames.map((month, index) => {
      const monthStat = stats.find((stat) => stat._id === index + 1);
      const statusStats = monthStat ? monthStat.statuses : [];
      return {
        month,
        pending: statusStats.find((s: any) => s.status === "pending") || {
          count: 0,
          totalAmount: 0,
        },
        confirmed: statusStats.find((s: any) => s.status === "confirmed") || {
          count: 0,
          totalAmount: 0,
        },
        cancelled: statusStats.find((s: any) => s.status === "cancelled") || {
          count: 0,
          totalAmount: 0,
        },
        completed: statusStats.find((s: any) => s.status === "completed") || {
          count: 0,
          totalAmount: 0,
        },
      };
    });

    res.json(formattedStats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching booking statistics", error });
  }
};

// customer report stats

export const getCustomerReportStats = async (req: Request, res: Response) => {
  try {
    const totalOrders = await Booking.countDocuments();
    const confirmedOrders = await Booking.countDocuments({
      bookingStatus: "confirmed",
    });
    const completedOrders = await Booking.countDocuments({
      bookingStatus: "completed",
    });
    const pendingOrders = await Booking.countDocuments({
      bookingStatus: "pending",
    });
    const cancelledOrders = await Booking.countDocuments({
      bookingStatus: "cancelled",
    });

    const report = {
      total: totalOrders,
      confirmed: confirmedOrders,
      completed: completedOrders,
      pending: pendingOrders,
      cancelled: cancelledOrders,
    };

    res.json(report);
  } catch (error) {
    console.error("Error generating order report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
