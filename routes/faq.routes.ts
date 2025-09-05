import express from 'express';
import { createFaq, deleteFaq, getFaqById, getFaqs, updateFaq } from '../controlers/faq.controller';


const faqRouter = express.Router();

faqRouter.post('/create-faq', createFaq);
faqRouter.get('/get-faq', getFaqs);
faqRouter.get('/getbyid/:id', getFaqById);
faqRouter.put('/edit-faq/:id', updateFaq);
faqRouter.delete('/delete-faq/:id', deleteFaq);

export default faqRouter; 