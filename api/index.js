const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase safely
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

// Telegram Bot Details
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Health check to debug env variables
app.get('/api/health', (req, res) => {
    res.json({
        status: "ok",
        supabaseConfigured: !!supabase,
        telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    });
});

// 1. Auth: Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase not configured" });

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.json({ success: true, message: "Logged in successfully", userId: data.user.id });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
});

// 2. Auth: Signup
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase not configured" });

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        res.json({ success: true, message: "Account created successfully", userId: data.user.id });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// 3. Telegram: Send Transaction
app.post('/api/telegram/send-transaction', async (req, res) => {
    const { amount, transactionId, category, userEmail } = req.body;
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return res.status(500).json({ success: false, message: "Telegram bot not configured" });
    }

    const message = `
ðŸ”” *New Transaction Request*
--------------------------
ðŸ’° *Amount:* ${amount}
ðŸ“ *ID:* ${transactionId}
ðŸ“‚ *Category:* ${category}
ðŸ“§ *User:* ${userEmail}
--------------------------
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        res.json({ success: true, message: "Transaction sent to Telegram" });
    } catch (error) {
        console.error("Telegram error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Telegram API Error", detail: error.response?.data?.description });
    }
});

module.exports = app;
