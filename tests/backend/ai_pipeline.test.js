import { describe, it, expect, afterAll } from 'vitest';
import { parseIntentRegex } from '../../lib/ai/intent.js';
import { PURPOSE_BUDGET_WEIGHTS, allocateSubBudgets } from '../../lib/ai/budget.js';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence.js';

describe('Backend > Tonima AI PC Architect Pipeline (lib/ai/)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('BE-AI-001: Intent Parser extracts budget and purpose from natural language (English & Bengali)', async () => {
    const enIntent = parseIntentRegex('I need an AI and machine learning workstation under 2 lakh taka');
    const bnIntent = parseIntentRegex('গেমিং পিসি বাজেট ১.৫ লাখ টাকা');

    expect(enIntent.type).toBe('build');
    expect(enIntent.purpose).toBe('ai_ml');
    expect(enIntent.budget_bdt).toBe(200000);

    expect(bnIntent.type).toBe('build');
    expect(bnIntent.purpose).toBe('gaming');
    expect(bnIntent.budget_bdt).toBe(150000);
    expect(bnIntent.language).toBe('bn');

    await captureEvidence({
      testId: 'BE-AI-001',
      service: 'backend',
      moduleName: 'Tonima AI Intent Parser',
      description: 'Parses English and Bengali natural language prompts into structured budget and purpose intent',
      steps: 'parseIntentRegex() for English and Bengali budget prompts',
      expected: 'EN: 200,000 BDT (ai_ml), BN: 150,000 BDT (gaming)',
      actual: `EN: ${enIntent.budget_bdt} BDT (${enIntent.purpose}), BN: ${bnIntent.budget_bdt} BDT (${bnIntent.purpose})`,
      status: 'PASS',
      inputData: ['I need an AI and machine learning workstation under 2 lakh taka', 'গেমিং পিসি বাজেট ১.৫ লাখ টাকা'],
      outputData: { enIntent, bnIntent }
    });
  });

  it('BE-AI-002: Budget Allocation Heuristics calculates archetype splits', async () => {
    const totalBudget = 150000;
    const gamingSplits = allocateSubBudgets('gaming', totalBudget);

    expect(gamingSplits.gpu.target).toBe(Math.round(totalBudget * PURPOSE_BUDGET_WEIGHTS.gaming.gpu));
    expect(gamingSplits.cpu.target).toBe(Math.round(totalBudget * PURPOSE_BUDGET_WEIGHTS.gaming.cpu));

    await captureEvidence({
      testId: 'BE-AI-002',
      service: 'backend',
      moduleName: 'Budget Allocation Heuristics',
      description: 'Calculates target sub-budgets and min/max bounds per component category based on archetype',
      steps: `allocateSubBudgets("gaming", ${totalBudget})`,
      expected: 'GPU: ~40% (60,000 BDT), CPU: ~20% (30,000 BDT)',
      actual: `GPU Target: ${gamingSplits.gpu.target} BDT, CPU Target: ${gamingSplits.cpu.target} BDT`,
      status: 'PASS',
      inputData: { totalBudget, purpose: 'gaming' },
      outputData: gamingSplits
    });
  });

  it('BE-AI-003: Greeting and Refine Intent Classification', async () => {
    const greeting = parseIntentRegex('Hello Tonima!');
    const refinement = parseIntentRegex('swap GPU to RTX 4070 Super');

    expect(greeting.type).toBe('greeting');
    expect(refinement.type).toBe('refine');

    await captureEvidence({
      testId: 'BE-AI-003',
      service: 'backend',
      moduleName: 'Conversational Turn Classifier',
      description: 'Distinguishes between conversational greetings, refinements, and build requests',
      steps: 'parseIntentRegex() for greeting and component swap',
      expected: 'greeting: "greeting", refinement: "refine"',
      actual: `greeting.type: "${greeting.type}", refinement.type: "${refinement.type}"`,
      status: 'PASS',
      inputData: ['Hello Tonima!', 'swap GPU to RTX 4070 Super'],
      outputData: { greeting, refinement }
    });
  });
});
