/**
 * PC-KINBA — Lazy-Loaded Password Entropy & Guessability Estimator
 *
 * Wraps @zxcvbn-ts/core (v4.2.0 ZxcvbnFactory) and dictionaries with project-specific terminology.
 * All password guessability analysis is performed strictly client-side.
 * No password input is ever logged, cached remotely, or transmitted over network.
 */

import { ZxcvbnFactory, type ZxcvbnResult } from '@zxcvbn-ts/core';
import { dictionary as commonDictionary, adjacencyGraphs } from '@zxcvbn-ts/language-common';
import { dictionary as enDictionary, translations as enTranslations } from '@zxcvbn-ts/language-en';

export const PROJECT_DICTIONARY = [
  'pckinba',
  'pc kinba',
  'kinba',
  'tonima',
  'dhaka',
  'bangladesh',
  'bd',
  'chittagong',
  'sylhet',
  'startech',
  'ryans',
  'techland',
];

let estimatorInstance: ZxcvbnFactory | null = null;

export function initializeEstimator(): ZxcvbnFactory {
  if (estimatorInstance) return estimatorInstance;

  estimatorInstance = new ZxcvbnFactory({
    translations: enTranslations,
    graphs: adjacencyGraphs,
    dictionary: {
      ...commonDictionary,
      ...enDictionary,
      project: PROJECT_DICTIONARY,
    },
  });

  return estimatorInstance;
}

export function isEstimatorInitialized(): boolean {
  return estimatorInstance !== null;
}

export async function loadEstimator(): Promise<typeof runEstimator> {
  initializeEstimator();
  return runEstimator;
}

export function runEstimator(password: string, userInputs: string[] = []): ZxcvbnResult {
  const instance = initializeEstimator();
  const combinedInputs = [...PROJECT_DICTIONARY, ...userInputs.filter(Boolean)];
  return instance.check(password, combinedInputs);
}
