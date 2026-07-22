// Spam takibi için bellek
const spamMap = new Map(); // userId -> [timestamps]
const recentJoins = new Map(); // guildId -> [timestamps]

/**
 * Otomatik Moderasyon Sistemi
 */
async function handleAutomod(message, settings) {
    if (!settings?.automod?.enabled) return false;
    if (message.member?.permissions.has('ModerateMembers')) return false;

    const { automod, badWords } = settings;

    // --- Küfür Filtresi (Kapsamlı Türkçe + İngilizce Kütüphanesi) ---
    const defaultBadWords = [
        'amk', 'aq', 'amq', 'amına', 'amınakoyayım', 'amınagoyayım', 'sik', 'sikik', 'sikerim', 
        'siktim', 'sikiş', 'siktir', 'piç', 'yarrak', 'yarak', 'orospu', 'göt', 'götveren', 
        'oç', 'kahpe', 'dalyarak', 'ibne', 'taşşak', 'puşt', 'yavşak', 'gavat', 'yarram',
        'fuck', 'fucking', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'bastard', 'slut', 
        'whore', 'motherfucker', 'nigger', 'cock', 'pussy'
    ];

    const activeBadWords = (badWords && badWords.length > 0) ? badWords : defaultBadWords;

    if (automod.filterProfanity) {
        const lower = message.content.toLowerCase();
        if (activeBadWords.some(w => lower.includes(w.toLowerCase()))) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `⚠️ ${message.author}, uygunsuz kelime kullanımı! Bu mesaj silindi.`
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    // --- Link / Davet Filtresi ---
    if (automod.filterLinks || automod.filterInvites) {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        const inviteRegex = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
        const hasLink = linkRegex.test(message.content);
        const hasInvite = inviteRegex.test(message.content);

        if ((automod.filterLinks && hasLink) || (automod.filterInvites && hasInvite)) {
            await message.delete().catch(() => {});
            await message.channel.send({
                content: `⚠️ ${message.author}, bu kanalda link/davet paylaşımı yasak!`
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            return true;
        }
    }

    // --- Spam Koruma ---
    if (automod.antiSpam) {
        const threshold = automod.spamThreshold || 5;
        const interval = automod.spamInterval || 5000;
        const userId = message.author.id;
        const now = Date.now();

        if (!spamMap.has(userId)) spamMap.set(userId, []);
        const timestamps = spamMap.get(userId).filter(t => now - t < interval);
        timestamps.push(now);
        spamMap.set(userId, timestamps);

        if (timestamps.length >= threshold) {
            spamMap.delete(userId);
            try {
                await message.member.timeout(5 * 60 * 1000, 'Otomatik: Spam');
                await message.channel.send({
                    content: `🚨 ${message.author} spam yapma sebebiyle **5 dakika** susturuldu!`
                }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
            } catch (_) {}
            return true;
        }
    }

    // --- Oto-Cevap ---
    if (settings.autoResponders?.length) {
        const lower = message.content.toLowerCase().trim();
        const ar = settings.autoResponders.find(a => lower.includes(a.trigger.toLowerCase()));
        if (ar) {
            await message.reply(ar.response).catch(() => {});
        }
    }

    return false;
}

/**
 * Raid Koruma - Yeni Üye Girişini Takip Et
 */
async function handleRaidCheck(member, settings) {
    if (!settings?.automod?.antiRaid) return;

    const guildId = member.guild.id;
    const now = Date.now();

    if (!recentJoins.has(guildId)) recentJoins.set(guildId, []);
    const joins = recentJoins.get(guildId).filter(t => now - t < 10000); // Son 10 saniye
    joins.push(now);
    recentJoins.set(guildId, joins);

    // 10 saniyede 10'dan fazla kişi girerse Raid olarak algıla
    if (joins.length >= 10) {
        recentJoins.delete(guildId);
        // Tüm text kanallarını kilitle
        const channels = member.guild.channels.cache.filter(c => c.isTextBased());
        for (const [, ch] of channels) {
            await ch.permissionOverwrites.edit(member.guild.id, { SendMessages: false }).catch(() => {});
        }
        // Log kanalına bildir
        const logCh = member.guild.channels.cache.get(settings.logChannel || settings.modLogChannel);
        if (logCh) {
            await logCh.send({
                content: '@everyone',
                embeds: [{
                    color: 0xDC143C,
                    title: '🚨 RAİD ALGILANDI - SUNUCU OTOMATİK KİLİTLENDİ',
                    description: '10 saniye içinde 10+ kişi katıldı. Tüm kanallar kilitlendi!\n`/lockdown aç` komutuyla kilidi kaldırabilirsiniz.',
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});
        }
    }
}

module.exports = { handleAutomod, handleRaidCheck };
