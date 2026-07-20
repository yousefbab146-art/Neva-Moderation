const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı kalıcı olarak banlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Banlanacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Ban sebebi').setRequired(false))
        .addIntegerOption(o => o.setName('silme-günü').setDescription('Son kaç günlük mesajları silinsin (0-7)').setMinValue(0).setMaxValue(7)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const deletedays = interaction.options.getInteger('silme-günü') ?? 0;

        if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
        if (!target.bannable) return interaction.reply({ content: '❌ Bu kullanıcı banlanamaz (yetki sıralaması).', ephemeral: true });

        await target.ban({ deleteMessageDays: deletedays, reason });

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔨 Kullanıcı Banlandı')
            .addFields(
                { name: '👤 Kullanıcı', value: `${target.user.tag}`, inline: true },
                { name: '🛡️ Yetkili',  value: `${interaction.user.tag}`, inline: true },
                { name: '📝 Sebep',     value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await createModLog(interaction.client, interaction.guild, {
            type: 'ban', user: target.user,
            moderator: interaction.user, reason, settings
        });
    }
};
