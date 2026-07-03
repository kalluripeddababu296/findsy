const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/upload — admin only, multipart/form-data field name "image"
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  try {
    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Resize + re-encode as optimized JPEG (mirrors the frontend's canvas resize logic)
    await sharp(req.file.buffer)
      .resize({ width: 640, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toFile(filepath);

    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    res.status(201).json({ url: publicUrl, filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process image', detail: err.message });
  }
});

module.exports = router;
