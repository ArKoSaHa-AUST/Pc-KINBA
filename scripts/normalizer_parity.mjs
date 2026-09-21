#!/usr/bin/env node
/**
 * scripts/normalizer_parity.mjs - Cross-language parity test harness.
 *
 * Compares lib/normalizer.js (Node.js) against scrapers/normalizer.py (Python).
 * Fails loudly with a readable per-field diff on any mismatch.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  extractAttributes,
  generateFingerprint,
  normalizePrice,
  calculateSimilarity,
  calculateMatchConfidence,
} from '../lib/normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CORPUS_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'normalization_corpus.json');

/**
 * Locate Python interpreter in environment or virtualenv.
 */
function findPythonInterpreter() {
  const candidates = [
    process.env.PYTHON,
    path.join(REPO_ROOT, 'scrapers', 'venv', 'Scripts', 'python.exe'),
    path.join(REPO_ROOT, 'scrapers', 'venv', 'bin', 'python'),
    'python3',
    'python',
    'py',
  ].filter(Boolean);

  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
      if (res.status === 0) {
        return cmd;
      }
    } catch {
      // continue to next candidate
    }
  }
  return null;
}

/**
 * Execute Python dump script and parse JSON output.
 */
function getPythonDump(pythonCmd, corpusPath) {
  const scriptPath = path.join(REPO_ROOT, 'scripts', 'normalizer_dump.py');
  const res = spawnSync(pythonCmd, [scriptPath, '--corpus', corpusPath], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (res.error) {
    throw new Error(`Failed to execute Python dump script (${scriptPath}): ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`Python dump script exited with status ${res.status}:\n${res.stderr || res.stdout}`);
  }

  try {
    return JSON.parse(res.stdout);
  } catch (err) {
    throw new Error(`Failed to parse Python dump output as JSON: ${err.message}\nRaw output:\n${res.stdout.slice(0, 1000)}`);
  }
}

/**
 * Generate JS dump from corpus.
 */
function getJavaScriptDump(corpus) {
  const titleDumps = {};
  for (const item of corpus.titles || []) {
    const attrs = extractAttributes(item.raw_title);
    const fpRes = generateFingerprint(item.raw_title);
    titleDumps[item.id] = {
      attributes: {
        manufacturer: attrs.manufacturer,
        brand: attrs.brand,
        capacity: attrs.capacity,
        type: attrs.type,
        speed: attrs.speed,
        model: attrs.model,
        baseModel: attrs.baseModel,
        mpn: attrs.mpn,
        raw: attrs.raw,
      },
      fingerprint: fpRes.fingerprint,
      canonical_name: fpRes.canonical_name,
    };
  }

  const priceDumps = (corpus.prices || []).map((p) => ({
    raw: p.raw,
    normalized: normalizePrice(p.raw),
  }));

  const pairDumps = {};
  for (const pair of corpus.pairs || []) {
    const sim = calculateSimilarity(pair.title1, pair.title2);
    const conf = calculateMatchConfidence(pair.title1, pair.title2);
    pairDumps[pair.id] = {
      similarity: Math.round(sim * 10000) / 10000,
      confidence: Math.round(conf * 100) / 100,
    };
  }

  return {
    titles: titleDumps,
    prices: priceDumps,
    pairs: pairDumps,
  };
}

/**
 * Main parity runner.
 */
export function runParityCheck(options = {}) {
  const corpusPath = options.corpusPath || CORPUS_PATH;
  if (!fs.existsSync(corpusPath)) {
    throw new Error(`Corpus file not found: ${corpusPath}`);
  }

  const pythonCmd = findPythonInterpreter();
  if (!pythonCmd) {
    throw new Error('FATAL: Python interpreter was not found in PATH or scrapers/venv. Parity harness cannot run without Python.');
  }

  const corpusRaw = fs.readFileSync(corpusPath, 'utf-8');
  const corpus = JSON.parse(corpusRaw);

  const jsDump = getJavaScriptDump(corpus);
  const pyDump = getPythonDump(pythonCmd, corpusPath);

  const mismatches = [];
  let fieldsCompared = 0;

  // 1. Compare Titles
  for (const [id, jsItem] of Object.entries(jsDump.titles)) {
    const pyItem = pyDump.titles?.[id];
    if (!pyItem) {
      mismatches.push({ id, field: '<missing_entry>', js: 'present', py: 'missing' });
      continue;
    }

    const attrKeys = ['manufacturer', 'brand', 'capacity', 'type', 'speed', 'model', 'baseModel', 'mpn'];
    for (const key of attrKeys) {
      fieldsCompared++;
      const jsVal = jsItem.attributes[key];
      const pyVal = pyItem.attributes[key];
      if (jsVal !== pyVal) {
        mismatches.push({ id, field: `attributes.${key}`, js: jsVal, py: pyVal });
      }
    }

    fieldsCompared += 2;
    if (jsItem.fingerprint !== pyItem.fingerprint) {
      mismatches.push({ id, field: 'fingerprint', js: jsItem.fingerprint, py: pyItem.fingerprint });
    }
    if (jsItem.canonical_name !== pyItem.canonical_name) {
      mismatches.push({ id, field: 'canonical_name', js: jsItem.canonical_name, py: pyItem.canonical_name });
    }
  }

  // 2. Compare Prices
  const jsPrices = jsDump.prices;
  const pyPrices = pyDump.prices || [];
  for (let i = 0; i < jsPrices.length; i++) {
    fieldsCompared++;
    const jsP = jsPrices[i];
    const pyP = pyPrices[i];
    if (jsP?.normalized !== pyP?.normalized) {
      mismatches.push({ id: `PRICE-${i} (${jsP.raw})`, field: 'normalized_price', js: jsP?.normalized, py: pyP?.normalized });
    }
  }

  // 3. Compare Pairs
  for (const [id, jsPair] of Object.entries(jsDump.pairs)) {
    const pyPair = pyDump.pairs?.[id];
    if (!pyPair) {
      mismatches.push({ id, field: '<missing_pair>', js: 'present', py: 'missing' });
      continue;
    }

    fieldsCompared++;
    if (Math.abs(jsPair.similarity - pyPair.similarity) > 0.001) {
      mismatches.push({ id, field: 'similarity', js: jsPair.similarity, py: pyPair.similarity });
    }

    fieldsCompared++;
    if (Math.abs(jsPair.confidence - pyPair.confidence) > 0.01) {
      mismatches.push({ id, field: 'confidence', js: jsPair.confidence, py: pyPair.confidence });
    }
  }

  return {
    totalTitles: Object.keys(jsDump.titles).length,
    totalPrices: jsDump.prices.length,
    totalPairs: Object.keys(jsDump.pairs).length,
    fieldsCompared,
    mismatchCount: mismatches.length,
    mismatches,
  };
}

// Standalone execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    console.log('🔍 Running Cross-Language Normalizer Parity Harness...');
    const result = runParityCheck();

    console.log(`\n📊 Corpus Summary:`);
    console.log(`   - Titles: ${result.totalTitles}`);
    console.log(`   - Price test cases: ${result.totalPrices}`);
    console.log(`   - Comparison pairs: ${result.totalPairs}`);
    console.log(`   - Total fields compared: ${result.fieldsCompared}`);
    console.log(`   - Total mismatches: ${result.mismatchCount}\n`);

    if (result.mismatchCount > 0) {
      console.error(`❌ PARITY FAILURE: Found ${result.mismatchCount} mismatches between JS and Python:\n`);
      for (const m of result.mismatches) {
        console.error(`   [${m.id}] ${m.field}:`);
        console.error(`       JS:     ${JSON.stringify(m.js)}`);
        console.error(`       Python: ${JSON.stringify(m.py)}`);
      }
      process.exit(1);
    } else {
      console.log('✅ 100% PARITY ACHIEVED: JavaScript and Python normalizers are identical across all corpus entries.');
      process.exit(0);
    }
  } catch (err) {
    console.error(`❌ Harness error: ${err.message}`);
    process.exit(1);
  }
}
