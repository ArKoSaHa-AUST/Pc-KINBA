import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

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
export const sendWelcomeEmail = async (email, name) => {
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
            <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Hello ${name || "Builder"}, welcome aboard! 🎉</h2>
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
    console.log(`[Brevo SMTP] Welcome email sent successfully to ${email} (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Brevo SMTP Error] Failed to send welcome email to ${email}:`, error.message);
    // Return error status without throwing to ensure signup flow is not blocked
    return { success: false, error: error.message };
  }
};
