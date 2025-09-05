import mongoose, { Document, Schema } from 'mongoose';

export interface ISolution extends Document {
  keyword: string;
  response: string;
  category: string;
}

const solutionSchema = new Schema<ISolution>({
  keyword: { type: String, required: true, unique: true },
  response: { type: String, required: true },
  category: { type: String, required: true },
});

export const solutionModel = mongoose.model<ISolution>('rester-Solution', solutionSchema);