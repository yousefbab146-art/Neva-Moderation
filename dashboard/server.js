const express = require('express');
const cors = require('cors');
const path = require('path');
const GuildSettings = require('../database/models/GuildSettings');
const ModLog = require('../database/models/ModLog');
const Warn = require('../database/models/Warn');

function startDashboard(client) {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors({ origin: '*' }));
    app.use(express.json());

    // --- Statik Dosyalar (React Build) ---
    const buildPath = path.join(__dirname, 'public');
    if (require('fs').existsSync(buildPath)) {
        app.use(express.static(buildPath));
    }

    // ============================================================
    // API ROTALARI
    // ============================================================

    // Bot durumu
    app.get('/api/status', (req, res) => {
        res.json({
            online: client.isReady(),
            tag: client.user?.tag || 'Bilinmiyor',
            guilds: client.guilds.cache.size,
            uptime: process.uptime()
        });
    });

    // Sunucu listesi
    app.get('/api/guilds', (req, res) => {
        const guilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ dynamic: true }),
            memberCount: g.memberCount
        }));
        res.json(guilds);
    });

    // Sunucu detayı
    app.get('/api/guilds/:guildId', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Sunucu bulunamadı' });

        const settings = await GuildSettings.findOne({ guildId: guild.id }) || {};
        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
        const channels = guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true }),
            memberCount: guild.memberCount,
            roles,
            channels,
            settings
        });
    });

    // Ayarları güncelle
    app.post('/api/guilds/:guildId/settings', async (req, res) => {
        try {
            const settings = await GuildSettings.findOneAndUpdate(
                { guildId: req.params.guildId },
                { $set: req.body },
                { upsert: true, new: true }
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
    app.get('/api/guilds/:guildId/warns/:userId', async (req, res) => {
        const warns = await Warn.find({ guildId: req.params.guildId, userId: req.params.userId });
        res.json(warns);
    });

    // İstatistikler
    app.get('/api/guilds/:guildId/stats', async (req, res) => {
        const guildId = req.params.guildId;
        const [totalBans, totalKicks, totalWarns, totalMutes] = await Promise.all([
            ModLog.countDocuments({ guildId, type: { $in: ['ban', 'tempban'] } }),
            ModLog.countDocuments({ guildId, type: 'kick' }),
            ModLog.countDocuments({ guildId, type: 'warn' }),
            ModLog.countDocuments({ guildId, type: 'mute' })
        ]);

        // Son 7 gün
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentActions = await ModLog.find({ guildId, createdAt: { $gte: sevenDaysAgo } })
            .select('type createdAt');

        res.json({ totalBans, totalKicks, totalWarns, totalMutes, recentActions });
    });

    // Ping
    app.get('/', (req, res) => res.send('🛡️ Neva Moderation Dashboard API - Aktif!'));

    // SPA fallback (React Router için)
    app.get('/(.*)', (req, res) => {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (require('fs').existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.json({ message: 'Neva Moderation API çalışıyor.' });
        }
    });

    app.listen(PORT, () => {
        console.log(`[Dashboard] Web paneli http://localhost:${PORT} adresinde aktif!`);
    });
}

module.exports = startDashboard;
