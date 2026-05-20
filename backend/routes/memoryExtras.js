// routes/memoryExtras.js — drill-down + time-travel queries
const express=require('express');
const pool=require('../config/database');
const router=express.Router();
router.get('/subjects/:name/memories', async (req,res)=>{
  try {
    const r=await pool.query('SELECT * FROM memories WHERE subject=$1 ORDER BY COALESCE(embedded_at, created_at) DESC, id DESC',[req.params.name]);
    res.json(r.rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});
router.get('/memories', async (req,res)=>{
  try {
    const asOf=req.query.as_of;
    if(asOf){
      const r=await pool.query('SELECT * FROM memories WHERE (COALESCE(embedded_at, created_at) <= $1::timestamptz) ORDER BY COALESCE(embedded_at, created_at) DESC, id DESC LIMIT 200',[asOf+'T23:59:59Z']);
      return res.json(r.rows);
    }
    const r=await pool.query('SELECT * FROM memories ORDER BY id DESC LIMIT 200');
    res.json(r.rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});
module.exports=router;