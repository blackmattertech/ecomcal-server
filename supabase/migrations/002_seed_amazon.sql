-- Seed Amazon portal + fee tables

INSERT INTO portals (id, name, is_active) VALUES
  ('amazon', 'Amazon', true),
  ('flipkart', 'Flipkart', false),
  ('myntra', 'Myntra', false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO portal_settings (portal_id, fee_gst_percent) VALUES
  ('amazon', 18)
ON CONFLICT (portal_id) DO UPDATE SET fee_gst_percent = EXCLUDED.fee_gst_percent;

-- Categories
INSERT INTO categories (portal_id, name) VALUES
  ('amazon', 'Apparel - Sweat Shirts and Jackets'),
  ('amazon', 'Apparel - Shorts'),
  ('amazon', 'Apparel - Men''s T-shirts (except Polos, Tank tops and full sleeve tops)'),
  ('amazon', 'Apparel - Shirts'),
  ('amazon', 'Pants - Trousers, Jeans, Trackpants and Leggings'),
  ('amazon', 'Backpacks, Laptop Sleeves and Bags')
ON CONFLICT (portal_id, name) DO NOTHING;

-- Referral fees
INSERT INTO referral_fees (portal_id, category_id, price_from, price_to, fee_percent)
SELECT 'amazon', c.id, v.price_from, v.price_to, v.fee_percent
FROM (VALUES
  ('Apparel - Sweat Shirts and Jackets', 0, 999, 0),
  ('Apparel - Sweat Shirts and Jackets', 1000, 9999, 18),
  ('Apparel - Shorts', 0, 999, 0),
  ('Apparel - Shorts', 1000, 9999, 24),
  ('Apparel - Men''s T-shirts (except Polos, Tank tops and full sleeve tops)', 0, 999, 0),
  ('Apparel - Men''s T-shirts (except Polos, Tank tops and full sleeve tops)', 1000, 9999, 23),
  ('Apparel - Shirts', 0, 999, 0),
  ('Apparel - Shirts', 1000, 9999, 21),
  ('Pants - Trousers, Jeans, Trackpants and Leggings', 0, 999, 0),
  ('Pants - Trousers, Jeans, Trackpants and Leggings', 1000, 9999, 19),
  ('Backpacks, Laptop Sleeves and Bags', 0, 999, 0),
  ('Backpacks, Laptop Sleeves and Bags', 1000, 9999, 14.5)
) AS v(name, price_from, price_to, fee_percent)
JOIN categories c ON c.portal_id = 'amazon' AND c.name = v.name
ON CONFLICT (category_id, price_from, price_to) DO UPDATE
  SET fee_percent = EXCLUDED.fee_percent;

-- Closing fees
DELETE FROM closing_fees WHERE portal_id = 'amazon';
INSERT INTO closing_fees (portal_id, category_label, price_from, price_to, fee_inr) VALUES
  ('amazon', 'All Products', 0, 300, 27),
  ('amazon', 'All Products', 301, 500, 23),
  ('amazon', 'All Products', 501, 1000, 30),
  ('amazon', 'All Products', 1000, 9999, 55);

-- Weight handling fees
DELETE FROM weight_handling_fees WHERE portal_id = 'amazon';
INSERT INTO weight_handling_fees (portal_id, step_level, band_key, band_label, fee_inr) VALUES
  -- Premium and Advanced
  ('amazon', 'premium_advanced', 'first_500g', 'First 500 g', 53),
  ('amazon', 'premium_advanced', '500g_1kg', '500g - 1kg', 73),
  ('amazon', 'premium_advanced', '1kg_2kg', '1kg - 2kg', 110),
  ('amazon', 'premium_advanced', 'after_2kg', 'Each additional kg after 2 Kg', 34),
  ('amazon', 'premium_advanced', 'after_5kg', 'Each additional kg after 5 Kg', 18),
  -- Standard
  ('amazon', 'standard', 'first_500g', 'First 500 g', 55),
  ('amazon', 'standard', '500g_1kg', '500g - 1kg', 75),
  ('amazon', 'standard', '1kg_2kg', '1kg - 2kg', 112),
  ('amazon', 'standard', 'after_2kg', 'Each additional kg after 2 kg', 34),
  ('amazon', 'standard', 'after_5kg', 'Each additional kg after 5 kg', 18),
  -- Basic
  ('amazon', 'basic', 'first_500g', 'First 500 g', 59),
  ('amazon', 'basic', '500g_1kg', '500g - 1kg', 79),
  ('amazon', 'basic', '1kg_2kg', '1kg - 2kg', 116),
  ('amazon', 'basic', 'after_2kg', 'Each additional kg after 2 kg', 34),
  ('amazon', 'basic', 'after_5kg', 'Each additional kg after 5 kg', 18);
