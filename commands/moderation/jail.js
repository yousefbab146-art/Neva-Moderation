const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jail')
        .setDescription('Bir kullanıcıyı karantinaya alır veya serbest bırakır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(s => s
            .setName('ekle')
            .setDescription('Kullanıcıyı karantinaya al')
            .addUserOption(o => o.setName('kullanıcı').setDescription('Karantinaya alınacak kullanıcı').setRequired(true))
            .addStringOption(o => o.setName('sebep').setDescription('Karantina sebebi'))
        )
        .addSubcommand(s => s
            .setName('çıkar')
            .setDescription('Kullanıcıyı karantinadan çıkar')
            .addUserOption(o => o.setName('kullanıcı').setDescription('Karantinadan çıkarılacak kullanıcı').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (!settings?.quarantineRole) {
            return interaction.reply({ content: '❌ Karantina rolü ayarlanmamış! Web panelinden ayarlayın.', ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(settings.quarantineRole);
        if (!role) return interaction.reply({ content: '❌ Karantina rolü bulunamadı.', ephemeral: true });

        if (sub === 'ekle') {
            // Mevcut tüm rolleri kaydet, sonra sadece karantina rolü ver
            const previousRoles = target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.id);
            await target.roles.set([settings.quarantineRole], reason);

            const embed = new EmbedBuilder()
                .setColor('#8B008B')
                .setTitle('🔒 Karantinaya Alındı')
                .addFields(
                    { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
                    { name: '📝 Sebep',     value: reason }
                ).setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await createModLog(interaction.client, interaction.guild, {
                type: 'jail', user: target.user, moderator: interaction.user, reason, settings
            });

        } else {
            await target.roles.remove(settings.quarantineRole, 'Karantina kaldırıldı.');

            const embed = new EmbedBuilder()
                .setColor('#DA70D6')
                .setTitle('🔓 Karantina Kaldırıldı')
                .addFields({ name: '👤 Kullanıcı', value: target.user.tag, inline: true })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await createModLog(interaction.client, interaction.guild, {
                type: 'unjail', user: target.user, moderator: interaction.user, reason: 'Serbest bırakıldı.', settings
            });
        }
    }
};
