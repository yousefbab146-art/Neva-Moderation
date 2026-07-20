const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warn = require('../../database/models/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarılar')
        .setDescription('Bir kullanıcının uyarı geçmişini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Uyarıları görülecek kullanıcı').setRequired(true))
        .addSubcommand(s => s.setName('listele').setDescription('Uyarıları listele'))
        .addSubcommand(s => s.setName('temizle').setDescription('Tüm uyarıları sil')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('kullanıcı');

        if (sub === 'temizle') {
            await Warn.deleteMany({ guildId: interaction.guild.id, userId: target.id });
            return interaction.reply({ content: `✅ **${target.tag}** kullanıcısının tüm uyarıları silindi.`, ephemeral: true });
        }

        const warns = await Warn.find({ guildId: interaction.guild.id, userId: target.id }).sort({ createdAt: -1 }).limit(10);

        if (!warns.length) {
            return interaction.reply({ content: `✅ **${target.tag}** kullanıcısının hiç uyarısı yok.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`⚠️ ${target.tag} Uyarı Geçmişi`)
            .setDescription(warns.map((w, i) =>
                `**${i + 1}.** ${w.reason}\n> 🛡️ <@${w.moderator}> • <t:${Math.floor(w.createdAt / 1000)}:R>`
            ).join('\n\n'))
            .setFooter({ text: `Toplam: ${warns.length} uyarı` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
