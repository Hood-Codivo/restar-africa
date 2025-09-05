import express from 'express'
import { deleteNewsletter, getNewsletter, subscribeNewsletter } from '../controlers/newsletter.controller';
import { authenticate } from '../middleware/auth';

export const newsletterRouter = express.Router();

newsletterRouter.post('/subscribe', subscribeNewsletter)
newsletterRouter.get('/get-all-newsletter', authenticate, getNewsletter)
newsletterRouter.delete('/delete-newsletter/:id', deleteNewsletter, authenticate)
