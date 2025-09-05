import mongoose, { Schema, Document } from 'mongoose';

interface IGuest {
    question: string;
    answer: string;
}

interface IQuestions extends Document {
    title: string;
    guestQuestions: IGuest[];
    hostQuestions: IGuest[];
}

const guestSchema = new Schema({
    question: { type: String },
    answer: { type: String },
});

const listingSchema = new Schema({
    title: { type: String, required: true },
    guestQuestions: [guestSchema],
    hostQuestions: [guestSchema],
}, {
    timestamps: true,
});

export default mongoose.model<IQuestions>('Faq', listingSchema);