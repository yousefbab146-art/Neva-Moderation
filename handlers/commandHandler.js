const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function registerCommands(client) {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');

    if (!fs.existsSync(commandsPath)) return;

    const folders = fs.readdirSync(commandsPath);
    for (const folder of folders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const cmd = require(path.join(folderPath, file));
            if (cmd.data) {
                commands.push(cmd.data.toJSON());
                client.commands.set(cmd.data.name, cmd);
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`[Bot] ${commands.length} slash komutu başarıyla kaydedildi.`);
    } catch (err) {
        console.error('[Bot] Komut kaydı hatası:', err.message);
    }
}

module.exports = { registerCommands };
