import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sendWelcomeEmail } from "./mailer.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/send-welcome", async (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  console.log(`[Signup Event] Triggering welcome email for: ${email} (${name || "User"})`);

  try {
    const result = await sendWelcomeEmail(email, name);
    return res.json({ success: true, result });
  } catch (error) {
    console.error("[Signup Event Error] Email sending failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PC Kinba Email Backend Server running on http://localhost:${PORT}`);
});
