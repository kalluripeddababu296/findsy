/**
 * Optional: seeds a couple of demo products so the shop isn't empty on first run.
 * Run with: npm run seed
 */
require('dotenv').config();
const db = require('./index');
const { v4: uuidv4 } = require('uuid');

const demoProducts = [
  {
    title: 'Sony WH-1000XM5 Wireless Headphones',
    image: 'https://placehold.co/400x400/1b171f/6b6472?text=Headphones',
    link: 'https://example.com/affiliate/headphones',
    price: '$279.99',
    oldPrice: '$399.99',
    category: 'Electronics',
    desc: 'Industry-leading noise cancellation, 30hr battery life.',
  },
  {
    title: 'Nike Air Zoom Pegasus 40',
    image: 'https://placehold.co/400x400/1b171f/6b6472?text=Shoes',
    link: 'https://example.com/affiliate/shoes',
    price: '$89.99',
    oldPrice: '$130.00',
    category: 'Fashion',
    desc: 'Responsive cushioning for everyday runs.',
  },
];

const insert = db.prepare(`
  INSERT INTO products (id, title, image, link, price, old_price, category, description, created_at, updated_at)
  VALUES (@id, @title, @image, @link, @price, @oldPrice, @category, @desc, @createdAt, @updatedAt)
`);

const now = Date.now();
for (const p of demoProducts) {
  insert.run({ id: 'p_' + uuidv4(), createdAt: now, updatedAt: now, ...p });
}

console.log(`✅ Seeded ${demoProducts.length} demo products.`);
