import express from 'express';
import { approveListing, createAttraction, createListing, deleteAttraction, deleteListing, editAttraction, 
    getAllHostListingsById, 
    getAllListings, getAttractions, getListingById, getListingReports, getReviews, postReview, 
   searchListing, suspendListing, updateListing } from '../controlers/listing.controler';
import { authenticate, authorize } from '../middleware/auth';
import { getPersonalizedRecommendations } from '../controlers/recommendationController';


export const listingRouter = express.Router();

listingRouter.post('/creating-listings', authenticate, createListing);

listingRouter.post('/update-listings/:id', updateListing);
listingRouter.get('/get-all-listings', getAllListings);
listingRouter.get('/get-listings-by-id/:id', getListingById);



listingRouter.post('/listing/:listingId/review', authenticate, postReview)
listingRouter.get('/reviews/:listingId', getReviews, authenticate)
listingRouter.delete('/delete-property/:id', authenticate, deleteListing);
listingRouter.get('/get-host-properties/:hostId', getAllHostListingsById, authenticate)


listingRouter.put('/listings/:id/approve', authenticate, approveListing)
listingRouter.put('/listings/:id/suspend', authenticate, suspendListing)


// Not perfected yet
listingRouter.get('/search', searchListing);

// attractions 
listingRouter.post('/create-attraction/:listingId/attractions', authenticate, createAttraction)
listingRouter.post('/edit-attraction/:listingId/attractions/:attractionId', authenticate, editAttraction)
listingRouter.delete('/delete-attraction/:listingId/attractions/:attractionId', deleteAttraction, authenticate)
listingRouter.get('/get-my-attractions/:listingId/attractions', authenticate, getAttractions)

// attractions api's are all working. just that the images for updating attraction have been tested.


listingRouter.get('/listing-report', authenticate, getListingReports)

