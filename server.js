const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// URL Webhook Discord & Spreadsheet kamu sudah terpasang!
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1510874861545721987/uR19WRgGyeLygpRj66vEluXnLjUS3qhaMWsC0Q4WynkLI9BOOJj2IGwC0dkpayoNi4Cn";
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbzGkh2CFbWGL2dTtBaeQqgCkZhuJciyT2-XtM3ZMtdxcBu9YMBQ9us4m-Qurn2Yev4/exec";

let donationQueue = [];

app.get('/', (req, res) => {
    res.send("Backend Saweria untuk Roblox AKTIF! 🚀 SERVER STATUS: ONLINE");
});

app.post('/webhook/saweria', async (req, res) => {
    const data = req.body;
    
    const donation = {
        donator_name: data.donator_name || data.name || "Anonymous",
        amount: parseInt(data.amount_raw || data.amount || 0),
        message: data.message || "No message.",
        platform: "Saweria"
    };

    if (donation.amount > 0) {
        donationQueue.push(donation);

        // 1. KIRIM NOTIFIKASI KE DISCORD
        const embedPayload = {
            username: "NEVER HOME SYSTEM",
            embeds: [{
                title: "💎 Donasi Masuk!",
                color: 16766720,
                fields: [
                    { name: "👤 Pengirim", value: `**${donation.donator_name}**`, inline: true },
                    { name: "💰 Nominal", value: `**Rp ${donation.amount.toLocaleString('id-ID')}**`, inline: true },
                    { name: "💬 Pesan", value: `"${donation.message}"`, inline: false }
                ]
            }]
        };

        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embedPayload)
            });
        } catch (err) {
            console.error("Gagal ke Discord:", err);
        }

        // 2. CATAT TRANSAKSI KE GOOGLE SPREADSHEET
        try {
            await fetch(SPREADSHEET_URL, {
                method: 'POST',
                body: JSON.stringify({
                    nama: donation.donator_name,
                    platform: "Saweria (Rp)",
                    nominal: donation.amount,
                    pesan: donation.message
                })
            });
        } catch (err) { 
            console.error("Gagal ke Spreadsheet:", err); 
        }
    }
    res.status(200).send("OK");
});

app.get('/roblox/fetch', (req, res) => {
    res.json(donationQueue);
    donationQueue = [];
});

app.listen(3000, () => console.log('Server Ready'));
module.exports = app;
