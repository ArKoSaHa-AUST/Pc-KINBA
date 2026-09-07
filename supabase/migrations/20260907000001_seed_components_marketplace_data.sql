-- Migration: 20260907000001_seed_components_marketplace_data.sql
-- Description: Authentic seed data for PC Components Marketplace

DO $$
DECLARE
  -- Category IDs
  cat_cpu UUID;
  cat_cpu_amd UUID;
  cat_cpu_intel UUID;
  cat_gpu UUID;
  cat_gpu_nvidia UUID;
  cat_gpu_amd UUID;
  cat_mb UUID;
  cat_mb_amd UUID;
  cat_mb_intel UUID;
  cat_ram UUID;
  cat_ram_ddr5 UUID;
  cat_ram_ddr4 UUID;
  cat_storage UUID;
  cat_storage_nvme UUID;
  cat_psu UUID;
  cat_psu_mod UUID;
  cat_case UUID;
  cat_cooler UUID;
  cat_cooler_liquid UUID;
  cat_cooler_air UUID;
  cat_monitor UUID;
  cat_keyboard UUID;
  cat_mouse UUID;
  cat_headphone UUID;

  -- Brand IDs
  br_amd UUID;
  br_intel UUID;
  br_nvidia UUID;
  br_asus UUID;
  br_msi UUID;
  br_gigabyte UUID;
  br_corsair UUID;
  br_gskill UUID;
  br_samsung UUID;
  br_kingston UUID;
  br_deepcool UUID;
  br_nzxt UUID;
  br_seasonic UUID;
  br_lianli UUID;
  br_logitech UUID;
  br_razer UUID;

  -- Product IDs
  prod_id UUID;
BEGIN
  -- 1. Insert Brands
  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('AMD', 'amd', 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_amd;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Intel', 'intel', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_intel;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('NVIDIA', 'nvidia', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_nvidia;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('ASUS', 'asus', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_asus;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('MSI', 'msi', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_msi;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Gigabyte', 'gigabyte', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_gigabyte;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Corsair', 'corsair', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_corsair;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('G.Skill', 'g-skill', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_gskill;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Samsung', 'samsung', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_samsung;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Kingston', 'kingston', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_kingston;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('DeepCool', 'deepcool', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_deepcool;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('NZXT', 'nzxt', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_nzxt;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Seasonic', 'seasonic', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_seasonic;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Lian Li', 'lian-li', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_lianli;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Logitech', 'logitech', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_logitech;

  INSERT INTO public.brands (name, slug, logo_url) VALUES
    ('Razer', 'razer', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100&auto=format&fit=crop&q=80')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO br_razer;

  -- 2. Insert Main Categories
  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Processor / CPU', 'cpu', 'Cpu', '#00e5ff', 1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_cpu;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Graphics Card / GPU', 'gpu', 'Zap', '#ef4444', 2)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_gpu;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Motherboard', 'motherboard', 'Layers', '#3b82f6', 3)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_mb;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('RAM / Memory', 'ram', 'HardDrive', '#10b981', 4)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_ram;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Storage (SSD/HDD)', 'storage', 'Database', '#f59e0b', 5)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_storage;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Power Supply (PSU)', 'psu', 'Activity', '#ec4899', 6)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_psu;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Casings', 'case', 'Box', '#8b5cf6', 7)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_case;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('CPU Cooler', 'cooler', 'Fan', '#06b6d4', 8)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_cooler;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Monitor', 'monitor', 'Monitor', '#6366f1', 9)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_monitor;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Keyboard', 'keyboard', 'Keyboard', '#14b8a6', 10)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_keyboard;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Gaming Mouse', 'mouse', 'Mouse', '#f97316', 11)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_mouse;

  INSERT INTO public.categories (name, slug, icon, accent_color, display_order) VALUES
    ('Headphones & Audio', 'headphone', 'Headphones', '#a855f7', 12)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cat_headphone;

  -- 3. Insert Subcategories
  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('AMD Processors', 'cpu-amd', cat_cpu, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_cpu_amd;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Intel Processors', 'cpu-intel', cat_cpu, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_cpu_intel;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('NVIDIA GeForce RTX', 'gpu-nvidia', cat_gpu, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_gpu_nvidia;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('AMD Radeon RX', 'gpu-amd', cat_gpu, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_gpu_amd;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('AMD Motherboards (AM5/AM4)', 'mb-amd', cat_mb, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_mb_amd;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Intel Motherboards (LGA1700)', 'mb-intel', cat_mb, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_mb_intel;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('DDR5 RAM', 'ram-ddr5', cat_ram, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_ram_ddr5;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('DDR4 RAM', 'ram-ddr4', cat_ram, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_ram_ddr4;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('M.2 NVMe SSD', 'ssd-nvme', cat_storage, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_storage_nvme;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Modular Power Supply', 'psu-modular', cat_psu, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_psu_mod;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('AIO Liquid Cooler', 'cooler-liquid', cat_cooler, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_cooler_liquid;

  INSERT INTO public.categories (name, slug, parent_id, display_order) VALUES
    ('Air Cooler', 'cooler-air', cat_cooler, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id RETURNING id INTO cat_cooler_air;

  -- 4. Insert Filters Configuration
  -- CPU filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_cpu, 'socket', 'Processor Socket', 'multi-select', '[{"label":"AM5 (AMD 7000/9000)","value":"AM5"},{"label":"LGA1700 (Intel 13/14th)","value":"LGA1700"},{"label":"AM4 (AMD 5000)","value":"AM4"},{"label":"LGA1851 (Intel Arrow Lake)","value":"LGA1851"}]'::jsonb, 1),
    (cat_cpu, 'cores', 'Core Count', 'multi-select', '[{"label":"6 Cores (12 Threads)","value":"6 Cores"},{"label":"8 Cores (16 Threads)","value":"8 Cores"},{"label":"12 Cores (24 Threads)","value":"12 Cores"},{"label":"14 Cores (20 Threads)","value":"14 Cores"},{"label":"16 Cores (32 Threads)","value":"16 Cores"},{"label":"20 Cores (28 Threads)","value":"20 Cores"},{"label":"24 Cores (32 Threads)","value":"24 Cores"}]'::jsonb, 2),
    (cat_cpu, 'series', 'Processor Series', 'select', '[{"label":"AMD Ryzen 7000","value":"Ryzen 7000"},{"label":"AMD Ryzen 9000","value":"Ryzen 9000"},{"label":"Intel Core 14th Gen","value":"Core 14th Gen"},{"label":"Intel Core 13th Gen","value":"Core 13th Gen"}]'::jsonb, 3);

  -- GPU filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_gpu, 'chipset', 'Graphics Chipset', 'multi-select', '[{"label":"GeForce RTX 4090","value":"RTX 4090"},{"label":"GeForce RTX 4080 Super","value":"RTX 4080 Super"},{"label":"GeForce RTX 4070 Ti Super","value":"RTX 4070 Ti Super"},{"label":"GeForce RTX 4070 Super","value":"RTX 4070 Super"},{"label":"GeForce RTX 4060 Ti","value":"RTX 4060 Ti"},{"label":"GeForce RTX 4060","value":"RTX 4060"},{"label":"Radeon RX 7900 XTX","value":"RX 7900 XTX"},{"label":"Radeon RX 7800 XT","value":"RX 7800 XT"}]'::jsonb, 1),
    (cat_gpu, 'vram', 'VRAM Capacity', 'multi-select', '[{"label":"8 GB","value":"8GB"},{"label":"12 GB","value":"12GB"},{"label":"16 GB","value":"16GB"},{"label":"20 GB","value":"20GB"},{"label":"24 GB","value":"24GB"}]'::jsonb, 2),
    (cat_gpu, 'memory_type', 'Memory Type', 'select', '[{"label":"GDDR6X","value":"GDDR6X"},{"label":"GDDR6","value":"GDDR6"}]'::jsonb, 3);

  -- Motherboard filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_mb, 'socket', 'CPU Socket', 'multi-select', '[{"label":"Socket AM5","value":"AM5"},{"label":"LGA1700","value":"LGA1700"},{"label":"Socket AM4","value":"AM4"}]'::jsonb, 1),
    (cat_mb, 'chipset', 'Chipset', 'multi-select', '[{"label":"AMD B650","value":"B650"},{"label":"AMD X670E","value":"X670E"},{"label":"Intel Z790","value":"Z790"},{"label":"Intel B760","value":"B760"}]'::jsonb, 2),
    (cat_mb, 'form_factor', 'Form Factor', 'multi-select', '[{"label":"ATX","value":"ATX"},{"label":"Micro-ATX","value":"Micro-ATX"},{"label":"Mini-ITX","value":"Mini-ITX"}]'::jsonb, 3);

  -- RAM filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_ram, 'memory_type', 'Memory Standard', 'multi-select', '[{"label":"DDR5","value":"DDR5"},{"label":"DDR4","value":"DDR4"}]'::jsonb, 1),
    (cat_ram, 'capacity', 'Kit Capacity', 'multi-select', '[{"label":"16GB (2x8GB)","value":"16GB"},{"label":"32GB (2x16GB)","value":"32GB"},{"label":"64GB (2x32GB)","value":"64GB"}]'::jsonb, 2),
    (cat_ram, 'speed', 'Memory Speed', 'multi-select', '[{"label":"6000 MHz","value":"6000MHz"},{"label":"5600 MHz","value":"5600MHz"},{"label":"3600 MHz","value":"3600MHz"},{"label":"3200 MHz","value":"3200MHz"}]'::jsonb, 3);

  -- Storage filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_storage, 'capacity', 'Storage Capacity', 'multi-select', '[{"label":"500 GB","value":"500GB"},{"label":"1 TB","value":"1TB"},{"label":"2 TB","value":"2TB"},{"label":"4 TB","value":"4TB"}]'::jsonb, 1),
    (cat_storage, 'interface', 'Interface / Gen', 'multi-select', '[{"label":"PCIe Gen 5.0 x4","value":"PCIe 5.0"},{"label":"PCIe Gen 4.0 x4","value":"PCIe 4.0"},{"label":"SATA III 6Gb/s","value":"SATA III"}]'::jsonb, 2);

  -- PSU filters
  INSERT INTO public.filters_config (category_id, filter_key, filter_label, filter_type, options, display_order) VALUES
    (cat_psu, 'wattage', 'Wattage', 'multi-select', '[{"label":"650 Watts","value":"650W"},{"label":"750 Watts","value":"750W"},{"label":"850 Watts","value":"850W"},{"label":"1000 Watts","value":"1000W"},{"label":"1200 Watts","value":"1200W"}]'::jsonb, 1),
    (cat_psu, 'efficiency', '80 Plus Rating', 'multi-select', '[{"label":"80+ Platinum","value":"80+ Platinum"},{"label":"80+ Gold","value":"80+ Gold"},{"label":"80+ Bronze","value":"80+ Bronze"}]'::jsonb, 2),
    (cat_psu, 'modularity', 'Modularity', 'select', '[{"label":"Full Modular","value":"Fully Modular"},{"label":"Semi-Modular","value":"Semi-Modular"},{"label":"Non-Modular","value":"Non-Modular"}]'::jsonb, 3);

  -- 5. Insert Products, Images, and Specs

  -------------------------------------------------------------
  -- 1. AMD Ryzen 7 7800X3D
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('AMD Ryzen 7 7800X3D Gaming Processor', 'amd-ryzen-7-7800x3d', cat_cpu_amd, br_amd, 48500, 46500, 18, 4.95, 142, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80', true, 1),
    (prod_id, 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop&q=80', false, 2);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'socket', 'AM5', 'Platform'),
    (prod_id, 'cores', '8 Cores', 'Core Specs'),
    (prod_id, 'threads', '16 Threads', 'Core Specs'),
    (prod_id, 'base_clock', '4.2 GHz', 'Clock Speeds'),
    (prod_id, 'boost_clock', '5.0 GHz', 'Clock Speeds'),
    (prod_id, 'l3_cache', '96MB 3D V-Cache', 'Memory/Cache'),
    (prod_id, 'tdp', '120W', 'Power'),
    (prod_id, 'series', 'Ryzen 7000', 'General'),
    (prod_id, 'memory_support', 'DDR5 up to 5200MHz', 'Memory/Cache');

  -------------------------------------------------------------
  -- 2. Intel Core i7-14700K
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Intel Core i7-14700K 14th Gen Desktop Processor', 'intel-core-i7-14700k', cat_cpu_intel, br_intel, 49000, 47500, 24, 4.88, 98, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'socket', 'LGA1700', 'Platform'),
    (prod_id, 'cores', '20 Cores (8P + 12E)', 'Core Specs'),
    (prod_id, 'threads', '28 Threads', 'Core Specs'),
    (prod_id, 'base_clock', '3.4 GHz', 'Clock Speeds'),
    (prod_id, 'boost_clock', '5.6 GHz', 'Clock Speeds'),
    (prod_id, 'l3_cache', '33MB Intel Smart Cache', 'Memory/Cache'),
    (prod_id, 'tdp', '125W (Max 253W)', 'Power'),
    (prod_id, 'series', 'Core 14th Gen', 'General'),
    (prod_id, 'memory_support', 'DDR5 5600 / DDR4 3200', 'Memory/Cache');

  -------------------------------------------------------------
  -- 3. AMD Ryzen 5 7600X
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('AMD Ryzen 5 7600X 6-Core AM5 Processor', 'amd-ryzen-5-7600x', cat_cpu_amd, br_amd, 24500, 23200, 35, 4.82, 110, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'socket', 'AM5', 'Platform'),
    (prod_id, 'cores', '6 Cores', 'Core Specs'),
    (prod_id, 'threads', '12 Threads', 'Core Specs'),
    (prod_id, 'base_clock', '4.7 GHz', 'Clock Speeds'),
    (prod_id, 'boost_clock', '5.3 GHz', 'Clock Speeds'),
    (prod_id, 'tdp', '105W', 'Power'),
    (prod_id, 'series', 'Ryzen 7000', 'General');

  -------------------------------------------------------------
  -- 4. ASUS ROG Strix GeForce RTX 4070 Super OC 12GB
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('ASUS ROG Strix GeForce RTX 4070 Super 12GB GDDR6X OC Edition', 'asus-rog-strix-rtx-4070-super-12gb', cat_gpu_nvidia, br_asus, 89500, 86000, 12, 4.92, 64, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'chipset', 'RTX 4070 Super', 'GPU Engine'),
    (prod_id, 'vram', '12GB', 'Memory'),
    (prod_id, 'memory_type', 'GDDR6X', 'Memory'),
    (prod_id, 'cuda_cores', '7168 Cores', 'GPU Engine'),
    (prod_id, 'boost_clock', '2580 MHz', 'Clock Speeds'),
    (prod_id, 'power_connectors', '1x 16-pin 12VHPWR', 'Power'),
    (prod_id, 'recommended_psu', '750W', 'Power'),
    (prod_id, 'slot_width', '3.12 Slot', 'Dimensions');

  -------------------------------------------------------------
  -- 5. MSI Gaming X Slim GeForce RTX 4060 8GB
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('MSI GeForce RTX 4060 Gaming X Slim 8GB GDDR6', 'msi-geforce-rtx-4060-gaming-x-slim-8gb', cat_gpu_nvidia, br_msi, 42500, 39900, 22, 4.75, 87, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'chipset', 'RTX 4060', 'GPU Engine'),
    (prod_id, 'vram', '8GB', 'Memory'),
    (prod_id, 'memory_type', 'GDDR6', 'Memory'),
    (prod_id, 'cuda_cores', '3072 Cores', 'GPU Engine'),
    (prod_id, 'boost_clock', '2595 MHz', 'Clock Speeds'),
    (prod_id, 'recommended_psu', '550W', 'Power');

  -------------------------------------------------------------
  -- 6. Gigabyte Radeon RX 7800 XT Gaming OC 16GB
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Gigabyte Radeon RX 7800 XT Gaming OC 16GB GDDR6', 'gigabyte-radeon-rx-7800-xt-gaming-oc-16gb', cat_gpu_amd, br_gigabyte, 72000, 68500, 15, 4.86, 45, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'chipset', 'RX 7800 XT', 'GPU Engine'),
    (prod_id, 'vram', '16GB', 'Memory'),
    (prod_id, 'memory_type', 'GDDR6', 'Memory'),
    (prod_id, 'stream_processors', '3840', 'GPU Engine'),
    (prod_id, 'boost_clock', '2565 MHz', 'Clock Speeds'),
    (prod_id, 'recommended_psu', '700W', 'Power');

  -------------------------------------------------------------
  -- 7. MSI MAG B650 Tomahawk WiFi Motherboard
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('MSI MAG B650 Tomahawk WiFi AM5 ATX Motherboard', 'msi-mag-b650-tomahawk-wifi', cat_mb_amd, br_msi, 27500, 25900, 20, 4.90, 83, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'socket', 'AM5', 'CPU Support'),
    (prod_id, 'chipset', 'B650', 'Chipset'),
    (prod_id, 'form_factor', 'ATX', 'Physical'),
    (prod_id, 'memory_slots', '4x DDR5', 'Memory'),
    (prod_id, 'max_memory', '192GB DDR5 6600+ MHz (OC)', 'Memory'),
    (prod_id, 'pcie_slots', '1x PCIe 4.0 x16, 1x PCIe 4.0 x4', 'Expansion'),
    (prod_id, 'm2_slots', '3x M.2 PCIe 4.0', 'Storage'),
    (prod_id, 'wireless', 'Wi-Fi 6E & Bluetooth 5.3', 'Connectivity');

  -------------------------------------------------------------
  -- 8. Gigabyte Z790 AORUS Elite AX (LGA1700)
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Gigabyte Z790 AORUS ELITE AX Intel Motherboard', 'gigabyte-z790-aorus-elite-ax', cat_mb_intel, br_gigabyte, 34500, 32900, 16, 4.85, 52, false, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'socket', 'LGA1700', 'CPU Support'),
    (prod_id, 'chipset', 'Z790', 'Chipset'),
    (prod_id, 'form_factor', 'ATX', 'Physical'),
    (prod_id, 'memory_slots', '4x DDR5', 'Memory'),
    (prod_id, 'm2_slots', '4x M.2 PCIe 4.0', 'Storage');

  -------------------------------------------------------------
  -- 9. G.Skill Trident Z5 Neo RGB 32GB (2x16GB) DDR5-6000
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('G.Skill Trident Z5 Neo RGB 32GB (2x16GB) DDR5 6000MHz CL30 EXPO', 'gskill-trident-z5-neo-rgb-32gb-ddr5-6000', cat_ram_ddr5, br_gskill, 16500, 15200, 40, 4.94, 91, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'memory_type', 'DDR5', 'General'),
    (prod_id, 'capacity', '32GB', 'General'),
    (prod_id, 'speed', '6000MHz', 'Performance'),
    (prod_id, 'latency', 'CL30-38-38-96', 'Performance'),
    (prod_id, 'voltage', '1.35V', 'Power'),
    (prod_id, 'profile', 'AMD EXPO & Intel XMP 3.0', 'Features');

  -------------------------------------------------------------
  -- 10. Corsair Vengeance RGB 32GB (2x16GB) DDR5 5600MHz
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Corsair Vengeance RGB 32GB (2x16GB) DDR5 5600MHz Black', 'corsair-vengeance-rgb-32gb-ddr5-5600', cat_ram_ddr5, br_corsair, 13800, 12600, 28, 4.80, 67, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'memory_type', 'DDR5', 'General'),
    (prod_id, 'capacity', '32GB', 'General'),
    (prod_id, 'speed', '5600MHz', 'Performance'),
    (prod_id, 'latency', 'CL36', 'Performance');

  -------------------------------------------------------------
  -- 11. Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Samsung 990 PRO 2TB PCIe 4.0 M.2 NVMe SSD', 'samsung-990-pro-2tb-nvme-ssd', cat_storage_nvme, br_samsung, 23500, 21900, 30, 4.96, 178, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'capacity', '2TB', 'Capacity'),
    (prod_id, 'interface', 'PCIe 4.0', 'Interface'),
    (prod_id, 'form_factor', 'M.2 2280', 'Physical'),
    (prod_id, 'read_speed', 'Up to 7450 MB/s', 'Performance'),
    (prod_id, 'write_speed', 'Up to 6900 MB/s', 'Performance'),
    (prod_id, 'tbw', '1200 TBW', 'Endurance');

  -------------------------------------------------------------
  -- 12. Kingston KC3000 1TB PCIe 4.0 NVMe SSD
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Kingston KC3000 1TB PCIe 4.0 NVMe M.2 SSD', 'kingston-kc3000-1tb-nvme-ssd', cat_storage_nvme, br_kingston, 11500, 10200, 45, 4.88, 120, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'capacity', '1TB', 'Capacity'),
    (prod_id, 'interface', 'PCIe 4.0', 'Interface'),
    (prod_id, 'read_speed', '7000 MB/s', 'Performance'),
    (prod_id, 'write_speed', '6000 MB/s', 'Performance');

  -------------------------------------------------------------
  -- 13. Corsair RM850e 850W 80 Plus Gold Fully Modular ATX 3.0 PSU
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Corsair RM850e 850W 80 Plus Gold Fully Modular ATX 3.0 Power Supply', 'corsair-rm850e-850w-gold-modular-psu', cat_psu_mod, br_corsair, 14500, 13600, 25, 4.91, 74, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'wattage', '850W', 'Power Specs'),
    (prod_id, 'efficiency', '80+ Gold', 'Efficiency'),
    (prod_id, 'modularity', 'Fully Modular', 'Cables'),
    (prod_id, 'standard', 'ATX 3.0 & PCIe 5.0 (12VHPWR Ready)', 'Compatibility'),
    (prod_id, 'fan_size', '120mm Rifle Bearing Fan (Zero RPM Mode)', 'Cooling');

  -------------------------------------------------------------
  -- 14. Seasonic Focus GX-750 750W 80 Plus Gold Modular PSU
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Seasonic FOCUS GX-750 750W 80+ Gold Full Modular Power Supply', 'seasonic-focus-gx-750-750w-gold-modular-psu', cat_psu_mod, br_seasonic, 13000, 12200, 18, 4.93, 62, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'wattage', '750W', 'Power Specs'),
    (prod_id, 'efficiency', '80+ Gold', 'Efficiency'),
    (prod_id, 'modularity', 'Fully Modular', 'Cables');

  -------------------------------------------------------------
  -- 15. Lian Li O11 Vision Chrome Dual-Chamber Casing
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Lian Li O11 Vision Chrome Panoramic Glass Gaming Casing', 'lian-li-o11-vision-chrome-casing', cat_case, br_lianli, 17500, 16200, 14, 4.97, 89, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'form_factor', 'Mid Tower', 'Case Specs'),
    (prod_id, 'side_panel', 'Tempered Glass', 'Materials'),
    (prod_id, 'mb_support', 'E-ATX, ATX, Micro-ATX, Mini-ITX', 'Compatibility'),
    (prod_id, 'max_gpu_length', '455mm', 'Clearance'),
    (prod_id, 'radiator_support', 'Top/Side/Bottom 360mm', 'Cooling');

  -------------------------------------------------------------
  -- 16. DeepCool AK620 Digital Dual-Tower Air Cooler
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('DeepCool AK620 DIGITAL Dual-Tower CPU Air Cooler with Screen', 'deepcool-ak620-digital-cpu-cooler', cat_cooler_air, br_deepcool, 7800, 7200, 32, 4.87, 105, true, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'cooler_type', 'Dual-Tower Air', 'Cooling Type'),
    (prod_id, 'socket', 'AM5, LGA1700, AM4', 'Compatibility'),
    (prod_id, 'fan_speed', '500-1850 RPM', 'Performance'),
    (prod_id, 'tdp_capacity', '260W TDP', 'Cooling Performance'),
    (prod_id, 'display', 'Real-time CPU Temp/Usage Digital Display', 'Features');

  -------------------------------------------------------------
  -- 17. NZXT Kraken Elite 360 RGB Liquid Cooler
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('NZXT Kraken Elite 360 RGB 360mm AIO Liquid Cooler with LCD', 'nzxt-kraken-elite-360-rgb-liquid-cooler', cat_cooler_liquid, br_nzxt, 32000, 29800, 10, 4.95, 48, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'cooler_type', '360mm AIO Liquid', 'Cooling Type'),
    (prod_id, 'socket', 'AM5, LGA1700, AM4', 'Compatibility'),
    (prod_id, 'radiator_size', '360mm Aluminum', 'Dimensions'),
    (prod_id, 'display', '2.36 Inch Wide-Angle 60Hz LCD Screen', 'Features');

  -------------------------------------------------------------
  -- 18. Logitech G PRO X SUPERLIGHT 2 Wireless Gaming Mouse
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Logitech G PRO X SUPERLIGHT 2 Wireless Gaming Mouse', 'logitech-g-pro-x-superlight-2', cat_mouse, br_logitech, 15500, 14200, 24, 4.94, 156, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'sensor', 'HERO 2 (32,000 DPI)', 'Sensor'),
    (prod_id, 'polling_rate', '4000 Hz LIGHTSPEED Wireless', 'Connectivity'),
    (prod_id, 'weight', '60 Grams Ultra-lightweight', 'Physical'),
    (prod_id, 'battery_life', 'Up to 95 Hours', 'Battery');

  -------------------------------------------------------------
  -- 19. Razer BlackWidow V4 Pro Mechanical Keyboard
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('Razer BlackWidow V4 Pro RGB Mechanical Gaming Keyboard', 'razer-blackwidow-v4-pro-mechanical-keyboard', cat_keyboard, br_razer, 22500, 20500, 16, 4.88, 73, false, false)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'switch_type', 'Razer Green Clicky / Yellow Linear', 'Key Switches'),
    (prod_id, 'connectivity', 'Detachable USB-C', 'Connectivity'),
    (prod_id, 'keycaps', 'Doubleshot ABS Keycaps', 'Materials'),
    (prod_id, 'features', 'Razer Command Dial + 8 Macro Keys', 'Features');

  -------------------------------------------------------------
  -- 20. ASUS ROG Swift OLED PG27AQDM 27" 240Hz 1440p Gaming Monitor
  -------------------------------------------------------------
  INSERT INTO public.products (name, slug, category_id, brand_id, price, discount_price, stock, rating, review_count, is_featured, is_new_arrival)
  VALUES ('ASUS ROG Swift OLED PG27AQDM 27" 240Hz QHD 0.03ms Gaming Monitor', 'asus-rog-swift-oled-pg27aqdm-27-monitor', cat_monitor, br_asus, 115000, 108000, 8, 4.98, 42, true, true)
  RETURNING id INTO prod_id;

  INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES
    (prod_id, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80', true, 1);

  INSERT INTO public.product_specs (product_id, spec_key, spec_value, spec_group) VALUES
    (prod_id, 'panel_type', 'OLED', 'Display Specs'),
    (prod_id, 'screen_size', '26.5 Inch', 'Display Specs'),
    (prod_id, 'resolution', '1440p QHD (2560 x 1440)', 'Display Specs'),
    (prod_id, 'refresh_rate', '240Hz', 'Performance'),
    (prod_id, 'response_time', '0.03ms (GTG)', 'Performance'),
    (prod_id, 'hdr', 'HDR10, 1000 nits Peak Brightness', 'Color & Contrast');

END $$;
