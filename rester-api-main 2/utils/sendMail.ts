require('dotenv').config();
import nodemailer, { Transporter } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

interface EmailOption {
    email: string;
    subject: string;
    template: string;
    data: { [key: string]: any };
}

const sendEmail = async (options: EmailOption): Promise<void> => {
    const transporter: Transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'), // Corrected port number
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const { email, subject, template, data } = options;

    const templatePath = path.join(__dirname, '../mails/', template); // Fixed path joining

    // get the path to the email template with EJS
    const html: string = await ejs.renderFile(templatePath, data);

    const mailOptions = {
        from: process.env.SMTP_EMAIL, // Changed SMTP_MAIL to SMTP_EMAIL
        to: email,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

export default sendEmail;
