import dotenv from "dotenv";
import nodemailer from "nodemailer";

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
const sanitizeLog = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").slice(0, 100);
};

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

/**
 * Sends a welcome email to newly registered users via Brevo SMTP.
 * Wrapped to ensure email failure never blocks user signup.
 */
export const sendWelcomeEmail = async (rawEmail, rawName) => {
  const email = escapeHtml(rawEmail || "");
  const name = escapeHtml(rawName || "Builder");

  const safeLogEmail = sanitizeLog(rawEmail || "");

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"PC Kinba" <arkosaha61005@gmail.com>',
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
              <a href="http://localhost:5173/login" style="background: linear-gradient(135deg, #00e5ff, #7c3aed); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Sign In to Your Account
              </a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} PC Kinba. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    console.log("[Brevo SMTP] Welcome email sent successfully to %s (MessageID: %s)", safeLogEmail, info.messageId);
    return info;
  } catch (error) {
    const safeErrorMsg = sanitizeLog(error.message || "");
    console.error("[Brevo SMTP Error] Failed to send welcome email to %s: %s", safeLogEmail, safeErrorMsg);
    return { success: false, error: error.message };
  }
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
  const productLink = productId ? `http://localhost:5173/product/${productId}` : "http://localhost:5173";
  const safeLogEmail = sanitizeLog(rawEmail || "");

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"PC Kinba Price Alerts" <arkosaha61005@gmail.com>',
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
    });
    console.log("[Brevo SMTP] Price alert confirmation sent to %s (MessageID: %s)", safeLogEmail, info.messageId);
    return info;
  } catch (error) {
    const safeErrorMsg = sanitizeLog(error.message || "");
    console.error("[Brevo SMTP Error] Failed to send price alert confirmation to %s: %s", safeLogEmail, safeErrorMsg);
    return { success: false, error: error.message };
  }
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
  productId
}) => {
  const email = (rawEmail || "").trim();
  const name = escapeHtml(rawName || "PC Builder");
  const title = escapeHtml(productTitle || "Component");
  const oldPriceDisplay = oldPrice ? `৳${Number(oldPrice).toLocaleString()}` : "Previous Price";
  const newPriceDisplay = newPrice ? `৳${Number(newPrice).toLocaleString()}` : "Discount Price";
  const savings = oldPrice && newPrice && oldPrice > newPrice ? `৳${(oldPrice - newPrice).toLocaleString()}` : null;
  const store = escapeHtml(storeName || "Partner Retailer");
  const productLink = productId ? `http://localhost:5173/product/${productId}` : "http://localhost:5173";
  const safeLogEmail = sanitizeLog(rawEmail || "");

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"PC Kinba Price Drop" <arkosaha61005@gmail.com>',
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
    });
    console.log("[Brevo SMTP] Price drop alert sent to %s (MessageID: %s)", safeLogEmail, info.messageId);
    return info;
  } catch (error) {
    const safeErrorMsg = sanitizeLog(error.message || "");
    console.error("[Brevo SMTP Error] Failed to send price drop alert to %s: %s", safeLogEmail, safeErrorMsg);
    return { success: false, error: error.message };
  }
};

