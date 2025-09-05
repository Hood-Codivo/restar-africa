import { Request, Response, NextFunction } from 'express';
import cloudinary from "cloudinary";
import listingModel, { IListing } from '../models/listing.model';
import ErrorHandler from '../utils/ErrorHandler';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import mongoose from 'mongoose';
import Booking from '../models/book.model';


export const createListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingData: Partial<IListing> = req.body;
    const newListing = new listingModel(listingData);
    await newListing.save();

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: {
        id: newListing._id,
        title: newListing.title,
        property_type: newListing.property_type
      }
    });
  } catch (error) {
    console.error('Error creating listing:', error);

    if (error instanceof mongoose.Error.ValidationError) {
      // Handle Mongoose validation errors
      const validationErrors = Object.values(error.errors).map(err => err.message);
      next(new ErrorHandler(`Validation error: ${validationErrors.join(', ')}`, 400));
    } else if (error instanceof mongoose.Error.CastError) {
      // Handle Mongoose cast errors (e.g., invalid ObjectId)
      next(new ErrorHandler(`Invalid ${error.path}: ${error.value}`, 400));
    } else if (error instanceof ErrorHandler) {
      // Pass custom ErrorHandler instances directly
      next(error);
    } else {
      // Handle other types of errors
      next(new ErrorHandler('Error creating listing', 500));
    }
  }
};

export const updateListing = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      property_type,
      location,
      facility_images,
      hotel_room_types,
      landmarks,
      hotel_categories,
      apartment_price,
      amenities,
      apartment_availability,
      apartment_cancellation_policy,
      apartment_house_rules,
      safety_features,
      general_rules,
      hotel_cancellation_policy,
      general_special_offers,
      event_center,
      all_views
    } = req.body;

    const { id } = req.params;

    // Find the listing by ID
    const listing = await listingModel.findById(id);


    if (!listing) {
      return next(new ErrorHandler('Listing not found', 404));
    }

    // Handle facility image updates
    if (facility_images && Array.isArray(facility_images)) {
      const newImages: any[] = [];
      for (const image of facility_images) {
        if (!image) {
          console.warn('Undefined image encountered in facility_images');
          continue;
        }

        if (typeof image === 'string') {
          if (image.startsWith('data:')) {
            // If it's a base64 string, upload it
            const result = await cloudinary.v2.uploader.upload(image, { folder: 'facility_uploads' });
            newImages.push({ public_id: result.public_id, url: result.secure_url });
          } else {
            // If it's a URL, keep it as is
            newImages.push({ public_id: '', url: image });
          }
        } else if (image.url) {
          if (image.url.startsWith('data:')) {
            // If it's a base64 string, upload it
            const result = await cloudinary.v2.uploader.upload(image.url, { folder: 'facility_uploads' });
            newImages.push({ public_id: result.public_id, url: result.secure_url });
          } else {
            // If it's already a URL, keep it as is
            newImages.push(image);
          }
        } else {
          console.warn('Invalid image format encountered in facility_images');
        }
      }

      // Remove old images that are not in the new set
      for (const oldImage of listing.facility_images) {
        if (oldImage.public_id && !newImages.some(newImage => newImage.public_id === oldImage.public_id)) {
          await cloudinary.v2.uploader.destroy(oldImage.public_id);
        }
      }

      listing.facility_images = newImages;
    }

    // Handle room image updates
    if (hotel_room_types && Array.isArray(hotel_room_types)) {
      for (let i = 0; i < hotel_room_types.length; i++) {
        const roomType = hotel_room_types[i];
        if (roomType.images && Array.isArray(roomType.images)) {
          const newRoomImages: any[] = [];
          for (const image of roomType.images) {
            if (!image) {
              console.warn(`Undefined image encountered in room_images for room type ${i}`);
              continue;
            }

            if (typeof image === 'string') {
              if (image.startsWith('data:')) {
                // If it's a base64 string, upload it
                const result = await cloudinary.v2.uploader.upload(image, { folder: `room_uploads/${i}` });
                newRoomImages.push({ public_id: result.public_id, url: result.secure_url });
              } else {
                // If it's a URL, keep it as is
                newRoomImages.push({ public_id: '', url: image });
              }
            } else if (image.url) {
              if (image.url.startsWith('data:')) {
                // If it's a base64 string, upload it
                const result = await cloudinary.v2.uploader.upload(image.url, { folder: `room_uploads/${i}` });
                newRoomImages.push({ public_id: result.public_id, url: result.secure_url });
              } else {
                // If it's already a URL, keep it as is
                newRoomImages.push(image);
              }
            } else {
              console.warn(`Invalid image format encountered in room_images for room type ${i}`);
            }
          }

          // Remove old room images that are not in the new set
          const existingRoomType = listing.hotel_room_types[i];
          if (existingRoomType && existingRoomType.images) {
            for (const oldImage of existingRoomType.images) {
              if (oldImage.public_id && !newRoomImages.some(newImage => newImage.public_id === oldImage.public_id)) {
                await cloudinary.v2.uploader.destroy(oldImage.public_id);
              }
            }
          }

          roomType.images = newRoomImages;
        }
      }
    }

    // Update listing fields
    const updateFields: any = {
      title,
      description,
      property_type,
      location,
      hotel_room_types,
      landmarks,
      hotel_categories,
      apartment_price,
      amenities,
      apartment_availability,
      apartment_cancellation_policy,
      apartment_house_rules,
      safety_features,
      general_rules,
      hotel_cancellation_policy,
      general_special_offers,
      event_center,
      all_views
    };


    console.log(all_views, "all views")

    // Remove undefined fields
    Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key]);

    // Update the listing with the new fields
    Object.assign(listing, updateFields);

    // Save the updated listing
    await listing.save();

    res.status(200).json({ success: true, listing, message: 'Listing updated successfully' });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Fetch all listings
export const getAllListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listings = await listingModel.find().sort({ createdAt: -1 });;

    res.status(200).json({
      success: true, 
      count: listings.length,
      data: listings,
    });
  } catch (error) {
    next(new ErrorHandler('Error fetching listings', 500));
  }
};


// get all listing for a host  
export const getAllHostListingsById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { hostId } = req.params;
  try {
    const listings = await listingModel.find({ 'host.host_id': hostId });
    res.json(listings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching listings' });
  }
};

// Fetch listing by ID for detail page
export const getListingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await listingModel.findById(id);

    if (!listing) {
      return next(new ErrorHandler('Listing not found', 404));
    }

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(new ErrorHandler('Error fetching listing', 500));
  }
};




export const deleteListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 1. Find the listing by ID
    const listing = await listingModel.findById(id);

    if (!listing) {
      return next(new ErrorHandler('Listing not found.', 404));
    }

    // 2. Check for active bookings
    const activeBookings = await Booking.find({
      property: id,
      // Find bookings that are not yet 'completed' or 'cancelled'
      bookingStatus: { $nin: ['completed', 'cancelled'] },
      // And whose check-out date is in the future
      checkOut: { $gte: new Date() },
    });

    if (activeBookings && activeBookings.length > 0) {
      // If active bookings exist, prevent deletion and return an error
      return next(
        new ErrorHandler(
          'Cannot delete listing. There are active bookings that have not been fulfilled.',
          400
        )
      );
    }

    // 3. If no active bookings, "soft-delete" the listing
    // Set a date for final deletion, two weeks from now
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const updatedListing = await listingModel.findByIdAndUpdate(
      id,
      {
        // Suspend the listing so it no longer appears in searches/bookings
        isSuspend: true,
        // Set approval status to pending as per the requirement
        isAprove: 'pending',
        // Set a flag for the background job to recognize it for deletion
        isDeleted: true, 
        // Store the date for the final, permanent deletion
        deletionDate: twoWeeksFromNow,
      },
      { new: true }
    );

    // 4. Return a success message
    res.status(200).json({
      success: true,
      message: `Listing '${updatedListing.title}' has been suspended and is scheduled for permanent deletion on ${twoWeeksFromNow.toLocaleDateString()}.`,
      data: updatedListing,
    });

  } catch (error: any) {
    console.error('Error in deleteListing:', error);
    return next(new ErrorHandler(error.message, 500));
  }
};

// Update approveListing API
export const approveListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id: string = req.params.id;
    if (!id) {
      return next(new ErrorHandler("Listing not found", 404))
    }
    const updatedData = req.body;

    const updated = await listingModel.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );
    res.status(201).json({
      success: true,
      message: "Updated successfully.",
      updated
    })

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500))
  }
};

// Update suspendListing API
export const suspendListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id: string = req.params.id;
    if (!id) {
      return next(new ErrorHandler("Listing not found", 404))
    }
    const updatedData = req.body;

    const updated = await listingModel.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Update successfully",
      updated
    })

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500))
  }
};


// rturn base on ranking

export const postReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const { cleanliness, customer_service, overall_rating, comment } = req.body;
    const userId = req.user._id;

    const listing = await listingModel.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check if the user has already reviewed this listing
    const hasReviewed = listing.reviews.some(
      (review) => review.user.toString() === userId.toString()
    );

    if (hasReviewed) {
      return res.status(409).json({ message: 'You have already reviewed this property.' });
    }

    const newReview = {
      user: userId,
      cleanliness,
      customer_service,
      overall_rating,
      comment,
      date: new Date(),
    };

    listing.reviews.push(newReview);
    await listing.save();

    res.status(201).json({ message: 'Review added successfully', review: newReview });
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
});

// New route to get all reviews for a property

export const getReviews = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const listing = await listingModel.findById(listingId).populate({
      path: 'reviews.user',
      select: 'name profile_picture'
    });

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const reviews = listing.reviews.map((review: any) => ({
      id: review._id,
      user: {
        name: review.user.name,
        profile_picture: review.user.profile_picture
      },
      cleanliness: review.cleanliness,
      customer_service: review.customer_service,
      overall_rating: review.overall_rating,
      comment: review.comment,
      date: review.date
    }));

    res.status(200).json({
      reviews,
      average_rating: listing.average_rating,
      total_reviews: reviews.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const createAttraction = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, latitude, longitude, image } = req.body;
  const { listingId } = req.params;

  console.log('Received data:', { name, description, latitude, longitude, image: image ? 'Image data received' : 'No image' });
  console.log('ListingId:', listingId);

  if (!listingId || !name || !description || !latitude || !longitude) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const listing = await listingModel.findById(listingId);

  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }

  if (listing.attractions.length >= 2) {
    return res.status(400).json({ message: 'Maximum number of attractions (2) already reached' });
  }

  let imageData = null;
  if (image) {
    try {
      const uploadResponse = await cloudinary.v2.uploader.upload(image, {
        folder: "attractions",
        resource_type: "auto"
      });
      imageData = {
        public_id: uploadResponse.public_id,
        url: uploadResponse.secure_url
      };
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      return res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
  }

  const distance = calculateDistance(
    listing.location.latitude,
    listing.location.longitude,
    parseFloat(latitude),
    parseFloat(longitude)
  );

  const newAttraction = {
    name,
    description,
    image: imageData,
    latitude,
    longitude,
    distance
  };

  listing.attractions.push(newAttraction);
  await listing.save();

  res.status(201).json({ message: 'Attraction added successfully', attraction: newAttraction });
});


// Update attraction
export const editAttraction = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { listingId, attractionId } = req.params;
  const { name, description, image, latitude, longitude } = req.body;

  const listing = await listingModel.findById(listingId);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }

  const attractionIndex = listing.attractions.findIndex((attr: any) => attr._id.toString() === attractionId);
  if (attractionIndex === -1) {
    return res.status(404).json({ message: 'Attraction not found' });
  }

  const attraction = listing.attractions[attractionIndex];

  if (image) {
    try {
      // Check if the image is a new upload (base64 string) or an existing URL
      if (typeof image === 'string' && !image.startsWith('http')) {
        // Upload new image
        const uploadResponse = await cloudinary.v2.uploader.upload(image, {
          folder: "attractions",
          resource_type: "auto"
        });

        // Delete previous image if it exists
        if (attraction.image && attraction.image.public_id) {
          await cloudinary.v2.uploader.destroy(attraction.image.public_id);
        }

        // Update attraction with new image data
        attraction.image = {
          public_id: uploadResponse.public_id,
          url: uploadResponse.secure_url
        };
      } else {
        // If it's a URL, assume it's an existing image and don't change it
        console.log('Existing image URL detected, no changes made to image');
      }
    } catch (error) {
      console.error('Error handling image upload/update:', error);
      return res.status(500).json({ message: 'Error updating image', error: error.message });
    }
  }

  // Update other fields
  attraction.name = name || attraction.name;
  attraction.description = description || attraction.description;

  // Update latitude, longitude, and recalculate distance if provided
  if (latitude !== undefined && longitude !== undefined) {
    const newLatitude = parseFloat(latitude);
    const newLongitude = parseFloat(longitude);

    if (isNaN(newLatitude) || isNaN(newLongitude)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }

    const distance = calculateDistance(
      listing.location.latitude,
      listing.location.longitude,
      newLatitude,
      newLongitude
    );

    attraction.distance = distance;
  }

  await listing.save();

  res.json({ message: 'Attraction updated successfully', attraction });
});


// Delete attraction
export const deleteAttraction = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId, attractionId } = req.params;

    const listing = await listingModel.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const attraction = listing.attractions.id(attractionId);
    if (!attraction) {
      return res.status(404).json({ message: 'Attraction not found' });
    }

    // Delete images from Cloudinary
    for (const image of attraction.image) {
      await cloudinary.v2.uploader.destroy(image.public_id);
    }

    listing.attractions.pull(attractionId);
    await listing.save();

    res.json({ message: 'Attraction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting attraction', error: error.message });
  }
});

// Get all approved attractions for a listing

export const getAttractions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const listing = await listingModel.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json(listing.attractions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attractions', error: error.message });
  }
});


// Lististing reports 

export const getListingReports = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalListings = await listingModel.countDocuments();
    const approvedListings = await listingModel.countDocuments({ isAprove: true });
    const suspendedListings = await listingModel.countDocuments({ isSuspend: true });
    const rejectedListings = await listingModel.countDocuments({ isAprove: false, isSuspend: false });

    const report = {
      total: totalListings,
      approved: approvedListings,
      suspended: suspendedListings,
      rejected: rejectedListings
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating listing report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// search listing 
export const searchListing = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type, country, city, title, amenities, rating, guests,
      minPrice, maxPrice, checkIn, checkOut
    } = req.query;

    let query: any = { isAprove: 'approved', isSuspend: false };

    if (type && type !== 'any') {
      query.property_type = type;
    }

    if (country && country !== 'any') {
      query['location.country'] = { $regex: country, $options: 'i' };
    }

    if (city && city !== 'any') {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (amenities) {
      const amenitiesList = (amenities as string).split(',');
      const amenitiesQuery = amenitiesList.reduce((acc: any, amenity) => {
        acc[`amenities.${amenity}`] = true;
        return acc;
      }, {});
      query = { ...query, ...amenitiesQuery };
    }

    if (rating) {
      query.average_rating = { $gte: parseFloat(rating as string) };
    }

    if (guests) {
      if (type === 'hotel') {
        query['hotel_room_types.max_occupancy'] = { $gte: parseInt(guests as string, 10) };
      }  else {
        if (type === 'apartment') {
          query['apartment_availability.maximum_nights'] = { $gte: parseInt(guests as string, 10) };
        }
      }
    }

    // Price filtering
    let priceQuery: any = {};
    if (type === 'hotel') {
      priceQuery = { 'hotel_room_types.price.nightly_rate': {} };
    } else {
      priceQuery = { 'apartment_price.nightly_rate': {} };
    }

    if (minPrice) {
      priceQuery[Object.keys(priceQuery)[0]].$gte = parseFloat(minPrice as string);
    }
    if (maxPrice) {
      priceQuery[Object.keys(priceQuery)[0]].$lte = parseFloat(maxPrice as string);
    }

    if (Object.keys(priceQuery[Object.keys(priceQuery)[0]]).length > 0) {
      query = { ...query, ...priceQuery };
    }

    // Availability filtering
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn as string);
      const checkOutDate = new Date(checkOut as string);

      if (type === 'hotel') {
        query['hotel_room_types.availability'] = {
          $all: [
            { $elemMatch: { $gte: checkInDate, $lt: checkOutDate } }
          ]
        };
      } else {
        // For apartments
        query['apartment_availability.available_dates'] = {
          $all: [
            { $elemMatch: { $gte: checkInDate, $lt: checkOutDate } }
          ]
        };
      }
    }

    const listings = await listingModel.find(query)
      .sort({ rankingBoost: -1, average_rating: -1, views: -1 })
      .limit(50);  // Limit to top 50 results

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Error searching listings', error });
  }
});
