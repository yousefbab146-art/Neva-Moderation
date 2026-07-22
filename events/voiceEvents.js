const GuildSettings = require('../database/models/GuildSettings');
const { logVoiceState } = require('../utils/auditLogger');
const { processTempVoice } = require('../utils/tempVoiceEngine');

module.exports = (client) => {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;

        try {
            const settings = await GuildSettings.findOne({ guildId: guild.id });
            
            // 1. Audit Log
            await logVoiceState(oldState, newState, settings);

            // 2. Geçici Ses Odaları (JTC)
            await processTempVoice(oldState, newState, settings);
        } catch (e) {
            console.error('[Event] voiceStateUpdate hatası:', e.message);
        }
    });
};
