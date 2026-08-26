import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sendWelcomeEmail } from "./mailer.js";

dotenv.config();

/**
 * Sanitizes input string to prevent log injection vulnerabilities.
 * @param {string} str 
 * @returns {string}
 */
const sanitizeLog = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").slice(0, 100);
};

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/send-welcome", async (req, res) => {
  const { email, name } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const safeLogEmail = sanitizeLog(email);
  const safeLogName = sanitizeLog(name || "User");

  console.log("[Signup Event] Triggering welcome email for: %s (%s)", safeLogEmail, safeLogName);

  try {
    const result = await sendWelcomeEmail(email, name);
    return res.json({ success: true, result });
  } catch (error) {
    const safeErrorMsg = sanitizeLog(error.message || "");
    console.error("[Signup Event Error] Email sending failed: %s", safeErrorMsg);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PC Kinba Email Backend Server running on http://localhost:${PORT}`);
});
