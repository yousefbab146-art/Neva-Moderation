require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const connectDB = require('./database/connect');
const startDashboard = require('./dashboard/server');
const { registerCommands } = require('./handlers/commandHandler');
const { handleAutomod, handleRaidCheck } = require('./utils/automod');
const logEvents = require('./events/logEvents');
const GuildSettings = require('./database/models/GuildSettings');

// ============================================================
// DISCORD BOT ALTYAPISI
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ]
});

client.commands = new Collection();

// ============================================================
// BOT HAZIR
// ============================================================
client.once('ready', async () => {
    console.log(`\n🛡️  Neva Moderation Bot başlatıldı!`);
    console.log(`👤 Bot: ${client.user.tag}`);
    console.log(`🌐 Sunucu sayısı: ${client.guilds.cache.size}\n`);
    await registerCommands(client);
});

// ============================================================
// SLASH KOMUT YÜRÜTME
// ============================================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`[Komut Hatası] ${interaction.commandName}:`, err.message);
        const reply = { content: `❌ Komut çalıştırılırken hata: \`${err.message}\``, ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
});

// ============================================================
// MESAJ OTO-MODERASYON & OTO-CEVAP
// ============================================================
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    await handleAutomod(message, settings);
});

// ============================================================
// OLAY LOGLAMA (LOG EVENTS)
// ============================================================
client.on('messageDelete',     msg                   => logEvents.messageDelete(msg));
client.on('messageUpdate',     (o, n)                => logEvents.messageUpdate(o, n));
client.on('guildMemberAdd',    member                => logEvents.guildMemberAdd(member));
client.on('guildMemberRemove', member                => logEvents.guildMemberRemove(member));
client.on('voiceStateUpdate',  (o, n)                => logEvents.voiceStateUpdate(o, n));
client.on('guildMemberUpdate', (o, n)                => logEvents.guildMemberUpdate(o, n));
client.on('channelDelete',     channel               => logEvents.channelDelete(channel));

// ============================================================
// RAİD KORUMA
// ============================================================
client.on('guildMemberAdd', async member => {
    const settings = await GuildSettings.findOne({ guildId: member.guild.id });
    await handleRaidCheck(member, settings);
});

// ============================================================
// SİSTEMİ BAŞLAT
// ============================================================
async function startSystem() {
    await connectDB();
    startDashboard(client);

    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN .env dosyasında bulunamadı!');
        process.exit(1);
    }
    await client.login(process.env.DISCORD_TOKEN);
}

startSystem().catch(console.error);
