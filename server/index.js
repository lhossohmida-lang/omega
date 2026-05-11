// Local development server — Vercel-equivalent endpoints for npm run server
// In production, Vercel serverless functions in /api/ are used instead.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import chatHandler from '../api/admin-ai/chat.js';
import executeHandler from '../api/admin-ai/execute-action.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'تم تجاوز الحد الأقصى للطلبات. انتظر قليلاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Wrap Vercel handlers as Express routes
function wrap(handler) {
  return async (req, res) => {
    // Vercel-style: req.body (already parsed), res.status().json()
    await handler(req, res);
  };
}

app.post('/api/admin-ai/chat', aiLimiter, wrap(chatHandler));
app.post('/api/admin-ai/execute-action', wrap(executeHandler));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 OMEGA Backend Server running on port ${PORT}`);
});
