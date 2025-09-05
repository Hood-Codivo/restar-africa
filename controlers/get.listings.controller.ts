import { NextFunction, Request, Response } from 'express';
import listingModel from '../models/listing.model';
import userModel from '../models/user_model';

export const getAllApartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const listings = await listingModel.aggregate([
            {
                $match: {
                    isAprove: "approved",
                    property_type: "Apartment",
                    isSuspend: false,
                    views: { $gt: 0 },
                    average_rating: { $gte: 0 }
                }
            },
            {
                $addFields: {
                    sortOrder: {
                        $cond: [
                            { $gt: ["$rankingBoost", 0] },
                            0,  // If rankingBoost > 0, put it first
                            1   // If rankingBoost = 0 or doesn't exist, put it second
                        ]
                    }
                }
            },
            {
                $sort: {
                    sortOrder: 1,
                    rankingBoost: -1,
                    average_rating: -1
                }
            },
            {
                $project: {
                    sortOrder: 0  // Remove the temporary sortOrder field
                }
            }
        ]);

        console.log(`Found ${listings.length} apartments`);
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'An error occurred while fetching listings' });
    }
}
export const getAllHotels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const listings = await listingModel.aggregate([
            {
                $match: {
                    isAprove: "approved",
                    property_type: "Hotel",
                    isSuspend: false,
                    views: { $gt: 0 },
                    average_rating: { $gte: 0 }
                }
            },
            {
                $addFields: {
                    sortOrder: {
                        $cond: [
                            { $gt: ["$rankingBoost", 0] },
                            0,  // If rankingBoost > 0, put it first
                            1   // If rankingBoost = 0 or doesn't exist, put it second
                        ]
                    }
                }
            },
            {
                $sort: {
                    sortOrder: 1,
                    rankingBoost: -1,
                    average_rating: -1
                }
            },
            {
                $project: {
                    sortOrder: 0  // Remove the temporary sortOrder field
                }
            }
        ]);

        console.log(`Found ${listings.length} apartments`);
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'An error occurred while fetching listings' });
    }
}
export const getAllEventCenter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const listings = await listingModel.aggregate([
            {
                $match: {
                    isAprove: "approved",
                    property_type: "Event center",
                    isSuspend: false,
                    views: { $gt: 0 },
                    average_rating: { $gte: 0 }
                }
            },
            {
                $addFields: {
                    sortOrder: {
                        $cond: [
                            { $gt: ["$rankingBoost", 0] },
                            0,  // If rankingBoost > 0, put it first
                            1   // If rankingBoost = 0 or doesn't exist, put it second
                        ]
                    }
                }
            },
            {
                $sort: {
                    sortOrder: 1,
                    rankingBoost: -1,
                    average_rating: -1
                }
            },
            {
                $project: {
                    sortOrder: 0  // Remove the temporary sortOrder field
                }
            }
        ]);

        console.log(`Found ${listings.length} apartments`);
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'An error occurred while fetching listings' });
    }
}

export const getAllApartmentsTest = async (req: Request, res: Response, next: NextFunction) => {
    try {

        console.log('Fetching apartments...');
        const listings = await listingModel.find({

            rankingBoost: { $gte: 0 },
            isAprove: "approved",
            property_type: "Apartment",
            isSuspend: false,
            views: { $gt: 0 },
            average_rating: { $gte: 0 }
        }).sort({
            rankingBoost: -1,
            average_rating: -1
        });

        // Move listings with boostPoints = 0 to the end
        const sortedListings = listings.sort((a, b) => {
            if (a.rankingBoost === 0 && b.rankingBoost > 0) return 1;
            if (b.rankingBoost === 0 && a.rankingBoost > 0) return -1;
            return 0;
        });

        res.json(sortedListings);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'An error occurred while fetching listings' });
    }
}

export const getRecommendedProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const query: any = {
            isAprove: 'approved',
            isSuspend: false,
            views: { $gt: 0 },
            average_rating: { $gte: user.propertyRating || 0 }
        };

        if (user.propertyType) {
            query.property_type = user.propertyType;
        }

        if (user.propertyDestinationCountry) {
            query['location.country'] = user.propertyDestinationCountry;
        }

        if (user.propertyDestinationCity) {
            query['location.city'] = user.propertyDestinationCity;
        }

        // Add nightly rate condition based on property type
        if (user.nightlyRate) {
            if (user.propertyType === 'Hotel') {
                query['hotel_room_types.price.nightly_rate'] = { $lte: user.nightlyRate };
            } else if (user.propertyType === 'Apartment') {
                query['apartment_price.nightly_rate'] = { $lte: user.nightlyRate };
            } else if (user.propertyType === 'Event center') {
                query['event_center.pricing'] = { $lte: user.nightlyRate };
            }
        }

        const listings = await listingModel.aggregate([
            { $match: query },
            {
                $addFields: {
                    relevantPrice: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$property_type", "Hotel"] }, then: { $arrayElemAt: ["$hotel_room_types.price.nightly_rate", 0] } },
                                { case: { $eq: ["$property_type", "Apartment"] }, then: "$apartment_price.nightly_rate" },
                                { case: { $eq: ["$property_type", "Event center"] }, then: "$event_center.pricing" }
                            ],
                            default: null
                        }
                    }
                }
            },
            { $match: { relevantPrice: { $ne: null } } },
            { $sort: { rankingBoost: -1, average_rating: -1, relevantPrice: 1 } },
            { $project: { relevantPrice: 0 } } // Remove the temporary field
        ]);

        res.json(listings);
    } catch (error) {
        console.error('Error in recommendation API:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// 1. API for highest average rating and number of reviews

export const getTopRated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedListings = await listingModel.find({
            isAprove: "approved",
            "reviews.1": { $exists: true } // Ensures at least 2 reviews
        }).sort({
            average_rating: -1,
            "reviews.length": -1
        }).limit(10); // Limit to top 10, adjust as needed

        res.json(topRatedListings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching top-rated listings", error });
    }
};

// 2. API for newly created listings

export const getNewListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const newListings = await listingModel.find({
            isAprove: "approved"
        }).sort({
            rankingBoost: -1, 
            average_rating: -1, 
            createdAt: -1
        }).limit(10); // Limit to 10 newest listings, adjust as needed

        res.json(newListings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching new listings", error });
    }
};

// 3. API for top ranking boost and ratings
export const getBoostedListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topBoostedListings = await listingModel.find({
            isAprove: "approved",
            rankingBoost: { $gt: 0 }  // Only include listings with a ranking boost
        }).sort({
            average_rating: -1,  // Sort by highest average rating first
            rankingBoost: -1     // Then by ranking boost
        });

        res.json(topBoostedListings);
    } catch (error) {
        console.error('Error in getBoostedListings:', error);
        res.status(500).json({
            message: "Error fetching boosted listings",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};



export const getTopViewsListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topViewedListings = await listingModel.find({
            isAprove: "approved",
            views: { $gt: 50 }
        }).sort({
            views: -1
        })

        res.json(topViewedListings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching top viewed listings", error });
    }
}