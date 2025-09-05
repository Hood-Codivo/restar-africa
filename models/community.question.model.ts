import mongoose, { Document, Schema, model, Types } from 'mongoose';

// Interface for User Booking
interface IQuestion extends Document {
    title: string;
    author: string;
    content: string;
}

// Schema for User Booking
const QuestionSchema: Schema<IQuestion> = new Schema(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        author: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

const Question = model<IQuestion>('Question', QuestionSchema);
export default Question;