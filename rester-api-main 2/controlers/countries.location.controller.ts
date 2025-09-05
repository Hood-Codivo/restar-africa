import express, { NextFunction, Request, Response } from 'express';
import Location from '../models/location.coutntries.model';


export const ctxLocation = async (req: Request, res: Response, next: NextFunction) => {
    const locations = await Location.find();
    res.json(locations);
};

// GET a specific location by ID

export const ctxLocationID = async (req: Request, res: Response, next: NextFunction) => {
    const location = await Location.findById(req.params.id);
    if (!location) {
        return res.status(404).json({ message: 'Location not found' });
    }
    res.json(location);
};

// CREATE a new location
export const ctxLocationCreate = async (req: Request, res: Response, next: NextFunction) => {
    const location = new Location(req.body);
    await location.save();
    res.status(201).json(location);
};

// UPDATE a location by ID
export const ctxLocationUpdate = async (req: Request, res: Response, next: NextFunction) => {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!location) {
        return res.status(404).json({ message: 'Location not found' });
    }
    res.json(location);
};

// DELETE a location by ID

export const ctxLocationDelete = async (req: Request, res: Response, next: NextFunction) => {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
        return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully' });
};

