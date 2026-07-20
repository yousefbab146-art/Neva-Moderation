const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Atılacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Kick sebebi (zorunlu)').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');

        if (!target?.kickable) return interaction.reply({ content: '❌ Bu kullanıcı atılamaz.', ephemeral: true });

        await target.kick(reason);

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('👢 Kullanıcı Atıldı')
            .addFields(
                { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
                { name: '🛡️ Yetkili',  value: interaction.user.tag, inline: true },
                { name: '📝 Sebep',     value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await createModLog(interaction.client, interaction.guild, {
            type: 'kick', user: target.user, moderator: interaction.user, reason, settings
        });
    }
};
