import express from 'express';
import {
    getAllApartments, getAllEventCenter, getAllHotels,
    getBoostedListings, getNewListings,
    getRecommendedProperties, getTopRated,
    getTopViewsListings
} from '../controlers/get.listings.controller';
export const allListingsRouter = express.Router();

// all-apartments api 
allListingsRouter.get("/get-apartments", getAllApartments)
allListingsRouter.get("/get-event-centers", getAllEventCenter)
allListingsRouter.get("/get-all-hotels", getAllHotels)

// get listing by recommendations for user loggedin
allListingsRouter.get("/personalized-recommendations/:userId", getRecommendedProperties)
allListingsRouter.get('/top-rated', getTopRated)
allListingsRouter.get('/new-listings', getNewListings)
allListingsRouter.get('/top-boosted', getBoostedListings)
allListingsRouter.get('/top-views', getTopViewsListings) 