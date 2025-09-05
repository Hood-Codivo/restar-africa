import express from 'express';
import { deleteEmail, downloadData, getAllEmails, sendUserEmails } from '../controlers/email.controller';
import { authenticate, authorize } from '../middleware/auth';


const emailRouter = express.Router();

emailRouter.get('/get-messages', authenticate, authorize("admin"), getAllEmails);
emailRouter.delete('/delete-message/:id', authenticate, authorize("admin"), deleteEmail);
emailRouter.post('/send-general-email', authenticate, sendUserEmails);
emailRouter.get('/download-csv', authenticate, downloadData)

export default emailRouter;