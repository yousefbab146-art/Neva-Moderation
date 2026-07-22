const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserLevel = require('../../database/models/UserLevel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Kullanıcının seviye ve XP kartını gösterir.')
        .addUserOption(o => o.setName('kullanıcı').setDescription('Seviyesi bakılacak kullanıcı').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('kullanıcı') || interaction.user;
        const guildId = interaction.guild.id;

        const stats = await UserLevel.findOne({ guildId, userId: target.id }) || { xp: 0, level: 1, messages: 0 };
        const neededXp = stats.level * 100;
        const progressPercent = Math.min(Math.floor((stats.xp / neededXp) * 100), 100);

        // Sıralamayı bul
        const allUsers = await UserLevel.find({ guildId }).sort({ level: -1, xp: -1 });
        const rankIndex = allUsers.findIndex(u => u.userId === target.id);
        const rankDisplay = rankIndex !== -1 ? `#${rankIndex + 1}` : 'N/A';

        const embed = new EmbedBuilder()
            .setColor('#10B981')
            .setTitle(`⭐ ${target.username} - Seviye Kartı`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🏆 Sıralama', value: rankDisplay, inline: true },
                { name: '⭐ Seviye', value: `${stats.level}`, inline: true },
                { name: '✨ XP', value: `${stats.xp} / ${neededXp} (%${progressPercent})`, inline: true },
                { name: '💬 Mesaj Sayısı', value: `${stats.messages}`, inline: true }
            )
            .setFooter({ text: `Sunucu: ${interaction.guild.name}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
