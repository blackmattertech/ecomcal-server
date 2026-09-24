const { createClient } = require('@supabase/supabase-js');
const {
  getLocalFeeStore,
  listPortals,
  listCategories,
} = require('./calculator');

const CACHE_TTL_MS = Number(process.env.FEE_CACHE_TTL_MS) || 15 * 60 * 1000;
// local = instant (default). supabase = always read DB (slower).
const FEE_SOURCE = (process.env.FEE_SOURCE || 'local').toLowerCase();

let supabase = null;
let cache = null; // { store, source, fetchedAt }
let refreshPromise = null;

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

function cacheValid() {
  return cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

function setCache(store, source) {
  cache = { store, source, fetchedAt: Date.now() };
  return cache;
}

async function fetchFromSupabase() {
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
    throw new Error(
      [pErr, sErr, cErr, rErr, clErr, wErr]
        .filter(Boolean)
        .map((e) => e.message)
        .join('; ')
    );
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

  return store;
}

function refreshSupabaseInBackground() {
  if (!supabase || refreshPromise) return;
  refreshPromise = fetchFromSupabase()
    .then((store) => setCache(store, 'supabase'))
    .catch((err) => {
      console.warn('Background Supabase refresh failed:', err.message);
    })
    .finally(() => {
      refreshPromise = null;
    });
}

/**
 * Fast path: local JSON (or memory cache).
 * Optionally refreshes from Supabase in the background when configured.
 */
async function loadFeeStore() {
  if (cacheValid()) {
    return { store: cache.store, source: cache.source };
  }

  // Prefer local for speed unless explicitly forced to supabase
  if (FEE_SOURCE !== 'supabase') {
    const local = setCache(getLocalFeeStore(), 'local');
    if (supabase) refreshSupabaseInBackground();
    return { store: local.store, source: local.source };
  }

  if (!supabase) {
    const local = setCache(getLocalFeeStore(), 'local');
    return { store: local.store, source: local.source };
  }

  try {
    if (!refreshPromise) {
      refreshPromise = fetchFromSupabase()
        .then((store) => setCache(store, 'supabase'))
        .finally(() => {
          refreshPromise = null;
        });
    }
    const result = await refreshPromise;
    return { store: result.store, source: result.source };
  } catch (err) {
    console.warn('Supabase load failed, using local seed:', err.message);
    const local = setCache(getLocalFeeStore(), 'local-fallback');
    return { store: local.store, source: local.source };
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
