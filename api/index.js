const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ১. কনফিগারেশন চেক (Vercel Environment Variables থেকে আসবে)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

// ২. হেলথ চেক রুট (ব্রাউজারে গিয়ে https://আপনার-লিঙ্ক/api/health চেক করুন)
app.get('/api/health', (req, res) => {
    res.json({
        status: "Running",
        supabaseConfigured: !!supabase,
        telegramConfigured: !!(botToken && chatId)
    });
});

// ৩. সাইনআপ (Signup)
app.post('/api/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase Error: Config missing" });

    try {
        const { data, error } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        res.json({ success: true, message: "Account created!", userId: data.user.id });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ৪. লগইন (Login)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: "Supabase Error: Config missing" });

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.json({ success: true, message: "Logged in!", userId: data.user.id });
    } catch (err) {
        res.status(401).json({ success: false, message: err.message });
    }
});

// ৫. টেলিগ্রামে ট্রানজেকশন পাঠানো (Send Transaction)
app.post('/api/send-transaction', async (req, res) => {
    const { amount, transactionId, category, userEmail } = req.body;

    if (!botToken || !chatId) {
        return res.status(500).json({ success: false, message: "Backend Error: Telegram Token missing in Vercel settings" });
    }

    const text = `
🔔 *নতুন ট্রানজেকশন রিকোয়েস্ট*
--------------------------
💰 *পরিমাণ:* ${amount} BDT
📝 *TrxID:* ${transactionId}
📂 *ক্যাটাগরি:* ${category}
📧 *ইউজার:* ${userEmail}
--------------------------
`;

    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
        res.json({ success: true, message: "Telegram-এ পাঠানো হয়েছে!" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Telegram Error", detail: err.message });
    }
});

module.exports = app;
