import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { maskEmail } from "./lib/mailQueue.js";

dotenv.config();

/**
 * Escapes HTML special characters to prevent HTML injection (XSS) in email templates.
 * @param {string} str 
 * @returns {string}
 */
const escapeHtml = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/[^a-zA-Z0-9\s.@_-]/g, "");
};

/**
 * Sanitizes input string to prevent log injection vulnerabilities.
 * @param {string} str 
 * @returns {string}
 */
export const sanitizeLog = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").slice(0, 100);
};

/**
 * Retry policy constants and injectors.
 * Exported so test suites can override or shrink timings.
 */
export const RETRY_CONFIG = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  rng: Math.random,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
};

/**
 * Classifies an SMTP / Network error into 'transient', 'permanent', or 'config'.
 *
 * @param {any} error
 * @returns {'transient'|'permanent'|'config'}
 */
export function classifyError(error) {
  if (!error) return "transient";
  const code = error.code ? String(error.code).toUpperCase() : "";
  const responseCode = error.responseCode ? Number(error.responseCode) : null;

  // 1. Missing or invalid credentials
  if (code === "EAUTH" || responseCode === 535) {
    return "config";
  }

  // 2. Transient 4xx or socket-level network errors
  const TRANSIENT_SOCKET_CODES = new Set([
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ESOCKET",
    "EDNS",
    "EAI_AGAIN",
    "ENOTFOUND"
  ]);

  if (TRANSIENT_SOCKET_CODES.has(code)) {
    return "transient";
  }

  if (responseCode && responseCode >= 400 && responseCode < 500) {
    return "transient";
  }

  // 3. Permanent 5xx errors (invalid recipient, content rejection, blocked sender)
  if (responseCode && responseCode >= 500 && responseCode < 600) {
    return "permanent";
  }

  // Default to permanent for unretryable / unknown errors
  return "permanent";
}

/**
 * Module-level Nodemailer transport configured with connection pooling and timeouts.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

/**
 * Central delivery dispatcher with classified exponential backoff and full jitter.
 *
 * @param {import("nodemailer").SendMailOptions} mailOptions
 * @param {{ kind?: string, recipient?: string, correlationId?: string }} context
 * @returns {Promise<{
 *   ok: boolean,
 *   messageId?: string,
 *   attempts: number,
 *   classification?: 'transient'|'permanent'|'config',
 *   error?: string,
 *   lastAttemptAt: string
 * }>}
 */
export async function deliver(mailOptions, { kind = "generic", recipient = "", correlationId = "" } = {}) {
  const targetEmail = recipient || (typeof mailOptions?.to === "string" ? mailOptions.to : "");
  const safeLogEmail = sanitizeLog(maskEmail(targetEmail));
  let attempts = 0;
  let lastError = null;
  let lastClassification = "transient";

  while (attempts < RETRY_CONFIG.maxAttempts) {
    attempts++;
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(
        "[Brevo SMTP] %s email sent successfully to %s on attempt %d (MessageID: %s)",
        kind,
        safeLogEmail,
        attempts,
        info.messageId
      );
      return {
        ok: true,
        messageId: info.messageId,
        attempts,
        lastAttemptAt: new Date().toISOString()
      };
    } catch (error) {
      lastError = error;
      lastClassification = classifyError(error);
      const safeErrorMsg = sanitizeLog(error.message || "");

      if (lastClassification === "config") {
        console.error(
          "[Brevo SMTP Config Error] Invalid credentials or sender while delivering to %s on attempt %d: %s. Aborting without retry.",
          safeLogEmail,
          attempts,
          safeErrorMsg
        );
        break;
      }

      if (lastClassification === "permanent") {
        console.error(
          "[Brevo SMTP Permanent Error] Unretryable failure emailing %s on attempt %d: %s. Aborting.",
          safeLogEmail,
          attempts,
          safeErrorMsg
        );
        break;
      }

      // Transient failure: retry if attempts remaining
      if (attempts < RETRY_CONFIG.maxAttempts) {
        const backoffCap = Math.min(
          RETRY_CONFIG.maxDelayMs,
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempts - 1)
        );
        const delay = Math.round(RETRY_CONFIG.rng() * backoffCap);
        console.warn(
          "[Brevo SMTP Transient Warning] Attempt %d failed for %s (%s). Retrying in %dms...",
          attempts,
          safeLogEmail,
          safeErrorMsg,
          delay
        );
        await RETRY_CONFIG.sleep(delay);
      } else {
        console.error(
          "[Brevo SMTP Exhausted] Exhausted all %d retry attempts for %s: %s",
          attempts,
          safeLogEmail,
          safeErrorMsg
        );
      }
    }
  }

  return {
    ok: false,
    attempts,
    classification: lastClassification,
    error: lastError ? lastError.message : "Unknown send failure",
    lastAttemptAt: new Date().toISOString()
  };
}

/**
 * Validates Brevo SMTP configuration on startup and warns prominently if missing.
 * @returns {Promise<boolean>}
 */
export async function verifyMailerConfig() {
  const missing = [];
  if (!process.env.BREVO_SMTP_USER) missing.push("BREVO_SMTP_USER");
  if (!process.env.BREVO_SMTP_PASS) missing.push("BREVO_SMTP_PASS");
  if (!process.env.EMAIL_FROM) missing.push("EMAIL_FROM");

  if (missing.length > 0) {
    console.warn(
      `[Mailer Config Warning] Missing required email environment variable(s): ${missing.join(", ")}. Price alert and welcome emails will fail unless configured.`
    );
    return false;
  }

  try {
    if (typeof transporter.verify === "function") {
      await transporter.verify();
      console.log("[Brevo SMTP] Transporter connection verified successfully.");
      return true;
    }
    return true;
  } catch (error) {
    console.warn(
      `[Mailer Config Warning] SMTP connection verification failed: ${sanitizeLog(error.message || "")}. Check host, port, and credentials.`
    );
    return false;
  }
}

/**
 * Helper to get canonical application public URL.
 */
function getAppUrl() {
  return (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
}

/**
 * Helper to get canonical sender address.
 */
function getEmailFrom(suffix = "") {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  return suffix ? `"PC Kinba ${suffix}" <notifications@pckinba.com>` : '"PC Kinba" <notifications@pckinba.com>';
}

/**
 * Sends a welcome email to newly registered users via Brevo SMTP.
 * Wrapped to ensure email failure never blocks user signup.
 */
export const sendWelcomeEmail = async (rawEmail, rawName) => {
  const email = (rawEmail || "").trim();
  const name = escapeHtml(rawName || "Builder");
  const appUrl = getAppUrl();

  const mailOptions = {
    from: getEmailFrom(),
    to: email,
    subject: "Welcome to PC Kinba 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #334155; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #00e5ff; margin: 0; font-size: 28px; font-weight: 800;">PC KINBA</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Next-Gen 3D PC Builder & Hardware Platform</p>
        </div>
        <div style="padding: 24px; background-color: #1e293b; border-radius: 8px; border: 1px solid #475569;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Hello ${name}, welcome aboard! 🎉</h2>
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px;">
            Your account has been successfully created. You can now build, customize, and compare high-performance PC rigs with real-time 3D spatial visualization and AI optimization.
          </p>
          <div style="margin-top: 25px; text-align: center;">
            <a href="${appUrl}/login" style="background: linear-gradient(135deg, #00e5ff, #7c3aed); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Sign In to Your Account
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} PC Kinba. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return deliver(mailOptions, { kind: "welcome", recipient: email });
};

/**
 * Sends a Price Alert Confirmation email when user subscribes.
 */
export const sendPriceAlertConfirmationEmail = async ({
  rawEmail,
  rawName,
  productTitle,
  currentPrice,
  targetPrice,
  productId
}) => {
  const email = (rawEmail || "").trim();
  const name = escapeHtml(rawName || "PC Builder");
  const title = escapeHtml(productTitle || "Component");
  const priceDisplay = currentPrice ? `৳${Number(currentPrice).toLocaleString()}` : "Market Price";
  const targetPriceDisplay = targetPrice ? `৳${Number(targetPrice).toLocaleString()}` : "Any Price Drop";
  const appUrl = getAppUrl();
  const productLink = productId ? `${appUrl}/product/${productId}` : appUrl;

  const mailOptions = {
    from: getEmailFrom("Price Alerts"),
    to: email,
    subject: `🔔 Price Alert Activated: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid rgba(244,63,94,0.3); border-radius: 16px; background-color: #0c1228; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 10px 18px; border-radius: 30px; background-color: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.3); color: #fb7185; font-weight: bold; font-size: 13px; margin-bottom: 12px;">
            🔔 Real-Time Price Tracking Active
          </div>
          <h1 style="color: #00e5ff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">PC KINBA</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Hardware Intelligence & Price Comparison Engine</p>
        </div>

        <div style="padding: 24px; background-color: #080d1a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 18px; font-weight: 700;">Hello ${name},</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            You have successfully subscribed to real-time price change alerts for:
          </p>

          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">${title}</h3>
            <table style="width: 100%; font-size: 13px; color: #94a3b8;">
              <tr>
                <td style="padding: 4px 0;">Current Best Price:</td>
                <td style="padding: 4px 0; text-align: right; color: #34d399; font-weight: bold; font-size: 15px;">${priceDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Target Trigger Price:</td>
                <td style="padding: 4px 0; text-align: right; color: #00e5ff; font-weight: 600;">${targetPriceDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Tracked Stores:</td>
                <td style="padding: 4px 0; text-align: right; color: #f1f5f9;">StarTech, Ryans, TechLand, UCC + Google AI</td>
              </tr>
            </table>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
            Our AI market scanners will continuously check online tech retailers in Bangladesh and notify you immediately via email when the price drops or a store launches a special promo.
          </p>

          <div style="text-align: center;">
            <a href="${productLink}" style="background: linear-gradient(135deg, #f43f5e, #e11d48); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 0 20px rgba(244,63,94,0.4);">
              View Live Product & Retailer Stock
            </a>
          </div>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 11px;">
          <p>You received this because you requested a price drop alert on PC Kinba.</p>
          <p>&copy; ${new Date().getFullYear()} PC Kinba. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return deliver(mailOptions, { kind: "alert_confirmation", recipient: email });
};

/**
 * Sends a Price Drop Notification when an actual discount is detected.
 */
export const sendPriceDropAlertEmail = async ({
  rawEmail,
  rawName,
  productTitle,
  oldPrice,
  newPrice,
  storeName,
  productId,
  correlationId
}) => {
  const email = (rawEmail || "").trim();
  const name = escapeHtml(rawName || "PC Builder");
  const title = escapeHtml(productTitle || "Component");
  const oldPriceDisplay = oldPrice ? `৳${Number(oldPrice).toLocaleString()}` : "Previous Price";
  const newPriceDisplay = newPrice ? `৳${Number(newPrice).toLocaleString()}` : "Discount Price";
  const savings = oldPrice && newPrice && oldPrice > newPrice ? `৳${(oldPrice - newPrice).toLocaleString()}` : null;
  const store = escapeHtml(storeName || "Partner Retailer");
  const appUrl = getAppUrl();
  const productLink = productId ? `${appUrl}/product/${productId}` : appUrl;

  const mailOptions = {
    from: getEmailFrom("Price Drop"),
    to: email,
    subject: `🚨 Price Drop Alert: ${title} is now ${newPriceDisplay}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #10b981; border-radius: 16px; background-color: #0c1228; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 8px 18px; border-radius: 30px; background-color: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-weight: bold; font-size: 13px; margin-bottom: 12px;">
            🔥 Price Drop Detected
          </div>
          <h1 style="color: #00e5ff; margin: 0; font-size: 26px; font-weight: 800;">PC KINBA</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Hardware Intelligence Alert</p>
        </div>

        <div style="padding: 24px; background-color: #080d1a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 18px;">Great news, ${name}!</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            A component on your watchlist just dropped in price at <strong style="color: #00e5ff;">${store}</strong>:
          </p>

          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #ffffff; margin: 0 0 12px 0; font-size: 16px;">${title}</h3>
            <table style="width: 100%; font-size: 14px; color: #94a3b8;">
              <tr>
                <td style="padding: 4px 0;">Old Price:</td>
                <td style="padding: 4px 0; text-align: right; text-decoration: line-through; color: #94a3b8;">${oldPriceDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">New Deal Price:</td>
                <td style="padding: 4px 0; text-align: right; color: #10b981; font-weight: 800; font-size: 18px;">${newPriceDisplay}</td>
              </tr>
              ${savings ? `
              <tr>
                <td style="padding: 4px 0;">You Save:</td>
                <td style="padding: 4px 0; text-align: right; color: #38bdf8; font-weight: bold;">${savings}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${productLink}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 0 20px rgba(16,185,129,0.4);">
              Buy Direct / View Store Offer
            </a>
          </div>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 11px;">
          <p>&copy; ${new Date().getFullYear()} PC Kinba. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return deliver(mailOptions, { kind: "price_drop", recipient: email, correlationId });
};
