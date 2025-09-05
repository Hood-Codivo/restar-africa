import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ctxLocation, ctxLocationCreate, ctxLocationDelete, ctxLocationID, ctxLocationUpdate } from '../controlers/countries.location.controller';


export const locationRouter = express.Router();

locationRouter.get('/locations', ctxLocation);
locationRouter.get('/locations/:id', ctxLocationID, authenticate, authorize('admin'));
locationRouter.post('/locations', ctxLocationCreate, authenticate, authorize('admin'));
locationRouter.put('/locations/:id', ctxLocationUpdate, authenticate, authorize('admin'));
locationRouter.delete('/locations/:id', ctxLocationDelete, authenticate, authorize('admin'));