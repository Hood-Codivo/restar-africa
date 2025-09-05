import mongoose, { Document, Schema } from 'mongoose';

export interface IAppeal extends Document {
  user: mongoose.Types.ObjectId;
  reason: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const AppealSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, minlength: 10, maxlength: 500 },
  additionalInfo: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

export const Appeal = mongoose.model<IAppeal>('rester-Appeal', AppealSchema);