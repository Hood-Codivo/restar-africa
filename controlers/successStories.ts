// routes/successStories.ts
import { Request, Response, NextFunction } from "express";
// If your model file is named 'successStory.ts', update the import path and casing:
import SuccessStory, { ISuccessStory } from "../models/successStory.model";
// Or, if the file is in a different location, update the path accordingly:
// import SuccessStory, { ISuccessStory } from "../models/SuccessStory.model";
import mongoose from "mongoose";
import userModel from "../models/user_model";

// GET all success stories
export const getSuccessStories = async (req: Request, res: Response) => {
  try {
    const stories = await SuccessStory.find();
    res.json(stories);
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
};

// GET a single success story
export const getSingleSuccessStory = async (req: Request, res: Response) => {
  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    res.json(story);
  } catch (error) {
    res.status(500).json({ message: "Error fetching story", error });
  }
};

// POST a new success story

export const createSuccessStories = async (req: Request, res: Response) => {
  const story = new SuccessStory({
    name: req.body.name,
    location: req.body.location,
    userId: req.body.userId,
    image: req.body.image,
    avatar: req.body.avatar,
    title: req.body.title,
    snippet: req.body.snippet,
    content: req.body.content,
    rating: req.body.rating,
    category: req.body.category,
  });

  try {
    const newStory = await story.save();
    res.status(201).json(newStory);
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
};

// UPDATE a success story
export const updateSuccessStory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data } = req.body; // Extract the data object from req.body
  const { title, snippet, content, category, image } = data; // Destructure from data

  try {
    // Validate input fields
    if (!title || !snippet || !content || !category) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Check if `id` is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid story ID format" });
    }

    // Find the story by ID
    const story = await SuccessStory.findById(id);
    if (!story) {
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });
    }

    // Update the story
    const updatedStory = await SuccessStory.findByIdAndUpdate(
      id,
      { title, snippet, content, category, image },
      { new: true, runValidators: true }
    );

    if (!updatedStory) {
      return res
        .status(400)
        .json({ success: false, message: "Story could not be updated" });
    }

    res.status(200).json({ success: true, data: updatedStory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE a success story
export const deleteSuccessStory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const story = await SuccessStory.findByIdAndDelete(id);

    if (!story) {
      return res
        .status(404)
        .json({ success: false, message: "Story not found" });
    }

    res.json({ success: true, message: "Success story deleted" });
  } catch (error) {
    if (error.name === "CastError") {
      res
        .status(400)
        .json({ success: false, message: "Invalid story ID format" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to delete story",
        error: error.message,
      });
    }
  }
};

export const createLikes = async (req: Request, res: Response) => {
  try {
    const storyId = req.params.id;
    const { userId } = req.body; // Destructure `userId` directly from `req.body`

    // Check if `storyId` and `userId` are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ message: "Invalid story ID format" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const story = await SuccessStory.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert `userId` to a string for comparison with `story.likedBy` array
    const userIdStr = userId.toString();
    const hasLiked = story.likedBy.some(
      (id: mongoose.Types.ObjectId) => id.toString() === userIdStr
    );

    if (hasLiked) {
      story.likes -= 1;
      story.likedBy = story.likedBy.filter(
        (id: mongoose.Types.ObjectId) => id.toString() !== userIdStr
      );
    } else {
      story.likes += 1;
      story.likedBy.push(new mongoose.Types.ObjectId(userId));
    }

    const updatedStory = await story.save();
    res.json(updatedStory);
  } catch (err) {
    console.error("Error in createLikes:", err);
    res.status(400).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
};

// Add a comment to a success story
// router.post('/:id/comment', getSuccessStory, async (req: Request, res: Response) => {

export const addComment = async (req: Request, res: Response) => {
  const comment = {
    name: req.body.name,
    content: req.body.content,
    createdAt: new Date(),
  };

  console.log(comment, "dhdh");

  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Add the new comment to the story's comments array
    story.comments.push(comment);

    const updatedStory = await story.save();
    res.status(201).json(updatedStory);
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
};

// GET /api/success-stories?userId=:userId
export const getStoriesByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const successStories = await SuccessStory.find({ userId });

    if (!successStories) {
      return res
        .status(404)
        .json({ message: "No success stories found for this user." });
    }

    res.status(200).json(successStories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve success stories.",
      error: error.message,
    });
  }
};

export const getSuccessStory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let successStory: ISuccessStory | null;

  try {
    successStory = await SuccessStory.findById(req.params.id);

    if (successStory == null) {
      return res.status(404).json({ message: "Cannot find success story" });
    }
  } catch (err) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }

  res.locals.successStory = successStory;
  next();
};
