-- Portals (Amazon, Flipkart, Myntra, ...)
CREATE TABLE IF NOT EXISTS portals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories per portal
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (portal_id, name)
);

-- Referral fee tiers (percentage of selling price)
CREATE TABLE IF NOT EXISTS referral_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price_from NUMERIC NOT NULL,
  price_to NUMERIC NOT NULL,
  fee_percent NUMERIC NOT NULL,
  UNIQUE (category_id, price_from, price_to)
);

-- Closing fees (fixed INR by price band)
CREATE TABLE IF NOT EXISTS closing_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  category_label TEXT NOT NULL DEFAULT 'All Products',
  price_from NUMERIC NOT NULL,
  price_to NUMERIC NOT NULL,
  fee_inr NUMERIC NOT NULL
);

-- Easy Ship / weight handling fee bands
CREATE TABLE IF NOT EXISTS weight_handling_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  step_level TEXT NOT NULL, -- premium_advanced | standard | basic
  band_key TEXT NOT NULL,   -- first_500g | 500g_1kg | 1kg_2kg | after_2kg | after_5kg
  band_label TEXT NOT NULL,
  fee_inr NUMERIC NOT NULL,
  UNIQUE (portal_id, step_level, band_key)
);

-- Marketplace GST on fees (typically 18%)
CREATE TABLE IF NOT EXISTS portal_settings (
  portal_id TEXT PRIMARY KEY REFERENCES portals(id) ON DELETE CASCADE,
  fee_gst_percent NUMERIC NOT NULL DEFAULT 18
);

CREATE INDEX IF NOT EXISTS idx_categories_portal ON categories(portal_id);
CREATE INDEX IF NOT EXISTS idx_referral_category ON referral_fees(category_id);
CREATE INDEX IF NOT EXISTS idx_closing_portal ON closing_fees(portal_id);
CREATE INDEX IF NOT EXISTS idx_weight_portal ON weight_handling_fees(portal_id);
