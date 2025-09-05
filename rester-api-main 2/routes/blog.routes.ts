import express from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  addcomment,
  createBlog,
  createCategory,
  deleteBlog,
  deleteCategory,
  editCategory,
  getAllBlogs,
  getAllCategory,
  getSingleBlog,
  searchPost,
  updateBlog,
} from "../controlers/blog.controller";

export const blogRouter = express.Router();

blogRouter.post("/create-blog", createBlog, authenticate, authorize("admin"));
blogRouter.post("/create-category", createCategory, authenticate);
blogRouter.put("/update-category/:id", editCategory, authenticate);
blogRouter.delete("/delete-category/:id", deleteCategory, authenticate);
blogRouter.get("/get-all-category", getAllCategory);
blogRouter.get("/get-all-blog", getAllBlogs);
blogRouter.get("/get-all-category", getAllCategory);
blogRouter.get("/get-single-blog/:id", getSingleBlog);
blogRouter.put("/update-blog/:id", updateBlog);
blogRouter.delete("/delete-single-blog/:id", deleteBlog);
blogRouter.post("/posts/comments/:id", addcomment);
blogRouter.get("/search", searchPost);
