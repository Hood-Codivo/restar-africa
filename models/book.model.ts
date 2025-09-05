import mongoose, { Document, Schema, model, Types } from "mongoose";

// Interface for User Booking
interface IBooking extends Document {
  user: string;
  phoneNumber: string;
  userName: string;
  host: Types.ObjectId;
  property: Types.ObjectId;
  propertyName: string;
  propertyAddress: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: number;
  type: string;
  room: string;
  roomId: string;
  email: string;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    isSecureLocation: boolean;
  };
  refundableAmount: number;
  bookingMeans: "Offline" | "Online";
  paymentStatus: "pending" | "completed" | "failed";
  paymentMethod: "Flutterwave" | "Opay" | "Paystack";
  bookingStatus: "pending" | "confirmed" | "cancelled" | "completed";
  cancellationReason?: string;
  paymentRef: string;
  whoCancelledRole: string;
  rewardPointsEarned: number;
  rewardPointsUsed: number;
  rewardPointsToUse: number; //use this parameter in the checkout process
  whoCancelled: string;
  date: Date;
  // staying: Date[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for User Booking
const BookingSchema: Schema<IBooking> = new Schema(
  {
    user: {
      type: String,
    },
    rewardPointsEarned: { type: Number, default: 0 },
    rewardPointsUsed: { type: Number, default: 0 },
    rewardPointsToUse: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    userName: { type: String },
    roomId: { type: String },
    bookingMeans: { 
      type: String,
      enum: ["Offline", "Online"],
      default: "Online",
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "restr-users",
    },
    refundableAmount: {
      type: Number,
      default: 0,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "restr-listing",
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    whoCancelled: {
      type: String,
    },

    whoCancelledRole: {
      type: String,
    },
    propertyName: {
      type: String,
    },
    propertyAddress: {
      type: String,
    },

    // staying: [{ type: Date }],
    checkInLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      timestamp: { type: Date },
      isSecureLocation: { type: Boolean },
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },

    guests: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    room: {
      type: String,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentRef: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Flutterwave", "Opay", "Paystack"],
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = model<IBooking>("restr-booking", BookingSchema);
export default Booking;
