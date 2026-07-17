const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize Supabase
let supabase;
try {
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("Supabase Init Error:", e.message);
}

// Health check to debug env variables
app.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: "ok",
        supabaseConfigured: !!supabase,
        telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    });
});

// Helper for Auth Routes
const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.json({ success: true, message: "Logged in successfully", userId: data.user.id });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

const handleSignup = async (req, res) => {
    // Added 'username' to match Android App update
    const { email, password, fullName, username } = req.body;
    
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { 
                data: { 
                    full_name: fullName || 'User',
                    username: username || email.split('@')[0]
                } 
            }
        });
        if (error) throw error;
        res.json({ success: true, message: "Account created successfully", userId: data?.user?.id });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const handleTelegram = async (req, res) => {
    const { amount, transactionId, category, userEmail } = req.body;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return res.status(500).json({ success: false, message: "Telegram not configured on server" });
    }

    const message = `
🔔 *নতুন ট্রানজেকশন রিকোয়েস্ট*
--------------------------
💰 *পরিমাণ:* ${amount} BDT
📝 *ID:* ${transactionId}
📁 *ক্যাটাগরি:* ${category}
📧 *ইউজার:* ${userEmail}
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
        res.status(400).json({ success: false, message: "Telegram Error", detail: error.message });
    }
};

// Routes (Supporting all Vercel rewrite patterns)
app.post('/api/login', handleLogin);
app.post('/login', handleLogin);
app.post('/api/auth/login', handleLogin);
app.post('/auth/login', handleLogin);

app.post('/api/signup', handleSignup);
app.post('/signup', handleSignup);
app.post('/api/auth/signup', handleSignup);
app.post('/auth/signup', handleSignup);

app.post('/api/send-transaction', handleTelegram);
app.post('/send-transaction', handleTelegram);
app.post('/api/telegram/send-transaction', handleTelegram);
app.post('/telegram/send-transaction', handleTelegram);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

module.exports = app;
