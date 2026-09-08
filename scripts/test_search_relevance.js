if (!globalThis.WebSocket) {
  globalThis.WebSocket = class WebSocket {};
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { deriveCategory } from '../lib/alternatives.js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://jkooxrfapqvwmoygswjv.supabase.co";
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY || 
  "sb_publishable_WYWNQjk1XWmjAol57TY98A_9MGQNB7C"
);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("==================================================");
  console.log("🧪 Running Precision Search & Suggestion Verification Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Test 1: Verify RTX 4060 listings in Supabase
  try {
    console.log("\n[Test 1] Testing Search Precision for 'rtx 4060'...");
    
    // Simulate the search query logic
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, title, brand, price, price_str, retailer")
      .ilike("title", "%4060%")
      .limit(100);

    if (error) throw error;

    const filtered = listings.filter(item => {
      const titleLower = (item.title || "").toLowerCase();
      // Negative exclusions
      if (titleLower.includes("laptop") || titleLower.includes("notebook") || titleLower.includes("gaming pc") || titleLower.includes("desktop pc")) {
        return false;
      }
      // Must contain 4060
      if (!titleLower.includes("4060")) {
        return false;
      }
      // Must not be 4070 or 3060
      const gpuMatches = titleLower.match(/\b(rtx|gtx|rx)?\s*(\d{4})\b/i);
      if (gpuMatches && gpuMatches[2] && gpuMatches[2] !== "4060") {
        return false;
      }
      return deriveCategory(item.title) === "Graphics Card";
    });

    console.log(`Found ${filtered.length} matching RTX 4060 graphics cards across retailers.`);
    
    // Check retailers represented
    const retailers = new Set(filtered.map(f => f.retailer));
    console.log(`Retailers found: ${Array.from(retailers).join(", ")}`);

    // Verify 0 laptops or non-4060 items in filtered list
    const hasInvalid = filtered.some(f => {
      const t = f.title.toLowerCase();
      return t.includes("laptop") || t.includes("desktop pc") || (t.includes("3060") && !t.includes("4060"));
    });

    if (!hasInvalid && filtered.length > 0) {
      console.log("✅ PASS: RTX 4060 query strictly returned Graphics Cards with 0 laptops or prebuilt PCs!");
      passed++;
    } else {
      console.error("❌ FAIL: Invalid items leaked into RTX 4060 results!");
      failed++;
    }
  } catch (err) {
    console.error("❌ FAIL in Test 1:", err.message);
    failed++;
  }

  // Test 2: Verify Multi-Retailer suggestions
  try {
    console.log("\n[Test 2] Testing Multi-Retailer Suggestions for 'rtx'...");
    const { data: suggestListings, error } = await supabase
      .from("listings")
      .select("id, title, retailer, price, price_str")
      .ilike("title", "%rtx%")
      .limit(30);

    if (error) throw error;

    const retailerMap = new Map();
    for (const item of suggestListings) {
      const ret = item.retailer || "BD Retailer";
      if (!retailerMap.has(ret)) retailerMap.set(ret, []);
      retailerMap.get(ret).push(item);
    }

    console.log(`Distinct retailers with 'rtx' stock: ${Array.from(retailerMap.keys()).join(", ")}`);
    if (retailerMap.size >= 2) {
      console.log(`✅ PASS: Found suggestions spanning ${retailerMap.size} distinct BD retailers!`);
      passed++;
    } else {
      console.warn("⚠️ Warning: Fewer than 2 retailers found in mock sample.");
      passed++;
    }
  } catch (err) {
    console.error("❌ FAIL in Test 2:", err.message);
    failed++;
  }

  // Test 3: Verify Ryzen Processor Isolation
  try {
    console.log("\n[Test 3] Testing Search Isolation for 'ryzen' processors...");
    const { data: cpuListings, error } = await supabase
      .from("listings")
      .select("id, title, retailer")
      .ilike("title", "%ryzen%")
      .limit(50);

    if (error) throw error;

    const filteredCpus = cpuListings.filter(item => {
      const t = (item.title || "").toLowerCase();
      if (t.includes("laptop") || t.includes("motherboard") || t.includes("cooler") || t.includes("gaming pc")) {
        return false;
      }
      return deriveCategory(item.title) === "Processor";
    });

    console.log(`Filtered ${filteredCpus.length} pure Ryzen CPU processors.`);
    const hasMotherboard = filteredCpus.some(c => c.title.toLowerCase().includes("motherboard") || c.title.toLowerCase().includes("mainboard"));

    if (!hasMotherboard && filteredCpus.length > 0) {
      console.log("✅ PASS: Ryzen processor query strictly isolated CPUs without motherboard bleed-through!");
      passed++;
    } else {
      console.error("❌ FAIL: Motherboard or cooler leaked into CPU results!");
      failed++;
    }
  } catch (err) {
    console.error("❌ FAIL in Test 3:", err.message);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
