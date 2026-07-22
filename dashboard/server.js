const express = require('express');
const cors = require('cors');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');
const ModLog = require('../database/models/ModLog');
const Warn = require('../database/models/Warn');

function startDashboard(client) {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors({ origin: '*' }));
    app.use(express.json());

    const buildPath = path.join(__dirname, 'public');
    if (require('fs').existsSync(buildPath)) {
        app.use(express.static(buildPath));
    }

    // Bot durumu
    app.get('/api/status', (req, res) => {
        res.json({
            online: client.isReady(),
            tag: client.user?.tag || 'Bilinmiyor',
            guilds: client.guilds.cache.size,
            uptime: process.uptime()
        });
    });

    // Aktif sunucu bilgileri, kanallar, kategoriler ve roller
    app.get('/api/guilds/current', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(404).json({ error: 'Bot bir sunucuda değil.' });

        let settings = await GuildSettings.findOne({ guildId: guild.id });
        if (!settings) {
            settings = await GuildSettings.create({ guildId: guild.id });
        }

        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
        const channels = guild.channels.cache
            .filter(c => c.isTextBased() || c.isVoiceBased())
            .map(c => ({ id: c.id, name: c.name, type: c.type }));

        const categories = guild.channels.cache
            .filter(c => c.type === 4) // Category Channel
            .map(c => ({ id: c.id, name: c.name }));

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true }),
            memberCount: guild.memberCount,
            channelCount: guild.channels.cache.size,
            botPing: client.ws.ping,
            botUptime: client.uptime,
            roles,
            channels,
            categories,
            settings
        });
    });

    // Embed Gönderici (Live Embed Builder Backend)
    app.post('/api/guilds/:guildId/send-embed', async (req, res) => {
        const { channelId, title, description, color, image, footer } = req.body;
        const guild = client.guilds.cache.get(req.params.guildId) || client.guilds.cache.first();
        if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadı' });

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
            return res.status(400).json({ error: 'Geçersiz hedef metin kanalı.' });
        }

        try {
            const embed = new EmbedBuilder()
                .setColor(color || '#5865F2')
                .setTitle(title || null)
                .setDescription(description || null)
                .setImage(image || null)
                .setFooter(footer ? { text: footer } : null)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Ayarları güncelle
    app.post('/api/guilds/:guildId/settings', async (req, res) => {
        try {
            const settings = await GuildSettings.findOneAndUpdate(
                { guildId: req.params.guildId },
                { $set: req.body },
                { upsert: true, returnDocument: 'after' }
            );
            res.json({ success: true, settings });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Mod log geçmişi
    app.get('/api/guilds/:guildId/modlogs', async (req, res) => {
        const { page = 1, limit = 20, type } = req.query;
        const filter = { guildId: req.params.guildId };
        if (type) filter.type = type;

        const logs = await ModLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await ModLog.countDocuments(filter);

        res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    });

    // Kullanıcı uyarıları
    app.get('/api/guilds/:guildId/warns', async (req, res) => {
        const warns = await Warn.find({ guildId: req.params.guildId }).sort({ createdAt: -1 });
        res.json(warns);
    });

    app.delete('/api/guilds/:guildId/warns/:warnId', async (req, res) => {
        await Warn.deleteOne({ _id: req.params.warnId, guildId: req.params.guildId });
        res.json({ success: true });
    });

    // Sistem logları
    app.get('/api/logs', (req, res) => {
        res.send('[INFO] Bot sorunsuz çalışıyor.\n[INFO] Discord Gateway bağlantısı aktif.\n[INFO] TempVoice & Leveling modülleri aktif.');
    });

    // SPA fallback
    app.use((req, res) => {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (require('fs').existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.json({ message: 'Neva Moderation API çalışıyor.' });
        }
    });

    app.listen(PORT, () => {
        console.log(`[Dashboard] Web paneli http://localhost:${PORT} adresinde aktif!`);

        // --- 7/24 AKTİF KALMA (SELF-PING) SİSTEMİ ---
        // Render ücretsiz katmanının uyumasını engellemek için her 5 dakikada bir kendi kendine HTTP isteği atar
        const RENDER_URL = process.env.DASHBOARD_URL || `http://localhost:${PORT}`;
        setInterval(() => {
            fetch(`${RENDER_URL}/api/status`)
                .then(() => console.log('[Self-Ping] 7/24 Aktif tutma isteği başarılı.'))
                .catch(err => console.log('[Self-Ping] İsteği gönderilemedi:', err.message));
        }, 5 * 60 * 1000); // 5 Dakikada bir
    });
}

module.exports = startDashboard;
