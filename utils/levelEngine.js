const { EmbedBuilder } = require('discord.js');
const UserLevel = require('../database/models/UserLevel');

// Cooldown map: userId -> lastXpTimestamp
const xpCooldowns = new Map();

/**
 * Mesaj yazıldığında XP ekler, seviye atlamayı ve ödül rollerini kontrol eder.
 */
async function processMessageXp(message, settings) {
    if (!settings || !settings.levelSystem?.enabled || !message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // 60 saniyelik Cooldown kontrolü
    const now = Date.now();
    const lastXp = xpCooldowns.get(`${guildId}-${userId}`) || 0;
    if (now - lastXp < 60000) return;

    xpCooldowns.set(`${guildId}-${userId}`, now);

    try {
        let userStats = await UserLevel.findOne({ guildId, userId });
        if (!userStats) {
            userStats = await UserLevel.create({ guildId, userId });
        }

        const xpGained = settings.levelSystem.xpPerMessage || 15;
        userStats.xp += xpGained;
        userStats.messages += 1;

        // Seviye Atlama Hesabı: Gerekli XP = Level * 100
        const neededXp = userStats.level * 100;

        if (userStats.xp >= neededXp) {
            userStats.level += 1;
            userStats.xp = userStats.xp - neededXp; // Artan XP devreder

            await userStats.save();

            // 1. Seviye Tebrik Mesajı
            const targetChannelId = settings.levelSystem.logChannel || message.channel.id;
            const targetChannel = message.guild.channels.cache.get(targetChannelId) || message.channel;

            if (targetChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#10B981')
                    .setTitle('🎉 Seviye Atladın!')
                    .setDescription(`Tebrikler <@${userId}>! **${userStats.level}. Seviyeye** ulaştın! 🚀`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                
                await targetChannel.send({ embeds: [embed] }).catch(() => {});
            }

            // 2. Ödül Rolü Kontrolü
            const rewards = settings.levelSystem.roleRewards || [];
            const reward = rewards.find(r => r.level === userStats.level);
            if (reward && reward.roleId) {
                try {
                    await message.member.roles.add(reward.roleId);
                    console.log(`[Level] ${message.author.tag} kullanıcısına ${reward.level}. seviye ödül rolü verildi.`);
                } catch (e) {
                    console.error('[Level] Ödül rolü verme hatası:', e.message);
                }
            }
        } else {
            await userStats.save();
        }
    } catch (e) {
        console.error('[Level] XP ekleme hatası:', e.message);
    }
}

module.exports = { processMessageXp };
