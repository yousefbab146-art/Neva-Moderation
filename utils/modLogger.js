const { EmbedBuilder } = require('discord.js');
const ModLog = require('../database/models/ModLog');

const ACTION_COLORS = {
    ban:      '#FF0000',
    tempban:  '#FF4500',
    unban:    '#00FF7F',
    kick:     '#FFA500',
    mute:     '#FFD700',
    unmute:   '#98FB98',
    warn:     '#FFFF00',
    jail:     '#8B008B',
    unjail:   '#DA70D6',
    purge:    '#1E90FF',
    lockdown: '#DC143C',
    unlock:   '#32CD32',
    slowmode: '#87CEEB'
};

const ACTION_EMOJIS = {
    ban:      '🔨',
    tempban:  '⏱️🔨',
    unban:    '✅',
    kick:     '👢',
    mute:     '🔇',
    unmute:   '🔊',
    warn:     '⚠️',
    jail:     '🔒',
    unjail:   '🔓',
    purge:    '🗑️',
    lockdown: '🚨',
    unlock:   '🔐',
    slowmode: '🐌'
};

const ACTION_NAMES = {
    ban:      'Ban',
    tempban:  'Geçici Ban',
    unban:    'Ban Kaldır',
    kick:     'Kick',
    mute:     'Sustur',
    unmute:   'Sesi Aç',
    warn:     'Uyarı',
    jail:     'Karantina',
    unjail:   'Karantina Kaldır',
    purge:    'Mesaj Temizle',
    lockdown: 'Sunucu Kilidi',
    unlock:   'Kilit Kaldır',
    slowmode: 'Yavaş Mod'
};

/**
 * Moderasyon kaydı oluşturur, veritabanına yazar ve log kanalına embed gönderir.
 * @param {Client} client - Discord client
 * @param {Guild} guild - Discord guild
 * @param {Object} data - İşlem verisi
 */
async function createModLog(client, guild, data) {
    const { type, user, moderator, reason, duration, settings } = data;

    // --- Veritabanına Kaydet ---
    try {
        await ModLog.create({
            guildId:   guild.id,
            type,
            userId:    user.id,
            userTag:   user.tag || user.username,
            moderator: moderator.id,
            modTag:    moderator.tag || moderator.username,
            reason:    reason || 'Sebep belirtilmedi.',
            duration:  duration || null
        });
    } catch (e) {
        console.error('[ModLog] Veritabanı kayıt hatası:', e.message);
    }

    // --- Log Kanalına Gönder ---
    const logChannelId = settings?.modLogChannel || settings?.logChannel;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(ACTION_COLORS[type] || '#5865F2')
        .setTitle(`${ACTION_EMOJIS[type] || '📋'} ${ACTION_NAMES[type] || type.toUpperCase()}`)
        .addFields(
            { name: '👤 Kullanıcı',   value: `<@${user.id}> (\`${user.tag || user.username}\`)`, inline: true },
            { name: '🛡️ Yetkili',     value: `<@${moderator.id}>`, inline: true },
            { name: '📝 Sebep',        value: reason || 'Sebep belirtilmedi.', inline: false }
        )
        .setThumbnail(user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

    if (duration) {
        embed.addFields({ name: '⏱️ Süre', value: duration, inline: true });
    }

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[ModLog] Log kanalı gönderim hatası:', e.message);
    }
}

module.exports = { createModLog };
