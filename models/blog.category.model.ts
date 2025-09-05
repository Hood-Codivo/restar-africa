import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the Category interface
export interface ICategory extends Document {
  name: string;
} 

// Define the Category schema
const CategorySchema: Schema<ICategory> = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

// Export the model
const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
