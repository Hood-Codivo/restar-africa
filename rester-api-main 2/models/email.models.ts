import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEmail extends Document {
  from: string;
  to: string;
  subject: string;
  message: string;
}

const emailSchema = new Schema<IEmail>({
  from: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });

const EmailModel: Model<IEmail> = mongoose.model<IEmail>("Email", emailSchema);

export default EmailModel;
