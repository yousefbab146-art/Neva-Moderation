const GuildSettings = require('../database/models/GuildSettings');
const { logMessageDelete, logMessageUpdate } = require('../utils/auditLogger');
const { checkAutoMod } = require('../utils/automod');
const { processMessageXp } = require('../utils/levelEngine');

module.exports = (client) => {
    // Mesaj Silinme Dinleyicisi
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.partial) return;
        try {
            const settings = await GuildSettings.findOne({ guildId: message.guild.id });
            await logMessageDelete(message, settings);
        } catch (e) {
            console.error('[Event] messageDelete hatası:', e.message);
        }
    });

    // Mesaj Düzenleme Dinleyicisi
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.partial) return;
        try {
            const settings = await GuildSettings.findOne({ guildId: oldMessage.guild.id });
            await logMessageUpdate(oldMessage, newMessage, settings);
        } catch (e) {
            console.error('[Event] messageUpdate hatası:', e.message);
        }
    });

    // Mesaj Oluşturma Dinleyicisi (AutoMod + XP)
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;
        try {
            const settings = await GuildSettings.findOne({ guildId: message.guild.id });
            if (settings) {
                // 1. AutoMod
                await checkAutoMod(client, message, settings);
                // 2. XP & Level
                await processMessageXp(message, settings);
            }
        } catch (e) {
            console.error('[Event] messageCreate hatası:', e.message);
        }
    });
};
