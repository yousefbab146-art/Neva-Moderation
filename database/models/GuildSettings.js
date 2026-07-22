const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
    guildId:        { type: String, required: true, unique: true },

    // Ayrı Log Kanalları
    logChannel:          { type: String, default: null },
    modLogChannel:       { type: String, default: null },
    banLogChannel:       { type: String, default: null },
    muteLogChannel:      { type: String, default: null },
    kickLogChannel:      { type: String, default: null },
    warnLogChannel:      { type: String, default: null },
    messageLogChannel:   { type: String, default: null },
    voiceLogChannel:     { type: String, default: null },
    memberLogChannel:    { type: String, default: null },

    // 🎙️ Geçici Özel Ses Odaları (JTC - Join to Create)
    tempVoice: {
        enabled:    { type: Boolean, default: false },
        channelId:  { type: String,  default: null }, // "➕ Oda Aç" ses kanalı ID
        categoryId: { type: String,  default: null }, // Odaların açılacağı kategori ID
        userLimit:  { type: Number,  default: 16 },   // Varsayılan kişi limiti (16)
        nameFormat: { type: String,  default: "{user}'in Odası" },
        bannerUrl:  { type: String,  default: "https://i.ibb.co/L5BwY3q/banner.png" } // PNG/GIF/JPG banner
    },

    // ⭐ Seviye & XP Sistemi
    levelSystem: {
        enabled:     { type: Boolean, default: true },
        logChannel:  { type: String,  default: null },
        xpPerMessage:{ type: Number,  default: 15 },
        roleRewards: [{
            level:  Number,
            roleId: String
        }]
    },

    // 🛡️ Muafiyet & Whitelist
    whitelist: {
        channels: { type: [String], default: [] },
        roles:    { type: [String], default: [] }
    },

    // Oto-Moderasyon
    automod: {
        enabled:          { type: Boolean, default: false },
        filterProfanity:  { type: Boolean, default: false },
        filterLinks:      { type: Boolean, default: false },
        filterInvites:    { type: Boolean, default: false },
        antiSpam:         { type: Boolean, default: false },
        spamThreshold:    { type: Number,  default: 5 },
        spamInterval:     { type: Number,  default: 5000 }
    },

    // Sunucu Koruması (Guard)
    guard: {
        accountAgeLimit:     { type: Number,  default: 7 },
        actionOnNewAccount:  { type: String,  default: 'quarantine'},
        antiBotJoin:         { type: Boolean, default: false },
        massJoinProtection:  { type: Boolean, default: false }
    },

    // Oto-Rol
    autoRole: {
        userRole: { type: String, default: null },
        botRole:  { type: String, default: null }
    },

    // Uyarı Sistemi
    warnSystem: {
        enabled:     { type: Boolean, default: false },
        muteAt:      { type: Number,  default: 3 },
        banAt:       { type: Number,  default: 5 },
        muteDuration:{ type: Number,  default: 60 }
    },

    quarantineRole: { type: String, default: null },
    // Küfür Kelime Listesi (Varsayılan Kapsamlı Türkçe + İngilizce Kütüphane)
    badWords: { 
        type: [String], 
        default: [
            // Türkçe
            'amk', 'aq', 'amq', 'amına', 'amınakoyayım', 'amınagoyayım', 'sik', 'sikik', 'sikerim', 
            'siktim', 'sikiş', 'siktir', 'piç', 'yarrak', 'yarak', 'orospu', 'göt', 'götveren', 
            'oç', 'kahpe', 'dalyarak', 'ibne', 'taşşak', 'puşt', 'yavşak', 'gavat', 'yarram',
            // İngilizce
            'fuck', 'fucking', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'bastard', 'slut', 
            'whore', 'motherfucker', 'nigger', 'cock', 'pussy'
        ] 
    },
    autoResponders: [{ trigger: String, response: String }],
    welcome: {
        enabled:   { type: Boolean, default: false },
        channelId: { type: String,  default: null },
        message:   { type: String,  default: 'Sunucumuza hoş geldin {user}!' }
    },
    modRoleId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);
