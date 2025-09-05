import express from 'express';
import { createCareer, deleteCareer, getAllCareers, getCareerById, updateCareer } from '../controlers/career.controller';

const careerRouter = express.Router();

careerRouter.get('/careers', getAllCareers);
careerRouter.get('/careers/:id', getCareerById);
careerRouter.post('/careers', createCareer);
careerRouter.put('/careers/:id', updateCareer);
careerRouter.delete('/careers/:id', deleteCareer);

export default careerRouter;