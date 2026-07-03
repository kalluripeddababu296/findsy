const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function rowToProduct(row) {
  return {
    id: row.id,
    title: row.title,
    image: row.image,
    link: row.link,
    price: row.price,
    oldPrice: row.old_price,
    category: row.category,
    desc: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateProductBody(body, { partial = false } = {}) {
  const errors = [];
  const required = ['title', 'image', 'link'];

  if (!partial) {
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') {
        errors.push(`"${field}" is required`);
      }
    }
  }

  if (body.link) {
    try {
      new URL(body.link);
    } catch {
      errors.push('"link" must be a valid URL');
    }
  }

  return errors;
}

// GET /api/products — public, supports ?category=&search=&limit=&offset=
router.get('/', (req, res) => {
  const { category, search, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);
  const total = db
    .prepare('SELECT COUNT(*) as count FROM products')
    .get().count;

  res.json({
    products: rows.map(rowToProduct),
    total,
  });
});

// GET /api/products/categories — distinct category list for the chip bar
router.get('/categories', (req, res) => {
  const rows = db
    .prepare('SELECT DISTINCT category FROM products ORDER BY category ASC')
    .all();
  res.json({ categories: rows.map((r) => r.category) });
});

// GET /api/products/:id — public
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(rowToProduct(row));
});

// POST /api/products — admin only
router.post('/', requireAdmin, (req, res) => {
  const body = req.body || {};
  const errors = validateProductBody(body);
  if (errors.length) return res.status(400).json({ errors });

  const now = Date.now();
  const id = 'p_' + uuidv4();

  db.prepare(
    `INSERT INTO products (id, title, image, link, price, old_price, category, description, created_at, updated_at)
     VALUES (@id, @title, @image, @link, @price, @oldPrice, @category, @desc, @createdAt, @updatedAt)`
  ).run({
    id,
    title: body.title.trim(),
    image: body.image.trim(),
    link: body.link.trim(),
    price: body.price ? String(body.price).trim() : null,
    oldPrice: body.oldPrice ? String(body.oldPrice).trim() : null,
    category: body.category ? String(body.category).trim() : 'General',
    desc: body.desc ? String(body.desc).trim() : null,
    createdAt: now,
    updatedAt: now,
  });

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(rowToProduct(row));
});

// PUT /api/products/:id — admin only
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const body = req.body || {};
  const errors = validateProductBody(body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const updated = {
    title: body.title !== undefined ? String(body.title).trim() : existing.title,
    image: body.image !== undefined ? String(body.image).trim() : existing.image,
    link: body.link !== undefined ? String(body.link).trim() : existing.link,
    price: body.price !== undefined ? String(body.price).trim() : existing.price,
    oldPrice: body.oldPrice !== undefined ? String(body.oldPrice).trim() : existing.old_price,
    category: body.category !== undefined ? String(body.category).trim() : existing.category,
    desc: body.desc !== undefined ? String(body.desc).trim() : existing.description,
  };

  db.prepare(
    `UPDATE products SET
      title = @title, image = @image, link = @link, price = @price,
      old_price = @oldPrice, category = @category, description = @desc,
      updated_at = @updatedAt
     WHERE id = @id`
  ).run({ ...updated, updatedAt: Date.now(), id: req.params.id });

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(rowToProduct(row));
});

// DELETE /api/products/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, id: req.params.id });
});

module.exports = router;
