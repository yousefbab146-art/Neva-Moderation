const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
    guildId:        { type: String, required: true, unique: true },

    // Log Kanalları
    logChannel:     { type: String, default: null },
    modLogChannel:  { type: String, default: null },

    // Oto-Moderasyon
    automod: {
        enabled:          { type: Boolean, default: false },
        filterProfanity:  { type: Boolean, default: false },
        filterLinks:      { type: Boolean, default: false },
        filterInvites:    { type: Boolean, default: false },
        antiSpam:         { type: Boolean, default: false },
        antiRaid:         { type: Boolean, default: false },
        antiNuke:         { type: Boolean, default: false },
        spamThreshold:    { type: Number,  default: 5 },   // X mesaj
        spamInterval:     { type: Number,  default: 5000 } // Y ms içinde
    },

    // Uyarı (Strike) Sistemi
    warnSystem: {
        enabled:     { type: Boolean, default: false },
        muteAt:      { type: Number,  default: 3 },
        banAt:       { type: Number,  default: 5 },
        muteDuration:{ type: Number,  default: 60 } // dakika
    },

    // Karantina Rolü
    quarantineRole: { type: String, default: null },

    // Küfür Kelime Listesi
    badWords: { type: [String], default: [] },

    // Oto-Cevaplar
    autoResponders: [{
        trigger:  String,
        response: String
    }],

    // Hoş Geldin
    welcome: {
        enabled:   { type: Boolean, default: false },
        channelId: { type: String,  default: null },
        message:   { type: String,  default: 'Sunucumuza hoş geldin {user}!' }
    },

    // Moderatör Rolü (sadece bu role sahip olanlar paneli kullanabilir)
    modRoleId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);
