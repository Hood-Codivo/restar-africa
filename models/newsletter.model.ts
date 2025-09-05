import mongoose, { Document, model } from "mongoose";

interface INewsletter extends Document {
    email: string;
    name: string;
}

const newsletterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
}, { timestamps: true });

const NewsletterModel = model<INewsletter>('Newsletter', newsletterSchema);
export default NewsletterModel;