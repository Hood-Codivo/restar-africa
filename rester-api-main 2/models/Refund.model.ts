// models/refundModel.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for the Refund document
export interface IRefund extends Document {
  user: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  reason: string;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  refundedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const refundSchema: Schema<IRefund> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'restr-users',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'restr-booking',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
        type: String,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    refundedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Refund: Model<IRefund> = mongoose.model<IRefund>('restr-Refund', refundSchema);
export default Refund;
