const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// ==========================================
// [ KONFIGURASI WEBHOOK & SPREADSHEET ]
// ==========================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1510874861545721987/uR19WRgGyeLygpRj66vEluXnLjUS3qhaMWsC0Q4WynkLI9BOOJj2IGwC0dkpayoNi4Cn";
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbzGkh2CFbWGL2dTtBaeQqgCkZhuJciyT2-XtM3ZMtdxcBu9YMBQ9us4m-Qurn2Yev4/exec";

// ==========================================
// [ PENYIMPANAN DATA SEMENTARA (MEMORY) ]
// ==========================================
let donationQueue = []; // Antrean khusus untuk ditarik oleh Roblox (Akan dihapus setelah ditarik)
let donationHistory = []; // Menyimpan riwayat untuk ditampilkan di website (Maksimal 100 data)
let totalSessionDonation = 0; // Total uang yang masuk selama server hidup

// ==========================================
// [ TAMPILAN WEBSITE (FRONTEND DASHBOARD) ]
// ==========================================
app.get('/', (req, res) => {
    // Menyajikan HTML + TailwindCSS langsung dari Backend
    const htmlDashboard = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Never Home - Donation Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; background-color: #0f0f13; color: #f0f0f5; }
            .font-code { font-family: 'Space Mono', monospace; }
            .glass-panel { background: rgba(30, 30, 35, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 42, 42, 0.2); }
            .glow-text { text-shadow: 0 0 10px rgba(255, 42, 42, 0.8); }
            /* Custom Scrollbar */
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #1a1a20; }
            ::-webkit-scrollbar-thumb { background: #ff2a2a; border-radius: 4px; }
        </style>
    </head>
    <body class="min-h-screen flex flex-col items-center p-4 md:p-10">
        
        <!-- Header -->
        <header class="w-full max-w-5xl flex justify-between items-center mb-8 glass-panel p-4 rounded-xl">
            <div>
                <h1 class="text-2xl font-extrabold tracking-wider"><span class="text-[#ff2a2a] glow-text">NEVER HOME</span> SERVER</h1>
                <p class="text-sm text-gray-400 font-code">Live Donation Gateway Active</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span class="font-bold text-green-400 text-sm">ONLINE</span>
            </div>
        </header>

        <!-- Stats Container -->
        <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="glass-panel p-6 rounded-xl border-l-4 border-l-[#ff2a2a]">
                <h3 class="text-gray-400 text-sm font-semibold mb-1">TOTAL DONASI (SESSION)</h3>
                <h2 id="totalDonation" class="text-4xl font-bold font-code text-green-400">Rp 0</h2>
            </div>
            <div class="glass-panel p-6 rounded-xl border-l-4 border-l-blue-500">
                <h3 class="text-gray-400 text-sm font-semibold mb-1">STATUS ANTREAN ROBLOX</h3>
                <h2 id="queueCount" class="text-4xl font-bold font-code text-blue-400">0 <span class="text-lg text-gray-400">Pending</span></h2>
            </div>
        </div>

        <!-- History Table -->
        <main class="w-full max-w-5xl glass-panel rounded-xl overflow-hidden shadow-2xl">
            <div class="p-5 border-b border-gray-800 bg-[#15151a]">
                <h2 class="text-lg font-bold">📄 Riwayat Transaksi Terbaru</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-[#1a1a20] text-gray-400 text-sm border-b border-gray-800">
                            <th class="p-4 font-semibold">WAKTU</th>
                            <th class="p-4 font-semibold">PENGIRIM</th>
                            <th class="p-4 font-semibold">NOMINAL</th>
                            <th class="p-4 font-semibold">PESAN</th>
                        </tr>
                    </thead>
                    <tbody id="historyTable" class="text-sm font-code">
                        <!-- Data akan dimasukkan oleh JavaScript -->
                        <tr><td colspan="4" class="p-4 text-center text-gray-500">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
        </main>

        <script>
            // Fungsi untuk mengambil data dari Backend secara Live (Setiap 3 detik)
            async function fetchStats() {
                try {
                    const response = await fetch('/api/stats');
                    const data = await response.json();

                    // Update Angka Total & Antrean
                    document.getElementById('totalDonation').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.sessionTotal);
                    document.getElementById('queueCount').innerHTML = data.queueCount + ' <span class="text-lg text-gray-400">Pending</span>';

                    // Update Tabel History
                    const tbody = document.getElementById('historyTable');
                    if (data.history.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Belum ada donasi masuk pada sesi ini.</td></tr>';
                        return;
                    }

                    tbody.innerHTML = '';
                    data.history.forEach(item => {
                        const row = document.createElement('tr');
                        row.className = "border-b border-gray-800 hover:bg-[#1a1a22] transition-colors";
                        row.innerHTML = \`
                            <td class="p-4 text-gray-400">\${new Date(item.timestamp).toLocaleTimeString('id-ID')}</td>
                            <td class="p-4 font-bold text-white">\${item.donator_name}</td>
                            <td class="p-4 font-bold text-green-400">Rp \${item.amount.toLocaleString('id-ID')}</td>
                            <td class="p-4 text-gray-300 italic">"\${item.message}"</td>
                        \`;
                        tbody.appendChild(row);
                    });
                } catch (error) {
                    console.error("Gagal mengambil data", error);
                }
            }

            // Jalankan fungsi saat web dibuka, lalu ulangi setiap 3 detik
            fetchStats();
            setInterval(fetchStats, 3000);
        </script>
    </body>
    </html>
    `;
    res.send(htmlDashboard);
});

// ==========================================
// [ API UNTUK WEBSITE MENGAMBIL DATA (AJAX) ]
// ==========================================
app.get('/api/stats', (req, res) => {
    res.json({
        sessionTotal: totalSessionDonation,
        queueCount: donationQueue.length,
        history: donationHistory
    });
});

// ==========================================
// [ SAWERIA WEBHOOK HANDLER (MASUK DATA) ]
// ==========================================
app.post('/webhook/saweria', async (req, res) => {
    const data = req.body;
    
    const donation = {
        donator_name: data.donator_name || data.name || "Anonymous",
        amount: parseInt(data.amount_raw || data.amount || 0),
        message: data.message || "No message.",
        platform: "Saweria",
        timestamp: new Date().toISOString() // Simpan waktu masuknya donasi
    };

    if (donation.amount > 0) {
        // 1. Simpan ke Antrean Roblox
        donationQueue.push(donation);
        
        // 2. Simpan ke Riwayat Website & Kalkulasi Total
        totalSessionDonation += donation.amount;
        donationHistory.unshift(donation); // Masukkan ke urutan teratas
        if (donationHistory.length > 100) donationHistory.pop(); // Batasi tabel web maksimal 100 baris agar tidak lag

        // 3. KIRIM NOTIFIKASI KE DISCORD
        const embedPayload = {
            username: "NEVER HOME SYSTEM",
            embeds: [{
                title: "💎 Donasi Masuk!",
                color: 16766720,
                fields: [
                    { name: "👤 Pengirim", value: `**${donation.donator_name}**`, inline: true },
                    { name: "💰 Nominal", value: `**Rp ${donation.amount.toLocaleString('id-ID')}**`, inline: true },
                    { name: "💬 Pesan", value: `"${donation.message}"`, inline: false }
                ],
                footer: { text: "Saweria Gateway" },
                timestamp: donation.timestamp
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

        // 4. CATAT TRANSAKSI KE GOOGLE SPREADSHEET
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

// ==========================================
// [ ROBLOX FETCH HANDLER (MENGAMBIL ANTREAN) ]
// ==========================================
app.get('/roblox/fetch', (req, res) => {
    // Kirim antrean ke Roblox
    res.json(donationQueue);
    // Kosongkan antrean HANYA untuk Roblox (Data di Website tetap aman di donationHistory)
    donationQueue = [];
});

app.listen(3000, () => console.log('Server Ready'));
module.exports = app;
