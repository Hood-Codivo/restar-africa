import { NextFunction, Request, Response } from "express";
import cloudinary from "cloudinary"
import Post from "../models/blog.model";
import Comment from "../models/blog.comment.model";
import Category from "../models/blog.category.model";


// Create a new post
export const createBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
        const data = req.body;
        const thumbnail = data.image;
        if (thumbnail) {
            const myCloud = await cloudinary.v2?.uploader.upload(thumbnail, {
                folder: "post"
            });
            data.image = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        const post = await Post.create(req.body);

        res.status(201).json({ success: true, message: "Post created successfully", data: post });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Create a new post
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({
            success: false,
            message: 'Category name is required.',
          });
        }
    
        const newCategory = new Category({ name });
        await newCategory.save();
    
        res.status(201).json({
          success: true,
          message: 'Category created successfully.',
          category: newCategory,
        });
      } catch (error) {
        if (error.code === 11000) { // Duplicate key error
          return res.status(409).json({
            success: false,
            message: 'A category with this name already exists.',
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to create category.',
          error: error.message,
        });
      }
};

export const editCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
    
        if (!name) {
          return res.status(400).json({
            success: false,
            message: 'Category name is required.',
          });
        }
    
        const updatedCategory = await Category.findByIdAndUpdate(
          id,
          { name },
          { new: true, runValidators: true }
        );
    
        if (!updatedCategory) {
          return res.status(404).json({
            success: false,
            message: 'Category not found.',
          });
        }
    
        res.status(200).json({
          success: true,
          message: 'Category updated successfully.',
          category: updatedCategory,
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message: 'A category with this name already exists.',
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update category.',
          error: error.message,
        });
      }
};


export const getAllCategory = async (reqq: Request, res: Response, next: NextFunction) => {
    try {
        const result = await Category.find()
        res.json(result) 
    } catch (error) {
        res.status(402).json({ success: false, error: error.message })
    }
}

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const deletedCategory = await Category.findByIdAndDelete(id);
    
        if (!deletedCategory) {
          return res.status(404).json({
            success: false,
            message: 'Category not found.',
          });
        }
    
        res.status(200).json({
          success: true,
          message: 'Category deleted successfully.',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete category.',
          error: error.message,
        });
      }
}


// Get all posts
export const getAllBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const posts = await Post.find().populate('author', 'username').populate('categories', 'name').sort({ createdAt: -1 });;;
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Get a single post
export const getSingleBlog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username')
            .populate('categories', 'name')
            .populate({
                path: 'comments',
                populate: [
                    { path: 'author', select: 'username' },
                    {
                        path: 'replies',
                        populate: { path: 'author', select: 'username' }
                    }
                ]
            });
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update a post
export const updateBlog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.image;
        const postId = req.params.id;
        const postData = await Post.findById(postId) as any;

        if (thumbnail && typeof thumbnail === 'string' && !thumbnail.startsWith("https")) {
            if (postData.image && postData.image.public_id) {
                await cloudinary.v2.uploader.destroy(postData.image.public_id);
            }

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "post"
            });
            data.image = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        } else if (!thumbnail) {
            delete data.image; // Remove thumbnail if not provided
        }

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            {
                $set: data,
            },
            {
                new: true
            });

        res.status(201).json({
            success: true,
            updatedPost,
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};


// Delete a post
export const deleteBlog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add a comment
export const addcomment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = new Comment({
            content: req.body.content,
            author: req.body.author,
            post: post._id,
            parentComment: req.body.parentComment
        });

        const savedComment = await comment.save();

        if (req.body.parentComment) {
            const parentComment = await Comment.findById(req.body.parentComment);
            parentComment.replies.push(savedComment._id);
            await parentComment.save();
        } else {
            post.comments.push(savedComment._id);
            await post.save();
        }

        res.status(201).json(savedComment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }

};

// Search posts
export const searchPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query }: any = req.query;
        const posts = await Post.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        }).populate('author', 'username').populate('categories', 'name');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
