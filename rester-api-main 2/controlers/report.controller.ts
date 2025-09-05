import { Request, Response } from 'express';

import mongoose from 'mongoose';
import reportPropertyModel, { IReport } from '../models/report.property.model';

export const createReport = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId, reason, description } = req.body;
    const newReport: IReport = new reportPropertyModel({
      propertyId,
      userId,
      reason,
      description,
    });
    await newReport.save();
    res.status(201).json(newReport);
  } catch (error) {
    res.status(400).json({ message: 'Error creating report', error });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const reports:any = await reportPropertyModel.find().populate('propertyId userId');
    res.status(200).json(reports);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching reports', error });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    const deletedReport:any = await reportPropertyModel.findByIdAndDelete(id);
    if (!deletedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting report', error });
  }
};