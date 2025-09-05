import { NextFunction, Request, Response } from "express";
import NewsletterModel from "../models/newsletter.model";

export const subscribeNewsletter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name } = req.body;

        // Check for existing email before saving
        const existingSubscriber = await NewsletterModel.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ message: 'Email address already subscribed' });
        }

        const newsletter = new NewsletterModel({ email, name });
        await newsletter.save();
        res.status(201).json(newsletter);
    } catch (error) {
        // Handle other errors, including potential email sending errors
        console.error(error);
        return res.status(500).json({ message: 'Error creating newsletter subscription' });
    }
};

export const getNewsletter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const newsletters = await NewsletterModel.find().sort({ createdAt: -1 });
        res.json(newsletters);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching newsletter subscriptions', error });
    }
};

export const deleteNewsletter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        await NewsletterModel.findByIdAndDelete(id);
        res.json({ message: 'Newsletter subscription deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting newsletter subscription', error });
    }
}