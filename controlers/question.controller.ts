import { Request, Response } from 'express';
import Question from '../models/community.question.model';

export const getQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const questions = await Question.find().sort({ createdAt: -1 });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions', error });
    }
};

export const createQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content, author } = req.body;
        const question = new Question({
            title,
            content,
            author,
        });
        await question.save();
        res.status(201).json(question);
    } catch (error) {
        res.status(500).json({ message: 'Error creating question', error });
    }
};

export const getQuestionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const question = await Question.findOne({ _id: req.params.id });
        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching question', error });
    }
};