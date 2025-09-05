import { NextFunction, Request, Response } from "express";
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import userModel, { IUser } from "../models/user_model";
import sendEmail from "../utils/sendMail";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import EmailModel from "../models/email.models";
import ejs from 'ejs'
import path from "path";

export const sendUserEmails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { subject, message } = req.body;

        const adminEmail = 'support@akiba.com';

        try {
            const users: IUser[] = await userModel.find({}, 'email');

            // Filter out users without an email
            const validUsers = users.filter(user => user.email);
            const recipientEmails: string[] = validUsers.map(user => user.email);

            if (recipientEmails.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No recipients defined. No users found to send emails.',
                });
            }

            const data = {
                from: adminEmail,
                to: recipientEmails.join(', '),
                subject: subject || 'Your Subject Here',
                text: message || 'Your Message Here',
            };

            const html = await ejs.renderFile(path.join(__dirname, "../mails/batch-email.ejs"), data);

            // Send email to each valid user individually
            for (const user of validUsers) {
                try {
                    await sendEmail({
                        email: user.email,
                        subject: subject,
                        template: 'batch-email.ejs',
                        data,
                    });
                    console.log(`Email sent to ${user.email}`);
                } catch (error: any) {
                    console.error(`Failed to send email to ${user.email}:`, error.message);
                    return next(new ErrorHandler(error.message, 400));
                }
            }

            const createdEmail = await EmailModel.create({
                from: adminEmail,
                to: recipientEmails.join(', '),
                subject: subject || 'Your Subject Here',
                message: message || 'Your Message Here',
            });

            res.status(201).json({
                success: true,
                message: 'Email sent and created successfully!',
                createdEmail,
            });

        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ error: error.message });
        }
    } catch (error) {
        console.error('Error:', error.message);
        return next(new ErrorHandler(error.message, 400));
    }
};


// Get all email messages
export const getAllEmails = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const emails = await EmailModel.find();
        res.status(200).json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a blog post by ID
export const deleteEmail = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedEmail = await EmailModel.findByIdAndDelete(req.params.id);
        if (!deletedEmail) {
            return next(new ErrorHandler("Message not found", 500))
        }
        res.status(200).json({ success: true, message: 'Email deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export const downloadData = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Fetch all emails from the database
        const emails = await EmailModel.find({}).lean();

        // Create a temporary directory for the CSV file
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const csvFilePath = path.join(tempDir, 'emails.csv');

        // Set up the CSV writer
        const csvWriter = createObjectCsvWriter({
            path: csvFilePath,
            header: [
                { id: 'from', title: 'From' },
                { id: 'to', title: 'To' },
                { id: 'subject', title: 'Subject' },
                { id: 'message', title: 'Message' },
                { id: 'createdAt', title: 'Created At' },
                { id: 'updatedAt', title: 'Updated At' },
            ]
        });

        // Write the data to the CSV file
        await csvWriter.writeRecords(emails);

        // Set the appropriate headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=emails.csv');

        // Stream the file to the response
        const fileStream = fs.createReadStream(csvFilePath);
        fileStream.pipe(res);

        // Delete the file after sending
        fileStream.on('close', () => {
            fs.unlink(csvFilePath, (err) => {
                if (err) console.error('Error deleting temporary CSV file:', err);
            });
        });
    } catch (error) {
        console.error('Error generating CSV:', error);
        res.status(500).json({ message: 'Error generating CSV file' });
    }
})