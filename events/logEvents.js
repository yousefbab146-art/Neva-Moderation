const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const GuildSettings = require('../../database/models/GuildSettings');

// Kısa sürede silinen/oluşturulan kanal/rol sayısını takip et (Anti-Nuke)
const nukeTracker = new Map(); // executorId -> { count, timer }

async function getLog(guild, settings) {
    const id = settings?.logChannel;
    if (!id) return null;
    return guild.channels.cache.get(id) || null;
}

function sendLog(channel, embed) {
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
    // ---- Mesaj Silindi ----
    async messageDelete(message) {
        if (message.partial || message.author?.bot) return;
        const settings = await GuildSettings.findOne({ guildId: message.guild?.id });
        const logChannel = await getLog(message.guild, settings);
        sendLog(logChannel, new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('🗑️ Mesaj Silindi')
            .addFields(
                { name: '👤 Kullanıcı', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
                { name: '📌 Kanal',     value: `<#${message.channel.id}>`, inline: true },
                { name: '💬 İçerik',    value: message.content?.slice(0, 1020) || '*[Yok]*' }
            )
            .setTimestamp()
        );
    },

    // ---- Mesaj Düzenlendi ----
    async messageUpdate(oldMsg, newMsg) {
        if (oldMsg.partial || newMsg.partial || newMsg.author?.bot) return;
        if (oldMsg.content === newMsg.content) return;
        const settings = await GuildSettings.findOne({ guildId: newMsg.guild?.id });
        const logChannel = await getLog(newMsg.guild, settings);
        sendLog(logChannel, new EmbedBuilder()
            .setColor('#FFA07A')
            .setTitle('✏️ Mesaj Düzenlendi')
            .setURL(newMsg.url)
            .addFields(
                { name: '👤 Kullanıcı', value: `${newMsg.author.tag}`, inline: true },
                { name: '📌 Kanal',     value: `<#${newMsg.channel.id}>`, inline: true },
                { name: '📄 Eski',      value: oldMsg.content?.slice(0, 500) || '*[Yok]*' },
                { name: '📄 Yeni',      value: newMsg.content?.slice(0, 500) || '*[Yok]*' }
            )
            .setTimestamp()
        );
    },

    // ---- Üye Katıldı ----
    async guildMemberAdd(member) {
        const settings = await GuildSettings.findOne({ guildId: member.guild.id });
        const logChannel = await getLog(member.guild, settings);

        const accountAge = Date.now() - member.user.createdTimestamp;
        const isNew = accountAge < 7 * 24 * 60 * 60 * 1000; // 7 günden yeni

        sendLog(logChannel, new EmbedBuilder()
            .setColor(isNew ? '#FF4500' : '#00FF7F')
            .setTitle(isNew ? '⚠️ Yeni Hesap Katıldı!' : '✅ Üye Katıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı',    value: `${member.user.tag} (<@${member.user.id}>)`, inline: true },
                { name: '📅 Hesap Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Üye Sayısı',  value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp()
        );

        // Hoş geldin mesajı
        if (settings?.welcome?.enabled && settings.welcome.channelId) {
            const welcomeCh = member.guild.channels.cache.get(settings.welcome.channelId);
            if (welcomeCh) {
                const msg = (settings.welcome.message || 'Sunucumuza hoş geldin {user}!')
                    .replace('{user}', `<@${member.user.id}>`)
                    .replace('{server}', member.guild.name)
                    .replace('{count}', member.guild.memberCount);
                welcomeCh.send({ content: msg }).catch(() => {});
            }
        }
    },

    // ---- Üye Ayrıldı ----
    async guildMemberRemove(member) {
        const settings = await GuildSettings.findOne({ guildId: member.guild.id });
        const logChannel = await getLog(member.guild, settings);
        sendLog(logChannel, new EmbedBuilder()
            .setColor('#808080')
            .setTitle('👋 Üye Ayrıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı',  value: `${member.user.tag} (<@${member.user.id}>)`, inline: true },
                { name: '👥 Üye Sayısı', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp()
        );
    },

    // ---- Ses Kanalı Hareketleri ----
    async voiceStateUpdate(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;
        const settings = await GuildSettings.findOne({ guildId: member.guild.id });
        const logChannel = await getLog(member.guild, settings);
        if (!logChannel) return;

        if (!oldState.channel && newState.channel) {
            sendLog(logChannel, new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('🔊 Ses Kanalına Katıldı')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: '🔊 Kanal',     value: `${newState.channel.name}`, inline: true }
                ).setTimestamp()
            );
        } else if (oldState.channel && !newState.channel) {
            sendLog(logChannel, new EmbedBuilder()
                .setColor('#778899')
                .setTitle('🔇 Ses Kanalından Ayrıldı')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: '🔇 Kanal',     value: `${oldState.channel.name}`, inline: true }
                ).setTimestamp()
            );
        } else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
            sendLog(logChannel, new EmbedBuilder()
                .setColor('#6495ED')
                .setTitle('🔄 Ses Kanalı Değiştirdi')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: '⬅️ Eski',      value: oldState.channel.name, inline: true },
                    { name: '➡️ Yeni',      value: newState.channel.name, inline: true }
                ).setTimestamp()
            );
        }
    },

    // ---- Rol Değişiklikleri ----
    async guildMemberUpdate(oldMember, newMember) {
        const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (!added.size && !removed.size) return;

        const settings = await GuildSettings.findOne({ guildId: newMember.guild.id });
        const logChannel = await getLog(newMember.guild, settings);

        if (added.size) {
            sendLog(logChannel, new EmbedBuilder()
                .setColor('#00FA9A')
                .setTitle('➕ Rol Verildi')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${newMember.user.tag}`, inline: true },
                    { name: '🎭 Roller',    value: added.map(r => `<@&${r.id}>`).join(', '), inline: true }
                ).setTimestamp()
            );
        }
        if (removed.size) {
            sendLog(logChannel, new EmbedBuilder()
                .setColor('#FF6347')
                .setTitle('➖ Rol Alındı')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${newMember.user.tag}`, inline: true },
                    { name: '🎭 Roller',    value: removed.map(r => `<@&${r.id}>`).join(', '), inline: true }
                ).setTimestamp()
            );
        }
    },

    // ---- Anti-Nuke: Kanal Silindi ----
    async channelDelete(channel) {
        if (!channel.guild) return;
        const settings = await GuildSettings.findOne({ guildId: channel.guild.id });
        if (!settings?.automod?.antiNuke) return;

        const entry = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 })
            .then(a => a.entries.first()).catch(() => null);
        if (!entry) return;

        const executor = entry.executor;
        if (!executor || executor.id === channel.guild.ownerId) return;

        const key = executor.id;
        if (!nukeTracker.has(key)) nukeTracker.set(key, { count: 0, timer: null });
        const t = nukeTracker.get(key);
        t.count++;

        clearTimeout(t.timer);
        t.timer = setTimeout(() => nukeTracker.delete(key), 10000);

        if (t.count >= 3) {
            nukeTracker.delete(key);
            const member = await channel.guild.members.fetch(executor.id).catch(() => null);
            if (member && member.kickable) {
                await member.roles.set([], 'Anti-Nuke: Şüpheli toplu silme').catch(() => {});
                const logCh = channel.guild.channels.cache.get(settings.modLogChannel || settings.logChannel);
                if (logCh) logCh.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#8B0000')
                        .setTitle('🛡️ ANTİ-NUKE DEVREYE GİRDİ!')
                        .setDescription(`${executor.tag} kullanıcısı **10 saniye içinde 3+ kanal sildi!**\nTüm rolleri otomatik kaldırıldı!`)
                        .setTimestamp()
                    ]
                }).catch(() => {});
            }
        }
    }
};
