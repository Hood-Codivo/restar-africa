import express from 'express';
import { addFavorite, getFavorites, removeFavorite } from '../controlers/favourite.controller';
import { authenticate } from '../middleware/auth';


const favouriteRouter = express.Router();

// Create a new chat room
favouriteRouter.post('/favorites', authenticate, addFavorite);

// Get room for a specific guest
favouriteRouter.get('/favorites/:userId', authenticate, getFavorites);

// Send a message in a chat room
favouriteRouter.delete('/favorites/:userId/:listingId', authenticate, removeFavorite);

export default favouriteRouter;