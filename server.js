const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1510874861545721987/uR19WRgGyeLygpRj66vEluXnLjUS3qhaMWsC0Q4WynkLI9BOOJj2IGwC0dkpayoNi4Cn";

let donationQueue = [];

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

        // Kirim ke Discord
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
        } catch (err) {}
    }
    res.status(200).send("OK");
});

app.get('/roblox/fetch', (req, res) => {
    res.json(donationQueue);
    donationQueue = [];
});

app.listen(3000, () => console.log('Server Ready'));
module.exports = app;
