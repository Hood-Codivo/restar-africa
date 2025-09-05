import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  propertyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reason: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
  propertyId: { type: Schema.Types.ObjectId, ref: 'restr-listing', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'restr-users', required: true },
  reason: { type: String, required: true },
  description: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IReport>('Report', ReportSchema);