const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🛡️ গোপন চাবি (App Key) যাচাইকরণ
  const appKey = req.headers['x-app-key'];
  if (!appKey || appKey !== process.env.APP_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing App Key' });
  }

  const { transactionId, amount, senderName, category } = req.body;
  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // টেলিগ্রাম মেসেজ ফরম্যাট (সুন্দর করে সাজানো)
    const message = `🔔 *নতুন ফান্ডেশন পেমেন্ট!*\n\n` +
                    `🔹 *ক্যাটাগরি:* ${category || 'ফান্ডেশন'}\n` +
                    `🔹 *ট্রানজেকশন আইডি:* \`${transactionId}\`\n` +
                    `🔹 *পরিমাণ:* ${amount || 'N/A'} BDT\n` +
                    `🔹 *প্রেরক:* ${senderName || 'অজানা'}\n`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to send Telegram message');
    }

    return res.status(200).json({ success: true, message: 'Notification sent successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
