import { NextFunction, Request, Response } from "express";
import PrivacyPolicyModel from "../models/privacypolicies.model";


// Routes
export const getPrivacyPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Find one policy, sorted by the most recent if needed
        const policy = await PrivacyPolicyModel.findOne().sort({ createdAt: -1 });

        if (!policy) {
            res.status(404).json({ success: false, message: 'No privacy policy found' });
            return;
        }
        // Return the policy as an object
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch policy', error: error.message });
    }
};


export const createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policy = new PrivacyPolicyModel(req.body)
        await policy.save();
        res.status(201).json({ success: true, data: policy });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({ success: false, message: 'Validation failed', errors: validationErrors });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create policy', error: error.message });
        }
    }
};


export const editPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { newPolicy } = req.body;

        // Log request body to check for issues
        console.log('Request Body:', req.body);

        // Fetch the current policy to compare pre-update data
        const existingPolicy = await PrivacyPolicyModel.findById(id);
        console.log('Existing Policy:', existingPolicy);

        if (!existingPolicy) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }

        // Update the policy with new data
        existingPolicy.title = newPolicy.title;
        existingPolicy.text = newPolicy.text;
        existingPolicy.isApproved = newPolicy.isApproved;

        // Save the updated policy
        const updatedPolicy = await existingPolicy.save();

        // Log updated policy for debugging
        console.log('Updated Policy:', updatedPolicy);

        // Compare request body and updated policy
        console.log('Differences:', {
            requestBody: newPolicy,
            updatedPolicy: updatedPolicy,
        });

        // Successfully updated policy
        res.status(200).json({ success: true, data: updatedPolicy });
    } catch (error: any) {
        // Validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors,
            });
        }

        // CastError when an invalid ObjectId is used
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: `Invalid policy ID format: ${error.value}`,
            });
        }

        // General server error
        return res.status(500).json({
            success: false,
            message: 'Failed to update policy',
            error: error.message,
        });
    }
};



// app.delete('/api/policies/:id', async (req, res) => {
export const deletePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const policy = await PrivacyPolicyModel.findByIdAndDelete(id);

        if (!policy) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }

        res.json({ success: true, message: 'Policy deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({ success: false, message: 'Invalid policy ID format' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to delete policy', error: error.message });
        }
    }
};

