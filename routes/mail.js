import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();



router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
        secure: true,
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    
    await transporter.sendMail({
      from: `"Website Contact" <${process.env.EMAIL_USER}>`,
      to: 'lasuedsms@gmail.com', // where you receive the mail
      subject: `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Email failed' });
  }
});

export default router;
