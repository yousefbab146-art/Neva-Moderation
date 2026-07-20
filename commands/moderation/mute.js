const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const { parseDuration, formatDuration } = require('../../utils/duration');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Bir kullanıcıyı susturur (Timeout).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Susturulacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('süre').setDescription('Süre: 5m, 1h, 1d (max 28d)').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Susturma sebebi')),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const süreStr = interaction.options.getString('süre');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const ms = parseDuration(süreStr);

        if (!ms || ms > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: '❌ Geçersiz süre! Örn: 5m, 1h, 1d (max 28d)', ephemeral: true });
        }
        if (!target?.moderatable) {
            return interaction.reply({ content: '❌ Bu kullanıcı susturulamaz.', ephemeral: true });
        }

        const durationText = formatDuration(ms);
        await target.timeout(ms, reason);

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔇 Kullanıcı Susturuldu')
            .addFields(
                { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
                { name: '⏱️ Süre',      value: durationText,   inline: true },
                { name: '📝 Sebep',     value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await createModLog(interaction.client, interaction.guild, {
            type: 'mute', user: target.user, moderator: interaction.user,
            reason, duration: durationText, settings
        });
    }
};
