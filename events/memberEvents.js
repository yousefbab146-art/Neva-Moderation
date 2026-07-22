const GuildSettings = require('../database/models/GuildSettings');
const { logMemberJoinLeave } = require('../utils/auditLogger');
const { processMemberGuard } = require('../utils/guardEngine');

module.exports = (client) => {
    // Üye Katıldı
    client.on('guildMemberAdd', async (member) => {
        if (!member.guild) return;

        try {
            const settings = await GuildSettings.findOne({ guildId: member.guild.id });
            
            // 1. Guard & Oto-Rol İşlemleri
            await processMemberGuard(member, settings);

            // 2. Audit Log (Giriş Logu)
            await logMemberJoinLeave(member, 'join', settings);

            // 3. Hoş Geldin Mesajı
            if (settings?.welcome?.enabled && settings.welcome.channelId) {
                const channel = member.guild.channels.cache.get(settings.welcome.channelId);
                if (channel) {
                    let msg = settings.welcome.message || 'Hoş geldin {user}!';
                    msg = msg.replace('{user}', `<@${member.id}>`)
                             .replace('{username}', member.user.username)
                             .replace('{server}', member.guild.name)
                             .replace('{memberCount}', member.guild.memberCount.toString());
                    await channel.send(msg);
                }
            }
        } catch (e) {
            console.error('[Event] guildMemberAdd hatası:', e.message);
        }
    });

    // Üye Ayrıldı
    client.on('guildMemberRemove', async (member) => {
        if (!member.guild) return;

        try {
            const settings = await GuildSettings.findOne({ guildId: member.guild.id });
            await logMemberJoinLeave(member, 'leave', settings);
        } catch (e) {
            console.error('[Event] guildMemberRemove hatası:', e.message);
        }
    });
};
