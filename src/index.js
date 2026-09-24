require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { calculateAllPortals } = require('./calculator');
const { initSupabase, loadFeeStore, getMeta, usingSupabase } = require('./feeStore');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initSupabase();

// Warm local cache on boot (instant responses)
loadFeeStore().catch(() => {});

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    supabase: usingSupabase(),
    feeSource: process.env.FEE_SOURCE || 'local',
  });
});

app.get('/api/meta', async (_req, res) => {
  try {
    const meta = await getMeta();
    res.set('Cache-Control', 'public, max-age=300');
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calculate', async (req, res) => {
  try {
    const {
      category,
      sellingPrice,
      costOfMaking,
      additionalCost,
      returnPercent,
      productGstPercent,
      weightKg,
      stepLevel,
    } = req.body || {};

    if (!category) {
      return res.status(400).json({ error: 'Product category is required' });
    }
    if (sellingPrice === undefined || sellingPrice === null || sellingPrice === '') {
      return res.status(400).json({ error: 'Selling price is required' });
    }

    const { store, source } = await loadFeeStore();
    const payload = calculateAllPortals(store, {
      category,
      sellingPrice: Number(sellingPrice),
      costOfMaking: Number(costOfMaking) || 0,
      additionalCost: Number(additionalCost) || 0,
      returnPercent: Number(returnPercent) || 0,
      productGstPercent: Number(productGstPercent) || 0,
      weightKg: Number(weightKg) || 0.5,
      stepLevel: stepLevel || 'standard',
    });

    res.set('Cache-Control', 'no-store');
    res.json({ source, ...payload });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Fee Calculator API running on http://localhost:${PORT}`);
  console.log(
    `Fee source: ${process.env.FEE_SOURCE || 'local'} | Supabase configured: ${usingSupabase()}`
  );
});
