import { batchEnrichCallForPrice, enrichGroupedShops, estimateSingleProductPrice } from "../lib/priceEstimator.js";

async function runTests() {
  console.log("=== Testing 'Call for Price' Intelligent Price Estimation ===");

  // 1. Test Single Unpriced GPU with neighbor
  const unpricedGpu = {
    id: "test-gpu-1",
    title: "Gigabyte GeForce RTX 4060 WINDFORCE OC 8GB",
    category: "Graphics Card",
    brand: "Gigabyte",
    price: 0,
    price_str: "Call for Price"
  };

  const knownPricedNeighbors = [
    { title: "ZOTAC GAMING GeForce RTX 4060 8GB Twin Edge", price: 42000, category: "Graphics Card" },
    { title: "MSI GeForce RTX 4060 VENTUS 2X BLACK 8G OC", price: 43500, category: "Graphics Card" }
  ];

  const estimatedGpu = await estimateSingleProductPrice(unpricedGpu, null, knownPricedNeighbors);
  console.log("\n1. KNN Estimation for unpriced GPU:", {
    title: estimatedGpu.title,
    price: estimatedGpu.price,
    price_str: estimatedGpu.price_str,
    is_call_for_price: estimatedGpu.is_call_for_price,
    source: estimatedGpu.estimation_source
  });

  // 2. Test Multi-Store Offers Comparison Grouping (Retailer Table)
  const shopOffers = [
    { name: "StarTech BD", store: "StarTech BD", price: 45000, price_str: "45,000৳" },
    { name: "Ryans Computers", store: "Ryans Computers", price: 0, price_str: "Call for Price" },
    { name: "Global Brand", store: "Global Brand", price: null, price_str: "Call for Price" },
    { name: "Techland BD", store: "Techland BD", price: 0, price_str: "Call for Price" },
    { name: "Skyland BD", store: "Skyland BD", price: 43500, price_str: "43,500৳" },
    { name: "PCB Store", store: "PCB Store", price: null, price_str: "Call for Price" }
  ];

  const enrichedOffers = await enrichGroupedShops(shopOffers, unpricedGpu, null);
  console.log("\n2. Enriched Multi-Store Comparison Rows:");
  enrichedOffers.forEach(s => {
    console.log(` - ${s.name.padEnd(20)}: ${s.price_str.padEnd(10)} | CallForPrice: ${s.is_call_for_price ? 'YES (Estimated)' : 'NO (Live)'} | Source: ${s.estimation_source || 'direct'}`);
  });

  // 3. Test Batch Search Results Enrichment
  const searchResults = [
    { id: "1", title: "AMD Ryzen 5 7600 Processor", price: 21500, price_str: "21,500৳" },
    { id: "2", title: "AMD Ryzen 7 7800X3D Processor", price: 0, price_str: "Call for Price" },
    { id: "3", title: "Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz", price: 0, price_str: "Call for Price" }
  ];

  const enrichedSearch = await batchEnrichCallForPrice(searchResults, null);
  console.log("\n3. Batch Search Results Enrichment:");
  enrichedSearch.forEach(item => {
    console.log(` - ${item.title.padEnd(45)}: ${item.price_str.padEnd(10)} | is_call_for_price: ${item.is_call_for_price} | source: ${item.estimation_source || 'live'}`);
  });

  console.log("\n✓ All price estimation tests completed successfully!");
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
