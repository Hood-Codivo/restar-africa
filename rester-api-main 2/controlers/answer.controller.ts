import { Request, Response } from 'express';
import Answer from '../models/community.answer.model';
import mongoose from 'mongoose';
import userModel from '../models/user_model';

export const getAnswers = async (req: Request, res: Response): Promise<void> => {
    try {
        const answers = await Answer.find({ questionId: req.params.id }).sort({ createdAt: -1 });
        res.json(answers); 
    } catch (error) {
        res.status(500).json({ message: 'Error fetching answers', error });
    }
};

export const createAnswer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content, author } = req.body;
        const answer = new Answer({
            questionId: req.params.id,
            content,
            author,
            likes: 0,
        });
        await answer.save();
        res.status(201).json(answer);
    } catch (error) {
        res.status(500).json({ message: 'Error creating answer', error });
    }
};

// export const likeAnswer = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const answer = await Answer.findOne({ _id: req.params.id });

//         if (!answer) {
//             res.status(404).json({ message: 'Answer not found' });
//             return;
//         }
//         answer.likes += 1;
//         await answer.save();
//         res.json(answer);
//     } catch (error) {
//         res.status(500).json({ message: 'Error liking answer', error });
//     }
// };

export const likeAnswer = async (req: Request, res: Response) => {
    try {
        const likesId = req.params.id;
        const { userId } = req.body; // Destructure `userId` directly from `req.body`

        // Check if `storyId` and `userId` are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(likesId)) {
            return res.status(400).json({ message: 'Invalid likes ID format' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const answer = await Answer.findById(likesId);
        if (!answer) {
            return res.status(404).json({ message: 'Answer not found' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Convert `userId` to a string for comparison with `story.likedBy` array
        const userIdStr = userId.toString();
        const hasLiked = answer.likedBy.some(id => id.toString() === userIdStr);

        if (hasLiked) {
            answer.likes -= 1;
            answer.likedBy = answer.likedBy.filter(id => id.toString() !== userIdStr);
        } else {
            answer.likes += 1;
            answer.likedBy.push(new mongoose.Types.ObjectId(userId));
        }

        const updatedStory = await answer.save();
        res.json(updatedStory);
    } catch (err) {
        console.error("Error in createLikes:", err);
        res.status(400).json({ message: err instanceof Error ? err.message : 'An unknown error occurred' });
    }
};