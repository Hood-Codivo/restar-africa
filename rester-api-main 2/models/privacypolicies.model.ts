import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPrivacyPolicy extends Document {
  title: string;
  text: string;
  isApproved: boolean;
}

const PrivacyPolicySchema: Schema<IPrivacyPolicy> = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

const PrivacyPolicyModel: Model<IPrivacyPolicy> = mongoose.model<IPrivacyPolicy>("restr-Privacy Policy", PrivacyPolicySchema);
export default PrivacyPolicyModel;