export interface EvidenceOptions {
  testId: string;
  service: string;
  moduleName: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  status?: 'PASS' | 'FAIL' | string;
  inputData?: any;
  outputData?: any;
  outputPath?: string | null;
}

export function getBrowser(): Promise<any>;
export function closeBrowser(): Promise<void>;
export function captureEvidence(options: EvidenceOptions): Promise<string>;
