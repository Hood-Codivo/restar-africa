import { Request, Response } from 'express';
import { solutionModel } from '../models/solution.models';


export const createSolution = async (req: Request, res: Response) => {
  try {
    const { keyword, response, category } = req.body;
    console.log(keyword, response, category, "info")
    const newSolution = new solutionModel({ keyword, response, category });
    await newSolution.save();
    res.status(201).json(newSolution);
  } catch (error) {
    res.status(500).json({ message: 'Error creating solution', error: error.message });
  }
};

export const getSolutions = async (req: Request, res: Response) => {
  try {
    const solutions = await solutionModel.find();
    res.status(200).json(solutions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching solutions', error: error.message });
  }
};

export const updateSolution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { keyword, response, category } = req.body;
    const updatedSolution = await solutionModel.findByIdAndUpdate(
      id,
      { keyword, response, category },
      { new: true }
    );
    if (!updatedSolution) {
      return res.status(404).json({ message: 'Solution not found' });
    }
    res.status(200).json(updatedSolution);
  } catch (error) {
    res.status(500).json({ message: 'Error updating solution', error: error.message });
  }
};

export const deleteSolution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedSolution = await solutionModel.findByIdAndDelete(id);
    if (!deletedSolution) {
      return res.status(404).json({ message: 'Solution not found' });
    }
    res.status(200).json({ message: 'Solution deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting solution', error: error.message });
  }
};