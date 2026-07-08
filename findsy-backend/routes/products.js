const express = require('express');
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
      if (!body[field] || String(body[field]).trim() === '') errors.push(`"${field}" is required`);
    }
  }
  if (body.link) {
    try { new URL(body.link); } catch { errors.push('"link" must be a valid URL'); }
  }
  return errors;
}

router.get('/', async (req,res)=>{try{
 const {category,search}=req.query;
 const limit=Number(req.query.limit)||100, offset=Number(req.query.offset)||0;
 const cond=[], vals=[]; let i=1;
 if(category&&category!=='All'){cond.push(`category=$${i++}`);vals.push(category);}
 if(search){cond.push(`(title ILIKE $${i} OR description ILIKE $${i+1})`);const t=`%${search}%`;vals.push(t,t);i+=2;}
 let q='SELECT * FROM products';
 if(cond.length) q+=' WHERE '+cond.join(' AND ');
 q+=` ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`;
 vals.push(limit,offset);
 const products=await db.query(q,vals);
 const ccond=[], cvals=[]; let ci=1;
 if(category&&category!=='All'){ccond.push(`category=$${ci++}`);cvals.push(category);}
 if(search){ccond.push(`(title ILIKE $${ci} OR description ILIKE $${ci+1})`);const t=`%${search}%`;cvals.push(t,t);}
 let cq='SELECT COUNT(*) AS count FROM products';
 if(ccond.length) cq+=' WHERE '+ccond.join(' AND ');
 const count=await db.query(cq,cvals);
 res.json({products:products.rows.map(rowToProduct),total:Number(count.rows[0].count)});
}catch(e){console.error(e);res.status(500).json({error:'Failed to fetch products'});}});

router.get('/categories', async(req,res)=>{try{
 const r=await db.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
 res.json({categories:r.rows.map(x=>x.category)});
}catch(e){console.error(e);res.status(500).json({error:'Failed to fetch categories'});}});

router.get('/:id', async(req,res)=>{try{
 const r=await db.query('SELECT * FROM products WHERE id=$1',[req.params.id]);
 if(!r.rows.length) return res.status(404).json({error:'Product not found'});
 res.json(rowToProduct(r.rows[0]));
}catch(e){console.error(e);res.status(500).json({error:'Failed to fetch product'});}});

router.post('/', requireAdmin, async(req,res)=>{try{
 const b=req.body||{}; const errors=validateProductBody(b); if(errors.length)return res.status(400).json({errors});
 const r=await db.query(`INSERT INTO products(title,image,link,price,old_price,category,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
 [b.title.trim(),b.image.trim(),b.link.trim(),b.price?String(b.price).trim():null,b.oldPrice?String(b.oldPrice).trim():null,b.category?String(b.category).trim():'General',b.desc?String(b.desc).trim():null]);
 res.status(201).json(rowToProduct(r.rows[0]));
}catch(e){console.error(e);res.status(500).json({error:'Failed to create product'});}});

router.put('/:id', requireAdmin, async(req,res)=>{try{
 const ex=await db.query('SELECT * FROM products WHERE id=$1',[req.params.id]);
 if(!ex.rows.length)return res.status(404).json({error:'Product not found'});
 const existing=ex.rows[0], b=req.body||{}; const errors=validateProductBody(b,{partial:true}); if(errors.length)return res.status(400).json({errors});
 const u={title:b.title!==undefined?String(b.title).trim():existing.title,image:b.image!==undefined?String(b.image).trim():existing.image,link:b.link!==undefined?String(b.link).trim():existing.link,price:b.price!==undefined?String(b.price).trim():existing.price,oldPrice:b.oldPrice!==undefined?String(b.oldPrice).trim():existing.old_price,category:b.category!==undefined?String(b.category).trim():existing.category,desc:b.desc!==undefined?String(b.desc).trim():existing.description};
 const r=await db.query(`UPDATE products SET title=$1,image=$2,link=$3,price=$4,old_price=$5,category=$6,description=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
 [u.title,u.image,u.link,u.price,u.oldPrice,u.category,u.desc,req.params.id]);
 res.json(rowToProduct(r.rows[0]));
}catch(e){console.error(e);res.status(500).json({error:'Failed to update product'});}});

router.delete('/:id', requireAdmin, async(req,res)=>{try{
 const r=await db.query('DELETE FROM products WHERE id=$1 RETURNING id',[req.params.id]);
 if(!r.rows.length)return res.status(404).json({error:'Product not found'});
 res.json({success:true,id:r.rows[0].id});
}catch(e){console.error(e);res.status(500).json({error:'Failed to delete product'});}});

module.exports=router;
