import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { createSolution, deleteSolution, getSolutions, updateSolution } from '../controlers/solutions.controller';


const solRouter = express.Router();

solRouter.post('/create-solutions', authenticate, authorize("admin"), createSolution);
solRouter.get('/get-all-solutions', authenticate, getSolutions);
solRouter.put('/edit-solutions/:id', authenticate, authorize("admin"), updateSolution);
solRouter.delete('/delete-solutions/:id', authenticate, authorize("admin"), deleteSolution);

export default solRouter;