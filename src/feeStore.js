const { createClient } = require('@supabase/supabase-js');
const {
  getLocalFeeStore,
  listPortals,
  listCategories,
} = require('./calculator');

let supabase = null;

function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    supabase = createClient(url, key);
    return true;
  }
  return false;
}

function usingSupabase() {
  return Boolean(supabase);
}

/**
 * Load fee store from Supabase when configured, else local JSON seed.
 * Shape matches fees.json so the calculator stays portal-agnostic.
 */
async function loadFeeStore() {
  if (!supabase) {
    return { store: getLocalFeeStore(), source: 'local' };
  }

  try {
    const [
      { data: portals, error: pErr },
      { data: settings, error: sErr },
      { data: categories, error: cErr },
      { data: referral, error: rErr },
      { data: closing, error: clErr },
      { data: weight, error: wErr },
    ] = await Promise.all([
      supabase.from('portals').select('*'),
      supabase.from('portal_settings').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('referral_fees').select('*, categories(name)'),
      supabase.from('closing_fees').select('*'),
      supabase.from('weight_handling_fees').select('*'),
    ]);

    if (pErr || sErr || cErr || rErr || clErr || wErr) {
      console.warn('Supabase load failed, using local seed:', {
        pErr,
        sErr,
        cErr,
        rErr,
        clErr,
        wErr,
      });
      return { store: getLocalFeeStore(), source: 'local-fallback' };
    }

    const store = {
      portals: portals || [],
      portal_settings: {},
      categories: {},
      referral_fees: {},
      closing_fees: {},
      weight_handling_fees: {},
    };

    for (const s of settings || []) {
      store.portal_settings[s.portal_id] = {
        fee_gst_percent: Number(s.fee_gst_percent),
      };
    }

    for (const c of categories || []) {
      if (!store.categories[c.portal_id]) store.categories[c.portal_id] = [];
      store.categories[c.portal_id].push(c.name);
    }

    for (const row of referral || []) {
      const portalId = row.portal_id;
      const catName = row.categories?.name;
      if (!catName) continue;
      if (!store.referral_fees[portalId]) store.referral_fees[portalId] = {};
      if (!store.referral_fees[portalId][catName]) {
        store.referral_fees[portalId][catName] = [];
      }
      store.referral_fees[portalId][catName].push({
        price_from: Number(row.price_from),
        price_to: Number(row.price_to),
        fee_percent: Number(row.fee_percent),
      });
    }

    for (const row of closing || []) {
      if (!store.closing_fees[row.portal_id]) {
        store.closing_fees[row.portal_id] = [];
      }
      store.closing_fees[row.portal_id].push({
        category_label: row.category_label,
        price_from: Number(row.price_from),
        price_to: Number(row.price_to),
        fee_inr: Number(row.fee_inr),
      });
    }

    for (const row of weight || []) {
      if (!store.weight_handling_fees[row.portal_id]) {
        store.weight_handling_fees[row.portal_id] = {};
      }
      if (!store.weight_handling_fees[row.portal_id][row.step_level]) {
        store.weight_handling_fees[row.portal_id][row.step_level] = {};
      }
      store.weight_handling_fees[row.portal_id][row.step_level][row.band_key] =
        Number(row.fee_inr);
    }

    return { store, source: 'supabase' };
  } catch (err) {
    console.warn('Supabase error, using local seed:', err.message);
    return { store: getLocalFeeStore(), source: 'local-fallback' };
  }
}

async function getMeta() {
  const { store, source } = await loadFeeStore();
  const portals = listPortals(store).map((p) => ({
    id: p.id,
    name: p.name,
    categories: listCategories(store, p.id),
  }));

  return {
    source,
    portals,
    stepLevels: [
      { id: 'premium_advanced', label: 'Premium & Advanced' },
      { id: 'standard', label: 'Standard' },
      { id: 'basic', label: 'Basic' },
    ],
    gstPresets: [0, 5, 12, 18, 28],
  };
}

module.exports = {
  initSupabase,
  usingSupabase,
  loadFeeStore,
  getMeta,
};
