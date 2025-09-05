import mongoose, { Document, Model, Schema } from "mongoose";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IPayouts {
  amount: number;
  date: Date;
  description: string;
  currency: string;
  status: "Cancelled" | "Rejected" | "Approved" | "Pending";
}

interface IBank {
  account_number: number;
  description: string;
  bank: string;
  currency: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "seller" | "supper-admin"; // Changed 'host' to 'affiliate' if that's the intention, otherwise keep 'host'
  phoneNumber?: string;
  avatar: {
    public_id: string;
    url: string;
  };
  bio?: string;
  business_name: string;
  gender: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  notification: boolean;
  chatRoomId: string;
  payouts: IPayouts[];
  banks: IBank[];
  isSuspend: false;
  reason: string;
  language: string;
  occupation: string;
  country: string;
  otp: string;
  otpExpiry: Date;
  // kyc
  hostidcard: { public_id: string; url: string };
  certificate: { public_id: string; url: string };
  type: string;
  id_number: string;
  reg_number: number;
  referral_code?: string;

  // preference
  propertyType: string;
  propertyDestinationCountry: string;
  propertyDestinationCity: string;
  propertyRating: number;
  nightlyRate: number;

  hostDetails?: {
    host: Array<Schema.Types.ObjectId>;
    totalListings: number;
    reviews: Array<{
      rating: number;
      comment: string;
      guest: Schema.Types.ObjectId;
    }>;
  };
  guestDetails?: {
    pastBookings: Array<Schema.Types.ObjectId>;
    wishlist: Array<Schema.Types.ObjectId>;
  };

  payouts_revenue: number;
  comparePassword: (password: string) => Promise<boolean>;
  getJwtToken: () => string;
}

const PayoutSchema: Schema = new Schema({
  amount: { type: Number },
  status: {
    type: String,
    enum: ["Cancelled", "Rejected", "Approved", "Pending"],
    default: "Pending",
    required: true,
  },
  date: { type: Date, default: Date.now },
  description: { type: String },
  currency: { type: String },
});

const BankSchema: Schema = new Schema({
  account_number: { type: Number },
  bank: { type: String },
  description: { type: String },
  currency: { type: String },
});

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      validate: {
        validator: function (value: string) {
          return emailRegexPattern.test(value);
        },
        message: "Please enter a valid email",
      },
      unique: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    payouts_revenue: { type: Number, default: 0 },

    // end
    gender: { type: String },
    role: {
      type: String,
      enum: ["user", "admin", "seller", "supper-admin"],
      default: "user",
      required: true,
    }, // Ensure 'client' and 'affiliate' are in enum
    phoneNumber: { type: String },
    bio: { type: String },
    location: { type: String },
    isSuspend: { type: Boolean },
    propertyType: { type: String },
    propertyDestinationCountry: { type: String },
    propertyDestinationCity: { type: String },
    propertyRating: { type: Number },
    nightlyRate: { type: Number },
    reason: { type: String },
    language: { type: String },
    business_name: { type: String },
    occupation: { type: String },
    country: { type: String },
    notification: { type: Boolean },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    chatRoomId: {
      type: String,
      default: null,
    },
    hostDetails: {
      host: [{ type: Schema.Types.ObjectId, ref: "restr-listing" }],
      totalListings: { type: Number, default: 0 },
      reviews: [
        {
          rating: { type: Number, required: true },
          comment: { type: String },
          guest: { type: Schema.Types.ObjectId, ref: "restr-users" },
        },
      ],
    },
    guestDetails: {
      pastBookings: [{ type: Schema.Types.ObjectId, ref: "restr-booking" }],
      wishlist: [{ type: Schema.Types.ObjectId, ref: "restr-listing" }],
    },
    hostidcard: {
      public_id: { type: String },
      url: { type: String },
    },

    type: { type: String },
    certificate: {
      public_id: { type: String },
      url: { type: String },
    },

    id_number: { type: String },
    reg_number: { type: Number },
    referral_code: { type: String },
    payouts: [PayoutSchema],
    banks: [BankSchema],
  },
  { timestamps: true }
);

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
};

userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model("restr-users", userSchema);
export default userModel;
