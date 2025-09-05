import { NextFunction, Request, Response } from "express";
import favouriteModel from "../models/favourite.model";

export const addFavorite = async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId, listingId } = req.body;
  
      // Check if listing already exists in favorites for the user
      const existingFavorite = await favouriteModel.findOne({ user: userId, listing: listingId });
  
      if (existingFavorite) {
        // Listing already exists in favorites, return appropriate response
        return res.status(200).json({ success: false, message: "Listing already exists in favorites" });
      }
  
      // If not found, proceed with adding the favorite
      const favorite = new favouriteModel({ user: userId, listing: listingId });
      await favorite.save();
  
      res.status(201).json({ success: true, data: favorite });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

export const removeFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId, listingId } = req.params;
        await favouriteModel.findOneAndDelete({ user: userId, listing: listingId });
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};


export const getFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const favorites = await favouriteModel.find({ user: userId }).populate('listing');
        res.status(200).json({ success: true, data: favorites });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};