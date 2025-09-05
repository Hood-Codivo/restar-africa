import mongoose, { Document, Schema, model, Types } from 'mongoose';

// Interface for User Booking
interface IAnswer extends Document {
    questionId: string;
    author: string;
    content: string;
    likes: number;
    likedBy: Types.ObjectId[]; // Array of ObjectId for users who liked the story
}

// Schema for User Booking
const AnswerSchema: Schema<IAnswer> = new Schema(
    {
        questionId: { type: String, required: true },
        content: { type: String, required: true },
        author: { type: String, required: true },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'restr-users' }],
    },
    {
        timestamps: true,
    }
);

const Answer = model<IAnswer>('Answer', AnswerSchema);
export default Answer;