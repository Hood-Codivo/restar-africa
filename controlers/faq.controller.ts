import { Request, Response } from 'express';
import helpFaqModel from '../models/help.faq.model';


export const createFaq = async (req: Request, res: Response) => {
    try {
        const faq = new helpFaqModel(req.body);
        await faq.save();
        res.status(201).json(faq);
    } catch (error) {
        res.status(400).json({ message: 'Error creating FAQ', error });
    }
};

export const getFaqs = async (req: Request, res: Response) => {
    try {
        const faqs = await helpFaqModel.find();
        res.status(200).json(faqs);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching FAQs', error });
    }
};

export const updateFaq = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updatedFaq = await helpFaqModel.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedFaq);
    } catch (error) {
        res.status(400).json({ message: 'Error updating FAQ', error });
    }
};

export const deleteFaq = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await helpFaqModel.findByIdAndDelete(id);
        res.status(200).json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting FAQ', error });
    }
};

export const getFaqById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const faq = await helpFaqModel.findById(id);
        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found' });
        }
        res.status(200).json(faq);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching FAQ', error });
    }
};