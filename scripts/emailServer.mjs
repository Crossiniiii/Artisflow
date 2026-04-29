import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();

// Restrict CORS to known origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc) only in dev
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS not allowed'));
  }
}));
app.use(express.json({ limit: '100kb' }));

// Simple rate limiter (per IP, 10 requests per minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  next();
};

// API Key authentication middleware
const API_KEY = process.env.EMAIL_API_KEY;
const authMiddleware = (req, res, next) => {
  if (!API_KEY) {
    // If no key configured, allow in development only
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Email API key not configured' });
    }
    return next();
  }

  const provided = req.headers['x-api-key'] || req.query.apiKey;
  if (provided !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

app.post('/send-email', rateLimiter, authMiddleware, async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Basic input validation
  if (typeof to !== 'string' || to.length > 254 || !to.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (typeof subject !== 'string' || subject.length > 500) {
    return res.status(400).json({ error: 'Subject too long' });
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
  if (!API_KEY) console.warn('WARNING: EMAIL_API_KEY not set. Auth disabled in dev mode.');
});
