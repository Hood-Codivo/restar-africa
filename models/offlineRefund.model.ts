// models/refundModel.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for the Refund document
export interface IRefundOffline extends Document {
  email: string;
  booking: mongoose.Types.ObjectId;
  amount: number;
  method: string;
  currency: string;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  refundedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const refundSchema: Schema<IRefundOffline> = new Schema(
  {
    email: {
        type: String,
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
    currency: {
      type: String,
      default: 'NGN',
    },
    method: {
        type: String,
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

const OfflineRefund: Model<IRefundOffline> = mongoose.model<IRefundOffline>('OfflineRefund', refundSchema);
export default OfflineRefund;
