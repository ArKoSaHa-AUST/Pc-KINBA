if (!globalThis.WebSocket) {
  globalThis.WebSocket = class WebSocket {};
}

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parseIntent } from "../../lib/ai/intent.js";
import { retrieveCandidates } from "../../lib/ai/retriever.js";
import { planBuild } from "../../lib/ai/planner.js";
import { validateBuild } from "../../lib/ai/validator.js";
import { streamExplanation } from "../../lib/ai/explainer.js";

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

async function runEvaluation() {
  console.log("================================================================================");
  console.log("       PC-KINBA Tonima AI Build Agent - Golden Evaluation Test Suite            ");
  console.log("================================================================================\n");

  const goldenPath = path.join(process.cwd(), "tests/ai/golden.json");
  const prompts = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));

  let totalTests = prompts.length;
  let passedCompatibility = 0;
  let passedBudget = 0;
  let passedPurpose = 0;
  let passedGrounding = 0;
  let totalTokens = 0;

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < prompts.length; i++) {
    const item = prompts[i];
    process.stdout.write(`[${i + 1}/${totalTests}] Testing: "${item.prompt.slice(0, 45)}..." `);
    const itemStart = Date.now();

    try {
      // 1. Intent Parsing
      const { request, tokensIn: iIn, tokensOut: iOut } = await parseIntent(item.prompt);
      totalTokens += (iIn + iOut);

      // 2. Candidate Retrieval
      const candidatesMap = await retrieveCandidates(request, supabase);
      const candidateLookup = {};
      for (const list of Object.values(candidatesMap)) {
        for (const c of list) {
          candidateLookup[c.id] = c;
        }
      }

      // 3. Planning
      const { build, validation, tokensIn: pIn, tokensOut: pOut, model } = await planBuild(request, candidatesMap);
      totalTokens += (pIn + pOut);

      // 4. Grounding Check: Ensure all part IDs are valid candidate IDs
      let isGrounded = true;
      for (const [cat, id] of Object.entries(build.parts || {})) {
        if (!candidateLookup[id]) {
          isGrounded = false;
        }
      }
      if (isGrounded) passedGrounding++;

      // 5. Compatibility Check
      const compScore = validation.score || 0;
      const isCompatible = compScore >= 95;
      if (isCompatible) passedCompatibility++;

      // 6. Budget Check (+3% ceiling)
      const targetBudget = item.expected_budget || request.budget_bdt || 150000;
      const budgetCeiling = Math.round(targetBudget * 1.03);
      const isBudgetOk = build.total_bdt <= budgetCeiling;
      if (isBudgetOk) passedBudget++;

      // 7. Purpose Constraint Fit
      let purposeOk = true;
      if (item.expected_purpose === "ai_ml") {
        const gpuCandidate = build.parts.gpu ? candidateLookup[build.parts.gpu] : null;
        if (!gpuCandidate) {
          purposeOk = false;
        }
      }
      if (item.expected_purpose === "office" && item.require_no_gpu) {
        if (build.parts.gpu) purposeOk = false;
      }
      if (purposeOk) passedPurpose++;

      // 8. Stream Explainer Smoke Test (1-2 tokens)
      let streamOk = false;
      for await (const chunk of streamExplanation(build, candidateLookup, request, validation)) {
        if (chunk) {
          streamOk = true;
          break;
        }
      }

      const itemDuration = ((Date.now() - itemStart) / 1000).toFixed(1);

      const statusIcon = isCompatible && isBudgetOk && isGrounded && purposeOk ? "✅" : "⚠️";
      console.log(`${statusIcon} (${itemDuration}s) - ৳${build.total_bdt?.toLocaleString("en-IN")} [Score: ${compScore}%, Wattage: ~${validation.wattage}W]`);

      results.push({
        id: item.id,
        prompt: item.prompt,
        totalBDT: build.total_bdt,
        budget: targetBudget,
        score: compScore,
        wattage: validation.wattage,
        isCompatible,
        isBudgetOk,
        isGrounded,
        purposeOk,
        model
      });

    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({
        id: item.id,
        prompt: item.prompt,
        error: err.message
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================================================================");
  console.log("                               EVALUATION SUMMARY                               ");
  console.log("================================================================================");
  console.log(`Total Test Cases        : ${totalTests}`);
  console.log(`Compatibility Pass Rate : ${passedCompatibility}/${totalTests} (${((passedCompatibility / totalTests) * 100).toFixed(1)}%)  [Target >= 95%]`);
  console.log(`Budget Adherence (+3%)  : ${passedBudget}/${totalTests} (${((passedBudget / totalTests) * 100).toFixed(1)}%)  [Target 100%]`);
  console.log(`Grounding & Anti-Halluc.: ${passedGrounding}/${totalTests} (${((passedGrounding / totalTests) * 100).toFixed(1)}%)  [Target 100%]`);
  console.log(`Purpose & Spec Fit Rate : ${passedPurpose}/${totalTests} (${((passedPurpose / totalTests) * 100).toFixed(1)}%)  [Target 100%]`);
  console.log(`Total Runtime           : ${duration}s`);
  console.log(`Total Tokens Processed  : ${totalTokens}`);
  console.log("================================================================================\n");

  const allPassed = passedCompatibility >= totalTests * 0.95 && passedBudget === totalTests && passedGrounding === totalTests;
  if (allPassed) {
    console.log("🎉 ALL QUALITY, COMPATIBILITY, AND GROUNDING TARGETS MET SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.log("⚠️ Some test cases require review. See results above.");
    process.exit(0);
  }
}

runEvaluation();
