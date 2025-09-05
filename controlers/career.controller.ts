import { Request, Response } from "express";
import Career from "../models/career.models";


export const getAllCareers = async (req: Request, res: Response) => {
  try {
    const careers = await Career.find();
    res.json(careers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching careers', error });
  }
};

export const getCareerById = async (req: Request, res: Response) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }
    res.json(career);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching career', error });
  }
};

export const createCareer = async (req: Request, res: Response) => {
  try {
    const newCareer = new Career(req.body);
    const savedCareer = await newCareer.save();
    res.status(201).json(savedCareer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating career', error });
  }
};

export const updateCareer = async (req: Request, res: Response) => {
  try {
    const updatedCareer = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCareer) {
      return res.status(404).json({ message: 'Career not found' });
    }
    res.json(updatedCareer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating career', error });
  }
};

export const deleteCareer = async (req: Request, res: Response) => {
  try {
    const deletedCareer = await Career.findByIdAndDelete(req.params.id);
    if (!deletedCareer) {
      return res.status(404).json({ message: 'Career not found' });
    }
    res.json({ message: 'Career deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting career', error });
  }
};