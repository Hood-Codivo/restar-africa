import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  sender: string;
  message: string;
  isAI: boolean;
  solutionId?: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  roomId: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: true },
  isAI: { type: Boolean, default: false },
  solutionId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMessage>('Message', messageSchema);