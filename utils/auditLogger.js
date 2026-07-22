const { EmbedBuilder } = require('discord.js');

/**
 * Mesaj Silinme Logu Gönderir
 */
async function logMessageDelete(message, settings) {
    if (!settings || !settings.messageLogChannel || !message.guild || message.author?.bot) return;

    const channel = message.guild.channels.cache.get(settings.messageLogChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#EF4444')
        .setTitle('🗑️ Mesaj Silindi')
        .addFields(
            { name: '👤 Yazan', value: `<@${message.author.id}> (\`${message.author.tag}\`)`, inline: true },
            { name: '📍 Kanal', value: `<#${message.channel.id}>`, inline: true },
            { name: '💬 İçerik', value: message.content ? (message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content) : '*Metin yok (Görsel veya embed)*', inline: false }
        )
        .setFooter({ text: `Mesaj ID: ${message.id} | Kullanıcı ID: ${message.author.id}` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[AuditLogger] Mesaj silme logu gönderilemedi:', e.message);
    }
}

/**
 * Mesaj Düzenleme Logu Gönderir
 */
async function logMessageUpdate(oldMessage, newMessage, settings) {
    if (!settings || !settings.messageLogChannel || !oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Sadece embed güncellemesi olabilir

    const channel = oldMessage.guild.channels.cache.get(settings.messageLogChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setTitle('✏️ Mesaj Düzenlendi')
        .addFields(
            { name: '👤 Yazan', value: `<@${oldMessage.author.id}> (\`${oldMessage.author.tag}\`)`, inline: true },
            { name: '📍 Kanal', value: `<#${oldMessage.channel.id}>`, inline: true },
            { name: '🔴 Eski Mesaj', value: oldMessage.content ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content) : '*Boş*', inline: false },
            { name: '🟢 Yeni Mesaj', value: newMessage.content ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content) : '*Boş*', inline: false }
        )
        .setFooter({ text: `Mesaj ID: ${oldMessage.id}` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[AuditLogger] Mesaj düzenleme logu gönderilemedi:', e.message);
    }
}

/**
 * Ses Kanalı Hareket Logu Gönderir
 */
async function logVoiceState(oldState, newState, settings) {
    if (!settings || !settings.voiceLogChannel) return;

    const channel = newState.guild.channels.cache.get(settings.voiceLogChannel);
    if (!channel) return;

    const member = newState.member;
    if (!member || member.user.bot) return;

    let title = '';
    let description = '';
    let color = '#3B82F6';

    // Sese Katıldı
    if (!oldState.channelId && newState.channelId) {
        title = '🔊 Sese Katıldı';
        description = `<@${member.id}> üyesi <#${newState.channelId}> kanalına katıldı.`;
        color = '#10B981';
    } 
    // Sesten Ayrıldı
    else if (oldState.channelId && !newState.channelId) {
        title = '🔇 Sesten Ayrıldı';
        description = `<@${member.id}> üyesi <#${oldState.channelId}> kanalından ayrıldı.`;
        color = '#EF4444';
    } 
    // Kanal Değiştirdi
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        title = '🔄 Ses Kanalı Değiştirdi';
        description = `<@${member.id}> üyesi <#${oldState.channelId}> kanalından <#${newState.channelId}> kanalına geçti.`;
        color = '#F59E0B';
    } else {
        return; // Mute/deafen olaylarını şimdilik atla
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: `Kullanıcı ID: ${member.id}` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[AuditLogger] Ses logu gönderilemedi:', e.message);
    }
}

/**
 * Üye Katıldı / Ayrıldı Logu Gönderir
 */
async function logMemberJoinLeave(member, eventType, settings) {
    if (!settings || !settings.memberLogChannel) return;

    const channel = member.guild.channels.cache.get(settings.memberLogChannel);
    if (!channel) return;

    const isJoin = eventType === 'join';
    const embed = new EmbedBuilder()
        .setColor(isJoin ? '#10B981' : '#EF4444')
        .setTitle(isJoin ? '📥 Üye Katıldı' : '📤 Üye Ayrıldı')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '👤 Üye', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
            { name: '📅 Hesap Kuruluş', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Toplam Üye: ${member.guild.memberCount} | ID: ${member.id}` })
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('[AuditLogger] Üye join/leave logu gönderilemedi:', e.message);
    }
}

module.exports = {
    logMessageDelete,
    logMessageUpdate,
    logVoiceState,
    logMemberJoinLeave
};
