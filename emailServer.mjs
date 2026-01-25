import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });

    console.log('Email sent', { to, subject, messageId: info.messageId });
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Email service listening on http://localhost:${port}`);
});
