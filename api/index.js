const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Initialization
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Auth: Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) return res.status(400).json({ success: false, message: error.message });
    res.json({ success: true, message: "Account created!", userId: data.user?.id });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ success: false, message: error.message });
    res.json({ success: true, message: "Logged in!", userId: data.user?.id });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Telegram Transaction Notification
app.post('/api/telegram/send-transaction', async (req, res) => {
  const { amount, category, transactionId, userEmail } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const message = `
🔔 *New Transaction Request*
--------------------------
👤 *User:* ${userEmail}
📂 *Category:* ${category}
💰 *Amount:* ${amount}
🔢 *Transaction ID:* ${transactionId}
--------------------------
Check your dashboard for details.
  `;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    if (result.ok) {
      res.json({ success: true, message: "Notification sent to Telegram!" });
    } else {
      res.status(400).json({ success: false, message: "Telegram error: " + result.description });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to send notification" });
  }
});

// Root check
app.get('/', (req, res) => res.send('Halal Circle API is Running!'));

module.exports = app;
