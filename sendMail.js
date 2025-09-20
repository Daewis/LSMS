import express from 'express';
import nodemailer from 'nodemailer';


const router = express.Router();

// --- Nodemailer Transporter Setup (for real email sending) ---
// IMPORTANT: Use environment variables for sensitive data like email user and password.
// For Gmail or Google Workspace accounts with 2FA enabled, use an App Password.
const transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
        
        user: 'davidabokunwa@gmail.com',
       // user: process.env.EMAIL_USER, 
       // pass: process.env.EMAIL_PASS, 
        pass: 'bjumlklxwbyoqqld '
    },
});

function sendMail(to,sub,msg){
    transporter.sendMail({
        to: to,
        subject: sub,
        html: msg
    })
    console.log('Email sent');
};

sendMail("davidabokunwa@gmail.com", "This is subject", "This is message")


export default router;
