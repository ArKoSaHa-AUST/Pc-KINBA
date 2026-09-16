import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

let browser = null;

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Renders an evidence HTML card and saves it as a high-resolution PNG screenshot.
 */
export async function captureEvidence({
  testId,
  service,
  moduleName,
  description,
  steps,
  expected,
  actual,
  status = 'PASS',
  inputData = null,
  outputData = null,
  outputPath = null
}) {
  const targetPath = outputPath || path.join(
    process.cwd(),
    'testSS',
    service.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    `${testId}.png`
  );

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const b = await getBrowser();
  const page = await b.newPage({ viewport: { width: 1000, height: 700 } });

  const isPass = status.toUpperCase() === 'PASS';
  const statusColor = isPass ? '#10b981' : '#ef4444';
  const statusBg = isPass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const statusIcon = isPass ? '✓ PASSED' : '✗ FAILED';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${testId} - Evidence</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 24px;
      width: 1000px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .badge {
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.05em;
      color: ${statusColor};
      background: ${statusBg};
      border: 1px solid ${statusColor};
    }
    .meta {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .box {
      background: #1e293b;
      border-radius: 8px;
      padding: 14px;
      border: 1px solid #334155;
    }
    .box-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .box-content {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    pre {
      background: #020617;
      color: #38bdf8;
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-x: auto;
      max-height: 200px;
      border: 1px solid #1e293b;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #1e293b;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="meta">PC KINBA QA TEST EVIDENCE • ${service}</div>
        <div class="title">${testId} — ${moduleName}</div>
      </div>
      <div class="badge">${statusIcon}</div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Description</div>
        <div class="box-content">${description}</div>
      </div>
      <div class="box">
        <div class="box-title">Execution Steps</div>
        <div class="box-content">${steps}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Expected Result</div>
        <div class="box-content">${expected}</div>
      </div>
      <div class="box">
        <div class="box-title">Actual Result</div>
        <div class="box-content" style="color: ${statusColor}">${actual}</div>
      </div>
    </div>

    ${inputData ? `
    <div style="margin-bottom: 12px;">
      <div class="box-title">Input Payload / Fixture Data</div>
      <pre>${typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2)}</pre>
    </div>` : ''}

    ${outputData ? `
    <div style="margin-bottom: 12px;">
      <div class="box-title">Output Payload / API Response</div>
      <pre>${typeof outputData === 'string' ? outputData : JSON.stringify(outputData, null, 2)}</pre>
    </div>` : ''}

    <div class="footer">
      <span>PC Kinba Automated Test Runner</span>
      <span>Timestamp: ${new Date().toISOString()}</span>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: targetPath, fullPage: true });
  await page.close();
  return targetPath;
}
