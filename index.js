require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const connectDB = require('./database/connect');
const startDashboard = require('./dashboard/server');
const { registerCommands } = require('./handlers/commandHandler');
const { handleTempVoiceButtons } = require('./utils/tempVoiceEngine');

// Dynamic Event Handlers
const messageEvents = require('./events/messageEvents');
const voiceEvents = require('./events/voiceEvents');
const memberEvents = require('./events/memberEvents');

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

// Event Dinleyicilerini Bağla
messageEvents(client);
voiceEvents(client);
memberEvents(client);

// ============================================================
// BOT HAZIR
// ============================================================
client.once('ready', async () => {
    console.log(`\n🛡️  Neva Moderation & Protection Bot başlatıldı!`);
    console.log(`👤 Bot: ${client.user.tag}`);
    console.log(`🌐 Sunucu sayısı: ${client.guilds.cache.size}\n`);
    await registerCommands(client);
});

// ============================================================
// ETKİLEŞİM DİNLEYİCİSİ (Slash Komutlar & Butonlar)
// ============================================================
client.on('interactionCreate', async interaction => {
    // 1. TempVoice Butonları
    if (interaction.isButton() && interaction.customId.startsWith('jtc_')) {
        return await handleTempVoiceButtons(interaction);
    }

    // 2. Slash Komutlar
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
