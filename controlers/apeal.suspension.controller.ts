import { Request, Response } from 'express';
import userModel from '../models/user_model';
import { Appeal, IAppeal } from '../models/suspension.apeal.model';

export const appealSuspension = async (req: Request, res: Response) => {
    const { userId, reason, additionalInfo } = req.body;

    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isSuspend) {
            return res.status(400).json({ message: 'User account is not suspended' });
        }

        const appeal = new Appeal({
            user: userId,
            reason,
            additionalInfo,
            status: 'pending',
        });

        await appeal.save();

        res.status(201).json({
            message: 'Appeal submitted successfully',
            appealId: appeal._id,
        });
    } catch (error) {
        console.error('Appeal submission error:', error);
        res.status(500).json({ message: 'An error occurred while submitting the appeal' });
    }
};


export const updateAppealStatus = async (req: Request, res: Response) => {

    const { appealId } = req.params;
    const { status } = req.body;

    try { 
        const appeal = await Appeal.findById(appealId);
        if (!appeal) {
            return res.status(404).json({ message: 'Appeal not found' });
        }

        appeal.status = status as IAppeal['status'];
        await appeal.save();

        // If the appeal is approved, unsuspend the user
        if (status === 'approved') {
            const user = await userModel.findById(appeal.user);
            if (user) {
                user.isSuspend = false;
                user.reason == "";
                await user.save();
            }
        }

        res.status(200).json({
            message: 'Appeal status updated successfully',
            appeal: {
                id: appeal._id,
                status: appeal.status,
            },
        });
    } catch (error) {
        console.error('Appeal status update error:', error);
        res.status(500).json({ message: 'An error occurred while updating the appeal status' });
    }
};


export const getAppeal = async (req: Request, res: Response) => {
  
    const { appealId } = req.params;
  
    try {
      const appeal = await Appeal.findById(appealId).populate('user', 'username email');
      if (!appeal) {
        return res.status(404).json({ message: 'Appeal not found' });
      }
  
      // Check if the user is an admin or the appeal owner
      const requestingUserId = (req as any).user.id;
      if (requestingUserId !== appeal.user._id.toString() && (req as any).user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
  
      res.status(200).json({ appeal });
    } catch (error) {
      console.error('Get appeal error:', error);
      res.status(500).json({ message: 'An error occurred while fetching the appeal' });
    }
  };
  
  export const getAllAppeals = async (req: Request, res: Response) => {
    try {
      const appeals = await Appeal.find().populate('user', 'username email');
      res.status(200).json({ appeals });
    } catch (error) {
      console.error('Get all appeals error:', error);
      res.status(500).json({ message: 'An error occurred while fetching appeals' });
    }
  };
  
  export const deleteAppeal = async (req: Request, res: Response) => {
   
    const { appealId } = req.params;
  
    try {
      const appeal = await Appeal.findByIdAndDelete(appealId);
      if (!appeal) {
        return res.status(404).json({ message: 'Appeal not found' });
      }
  
      res.status(200).json({ message: 'Appeal deleted successfully' });
    } catch (error) {
      console.error('Delete appeal error:', error);
      res.status(500).json({ message: 'An error occurred while deleting the appeal' });
    }
  };