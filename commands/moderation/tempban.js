const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const { parseDuration, formatDuration } = require('../../utils/duration');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Bir kullanıcıyı geçici olarak banlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Banlanacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('süre').setDescription('Süre: 10m, 1h, 1d, 7d').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Ban sebebi')),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const süreStr = interaction.options.getString('süre');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const ms = parseDuration(süreStr);

        if (!ms) return interaction.reply({ content: '❌ Geçersiz süre formatı! Örn: 10m, 1h, 2d', ephemeral: true });
        if (!target?.bannable) return interaction.reply({ content: '❌ Bu kullanıcı banlanamaz.', ephemeral: true });

        const durationText = formatDuration(ms);
        await target.ban({ reason: `[Geçici ${durationText}] ${reason}` });

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('⏱️🔨 Kullanıcı Geçici Olarak Banlandı')
            .addFields(
                { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
                { name: '⏱️ Süre',      value: durationText,   inline: true },
                { name: '📝 Sebep',     value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await createModLog(interaction.client, interaction.guild, {
            type: 'tempban', user: target.user, moderator: interaction.user,
            reason, duration: durationText, settings
        });

        // Süre bitince banı kaldır
        setTimeout(async () => {
            try {
                await interaction.guild.bans.remove(target.user.id, 'Geçici ban süresi doldu.');
            } catch (_) {}
        }, ms);
    }
};
