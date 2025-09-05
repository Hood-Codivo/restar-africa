import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITermsPolicy extends Document {
  title: string;
  text: string;
  isApproved: boolean;
}

const TermsPolicySchema: Schema<ITermsPolicy> = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

const TermsPolicyModel: Model<ITermsPolicy> = mongoose.model<ITermsPolicy>("Terms-Policy", TermsPolicySchema);
export default TermsPolicyModel;