require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');

// Fail fast if critical secrets are missing/default
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-string') {
  console.error('❌ JWT_SECRET is missing or still set to the placeholder value. Set a real secret in .env before starting.');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH.includes('replace.this')) {
  console.error('❌ ADMIN_PASSWORD_HASH is missing or still the placeholder. Generate one and set it in .env before starting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '2mb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error('Not allowed by CORS'));
    },
  })
);

// Basic global rate limit
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Serve uploaded product images
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler (e.g. multer errors, CORS errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ findsy backend running on http://localhost:${PORT}`);
});
