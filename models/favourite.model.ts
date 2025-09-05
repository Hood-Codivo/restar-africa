import mongoose from 'mongoose';

// Define interface for User document
interface User {
    _id: mongoose.Schema.Types.ObjectId;
    // Add other user properties here
}

// Define interface for Listing document
interface Listing {
    _id: mongoose.Schema.Types.ObjectId;
    // Add other listing properties here
}

// Define interface for Favorite document
interface Favorite {
    user: mongoose.Schema.Types.ObjectId | User;
    listing: mongoose.Schema.Types.ObjectId | Listing;
    createdAt: Date;
}
  
// Define Favorite schema with type annotations
const FavoriteSchema = new mongoose.Schema<Favorite>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restr-users',
        required: true,
    },
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restr-listing',
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model<Favorite>('rester-favorite', FavoriteSchema);