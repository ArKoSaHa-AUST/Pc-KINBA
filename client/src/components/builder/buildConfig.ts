export const BUDGET_MIN = 20000;
export const BUDGET_MAX = 500000;
export const BUDGET_STEP = 5000;

export const BUILD_PURPOSES = [
  'Gaming',
  'Content Creation',
  'Office/Productivity',
  'Streaming',
  'AI/ML Workstation',
] as const;

export type BuildPurpose = (typeof BUILD_PURPOSES)[number];

// en-IN grouping matches the Bangladeshi lakh format (৳5,00,000)
export function formatTaka(value: number): string {
  return `৳${value.toLocaleString('en-IN')}`;
}
