const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const Warn = require('../../database/models/Warn');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Bir kullanıcıya uyarı verir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('kullanıcı').setDescription('Uyarılacak kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');

        if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

        // Uyarıyı kaydet
        await Warn.create({
            guildId: interaction.guild.id, userId: target.user.id,
            moderator: interaction.user.id, reason
        });

        // Toplam uyarı sayısı
        const totalWarns = await Warn.countDocuments({ guildId: interaction.guild.id, userId: target.user.id });

        // Strike sistemi: otomatik ceza
        if (settings?.warnSystem?.enabled) {
            const { muteAt, banAt, muteDuration } = settings.warnSystem;
            if (totalWarns >= banAt) {
                await target.ban({ reason: `[Otomatik] ${totalWarns} uyarıya ulaşıldı.` }).catch(() => {});
            } else if (totalWarns >= muteAt) {
                const ms = muteDuration * 60 * 1000;
                await target.timeout(ms, `[Otomatik] ${totalWarns} uyarıya ulaşıldı.`).catch(() => {});
            }
        }

        // DM'e bildir
        try {
            await target.user.send({
                embeds: [new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`⚠️ ${interaction.guild.name} sunucusundan uyarı aldınız`)
                    .addFields(
                        { name: '📝 Sebep',          value: reason },
                        { name: '🔢 Toplam Uyarınız', value: `${totalWarns}` }
                    )
                    .setTimestamp()
                ]
            });
        } catch (_) {}

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .addFields(
                { name: '👤 Kullanıcı',       value: target.user.tag, inline: true },
                { name: '🔢 Toplam Uyarı',     value: `${totalWarns}`, inline: true },
                { name: '📝 Sebep',            value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await createModLog(interaction.client, interaction.guild, {
            type: 'warn', user: target.user, moderator: interaction.user, reason, settings
        });
    }
};
