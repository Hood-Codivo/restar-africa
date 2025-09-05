import { Request, Response } from 'express';
import { generateRecommendations } from '../services/recommendationService'; // Ensure this path is correct
import Booking from '../models/book.model'; // Ensure this path is correct and it's your Booking model
import userModel from '../models/user_model'; // Ensure this path is correct and it's your User model
import mongoose from 'mongoose'; // Import mongoose for ObjectId type checking

// This API seems to be for fetching recommendations, which is separate from updating preferences.
export async function getPersonalizedRecommendations(req: Request, res: Response) {
    try {
        // req.user._id is typically a string or ObjectId from deserialization/JWT payload
        const userId = req.user?._id; 

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated or ID not found." });
        }

        const recommendations = await generateRecommendations(userId.toString()); // Ensure userId is a string for generateRecommendations if it expects it
        res.json({ success: true, data: recommendations });
    } catch (error: any) { // Explicitly type error for better safety
        console.error("Error in getPersonalizedRecommendations:", error); // Log the error
        res.status(500).json({ success: false, message: error.message || "An unexpected error occurred." });
    }
}

// Fixed updateUserPreferences function
export async function updateUserPreferences(userId: string | mongoose.Types.ObjectId, bookingId: string | mongoose.Types.ObjectId) {
    // 1. Validate inputs early
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid userId provided to updateUserPreferences: ${userId}`);
        throw new Error('Invalid User ID provided for preference update.');
    }
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
        console.error(`Invalid bookingId provided to updateUserPreferences: ${bookingId}`);
        throw new Error('Invalid Booking ID provided for preference update.');
    }

    try {
        const user = await userModel.findById(userId);
        // Using `populate` here if your Booking model has a reference to property,
        // so you can use property details for richer preference tracking later.
        const booking = await Booking.findById(bookingId); 

        // Console log for debugging:
        console.log("--- updateUserPreferences Debug ---");
        console.log(`Searching for userId: ${userId} -> Found: ${!!user}`); // `!!user` converts to boolean
        console.log(`Searching for bookingId: ${bookingId} -> Found: ${!!booking}`); // `!!booking` converts to boolean
        console.log("Found Booking object:", booking); // Log the actual booking object

        if (!user || !booking) {
            // This is the line generating your error.
            // It means either user or booking (or both) were not found.
            throw new Error('User or Booking not found for preference update.');
        }

        // Initialize guestDetails if it doesn't exist
        // Ensure your userModel schema has a `guestDetails` field with `pastBookings` and `wishlist`
        if (!user.guestDetails) {
            user.guestDetails = {
                pastBookings: [],
                wishlist: [] // Assuming wishlist is also part of guestDetails
            };
        }
        
        // Ensure pastBookings is an array
        if (!Array.isArray(user.guestDetails.pastBookings)) {
            user.guestDetails.pastBookings = [];
        }

        // Add to past bookings if not already present
        // Convert ObjectId to string for reliable `includes` check
        const bookingIdString = booking._id.toString();
        if (!user.guestDetails.pastBookings.includes(bookingIdString)) {
            user.guestDetails.pastBookings.push(bookingIdString);
            console.log(`Added booking ${bookingIdString} to user ${userId}'s pastBookings.`);
        } else {
            console.log(`Booking ${bookingIdString} already exists in user ${userId}'s pastBookings.`);
        }

        // Save the updated user document
        await user.save();
        console.log(`User ${userId}'s preferences updated successfully.`);

    } catch (error: any) {
        console.error(`Error updating user preferences for userId ${userId}, bookingId ${bookingId}:`, error.message);
        throw error; // Re-throw the error so `createBooking` can catch it
    }
}