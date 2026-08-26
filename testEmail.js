import { sendWelcomeEmail } from "./mailer.js";

const testRecipient = "arkosaha61005@gmail.com";
const testName = "Test User";

console.log("==========================================");
console.log("Brevo SMTP Welcome Email Integration Test");
console.log("==========================================");
console.log(`Sending test welcome email to: ${testRecipient}`);

const result = await sendWelcomeEmail(testRecipient, testName);

if (result && result.messageId) {
  console.log("✅ SUCCESS: Test email delivered to SMTP relay!");
  console.log(`MessageId: ${result.messageId}`);
} else {
  console.log("⚠️ NOTICE: Email sending completed with notification.");
  console.log("If Brevo returned an Unauthorized IP or key error, please ensure your IP address is authorized in your Brevo Dashboard (SMTP & API -> Authorized IP Addresses).");
}
