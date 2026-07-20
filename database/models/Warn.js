const mongoose = require('mongoose');

const WarnSchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    moderator: { type: String, required: true },
    reason:    { type: String, default: 'Sebep belirtilmedi.' },
    createdAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Warn', WarnSchema);
