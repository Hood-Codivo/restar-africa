import mongoose, { Document, Model, Schema } from "mongoose";

interface IComment {
  name: string;
  content: string;
  createdAt: Date;
}

export interface ISuccessStory extends Document {
  name: string;
  location: string;
  userId: mongoose.Types.ObjectId;
  image: string;
  avatar: string;
  title: string;
  snippet: string;
  content: string;
  rating: number;
  category: string;
  likedBy: mongoose.Types.ObjectId[];
  likes: number;
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SuccessStorySchema: Schema<ISuccessStory> = new Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "restr-users", required: true },
    image: { type: String },
    avatar: { type: String },
    title: { type: String, required: true },
    snippet: { type: String, required: true },
    content: { type: String, required: true },
    rating: { type: Number, required: true },
    category: { type: String, required: true },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "restr-users" }],
    likes: { type: Number, default: 0 },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

const SuccessStory: Model<ISuccessStory> = mongoose.model(
  "SuccessStory",
  SuccessStorySchema
);

export default SuccessStory;
