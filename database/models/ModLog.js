const mongoose = require('mongoose');

const ModLogSchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    type:      { type: String, required: true }, // 'ban', 'kick', 'mute', 'warn', 'unban', 'jail', 'lockdown'
    userId:    { type: String, required: true },
    userTag:   { type: String, required: true },
    moderator: { type: String, required: true },
    modTag:    { type: String, required: true },
    reason:    { type: String, default: 'Sebep belirtilmedi.' },
    duration:  { type: String, default: null }, // Örn: "10m", "1h", "1d"
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ModLog', ModLogSchema);
