import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the Post interface
export interface IPost extends Document {
  title: string;
  content: string;
  author: string;
  categories: mongoose.Types.ObjectId[];
  tags: string[];
  image?: { 
    public_id: string;
    url: string;
};
  youtubeVideoId?: string;
  comments: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the Post schema
const PostSchema: Schema<IPost> = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true, 
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  image: {
    public_id: String,
    url: String,
},
  youtubeVideoId: {
    type: String,
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model
const Post: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);
export default Post;















