import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "10", 10);
const TEST_MODE = process.env.TEST_MODE === "true";
const TEST_EMAIL = process.env.TEST_EMAIL;
const baseUrl = "https://referral-hub-uid6.vercel.app/";

function htmlContent(userId) {
  return `
    <div style="font-size: 1.3em; font-family: Arial, sans-serif;">
      <p>Hi there!</p>
      <p>Our new forum-style feed on ShareHub is live! 🚀</p>
      <ul>
        <li>✨ <strong>Ask & Share posts</strong> – quickly see what’s new</li>
        <li>👍 <strong>Voting</strong> – upvote or downvote posts</li>
        <li>🕒 <strong>Metadata</strong> – expiration dates & URLs neatly organized</li>
      </ul>
      <p>Explore now: <a href="${baseUrl}">Go to ShareHub</a></p>
      <p>— The ShareHub Team</p>
    </div>
  `;
}

async function fetchUsers() {
  if (TEST_MODE && TEST_EMAIL) {
    return [{ id: "test-user", email: TEST_EMAIL }];
  }
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  if (!data?.users || !Array.isArray(data.users)) {
    console.error("No user data found or data is not an array.");
    return [];
  }

  const users = data.users
    .filter((user) => user.email)
    .map((user) => ({ id: user.id, email: user.email }));

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return users;
}

async function sendEmail(user) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: user.email,
    subject: TEST_MODE ? "Test: Try the New ShareHub Feed!" : "Try the new ShareHub!",
    html: htmlContent(user.id),
  });
  console.log(`Sent email to ${user.email}`);
}

async function main() {
  const users = await fetchUsers();
  console.log(`Sending emails to ${users.length} user(s)`);

  if (TEST_MODE) {
    // Only one test email
    await sendEmail(users[0]);
    console.log("Test email sent. Exiting...");
    return;
  }

  // Full batch send
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((user) => sendEmail(user)));
    console.log(`Batch ${i / BATCH_SIZE + 1} sent.`);

    // Wait 5 seconds between batches to reduce Gmail limits
    await new Promise((res) => setTimeout(res, 5000));
  }

  console.log("All emails sent.");
}

main().catch(console.error);
