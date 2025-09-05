import userModel from '../models/user_model';
import Booking from '../models/book.model';
import listingModel, { IListing } from '../models/listing.model';

interface RecommendationCriteria {
    propertyTypes: string[];
    locations: string[];
    priceRange: {
        min: number;
        max: number;
    };
}

async function getUserPreferences(userId: string): Promise<RecommendationCriteria> {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const pastBookings = await Booking.find({ user: userId, bookingStatus: 'completed' });

    const propertyTypes = new Set<string>();
    const locations = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const booking of pastBookings) {
        propertyTypes.add(booking.type);
        locations.add(booking.propertyAddress.split(',')[0].trim()); // Assuming city is first part of address
        minPrice = Math.min(minPrice, booking.totalAmount);
        maxPrice = Math.max(maxPrice, booking.totalAmount);
    }

    return {
        propertyTypes: Array.from(propertyTypes),
        locations: Array.from(locations),
        priceRange: {
            min: minPrice === Infinity ? 0 : minPrice,
            max: maxPrice === 0 ? 1000 : maxPrice
        }
    };
}

export async function generateRecommendations(userId: string): Promise<IListing[]> {
    const preferences = await getUserPreferences(userId);

    const recommendations = await listingModel.aggregate([
        {
            $match: {
                $or: [
                    { property_type: { $in: preferences.propertyTypes } },
                    { 'location.city': { $in: preferences.locations } },
                    {
                        $or: [
                            { 'apartment_price.nightly_rate': { $gte: preferences.priceRange.min, $lte: preferences.priceRange.max } },
                            { 'hotel_room_types.price.nightly_rate': { $gte: preferences.priceRange.min, $lte: preferences.priceRange.max } }
                        ]
                    }
                ]
            }
        },
        {
            $addFields: {
                relevanceScore: {
                    $add: [
                        { $cond: [{ $in: ['$property_type', preferences.propertyTypes] }, 2, 0] },
                        { $cond: [{ $in: ['$location.city', preferences.locations] }, 2, 0] },
                        {
                            $cond: [
                                {
                                    $or: [
                                        {
                                            $and: [
                                                { $gte: ['$apartment_price.nightly_rate', preferences.priceRange.min] },
                                                { $lte: ['$apartment_price.nightly_rate', preferences.priceRange.max] }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $gte: [{ $min: '$hotel_room_types.price.nightly_rate' }, preferences.priceRange.min] },
                                                { $lte: [{ $max: '$hotel_room_types.price.nightly_rate' }, preferences.priceRange.max] }
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    ]
                }
            }
        },
        {
            $sort: { relevanceScore: -1 }
        },
        {
            $limit: 10
        }
    ]);

    return recommendations;
}