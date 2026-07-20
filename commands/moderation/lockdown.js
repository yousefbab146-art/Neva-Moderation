const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Sunucuyu veya kanalı kilitler / kilidini açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(s => s.setName('kanal').setDescription('Bu kanalı kilitler').addStringOption(o => o.setName('sebep').setDescription('Kilit sebebi')))
        .addSubcommand(s => s.setName('aç').setDescription('Bu kanalın kilidini açar'))
        .addSubcommand(s => s.setName('sunucu').setDescription('Tüm sunucuyu kilitler (Raid Modu!)').addStringOption(o => o.setName('sebep').setDescription('Sebep'))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

        if (sub === 'kanal' || sub === 'aç') {
            const lock = sub === 'kanal';
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: lock ? false : null
            });

            const embed = new EmbedBuilder()
                .setColor(lock ? '#DC143C' : '#32CD32')
                .setTitle(lock ? '🚨 Kanal Kilitlendi' : '🔐 Kanal Kilidi Açıldı')
                .setDescription(lock ? `Bu kanal kilitlendi.\n📝 Sebep: ${reason}` : 'Bu kanalın kilidi kaldırıldı.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await createModLog(interaction.client, interaction.guild, {
                type: lock ? 'lockdown' : 'unlock',
                user: { id: interaction.user.id, tag: interaction.user.tag },
                moderator: interaction.user, reason, settings
            });

        } else if (sub === 'sunucu') {
            await interaction.deferReply();
            const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(interaction.guild.id));
            let count = 0;
            for (const [, ch] of channels) {
                try {
                    await ch.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
                    count++;
                } catch (_) {}
            }

            const embed = new EmbedBuilder()
                .setColor('#DC143C')
                .setTitle('🚨 SUNUCU KİLİTLENDİ - RAID MODU AKTİF')
                .setDescription(`**${count}** kanal kilitlendi.\nSadece yetkililer mesaj atabilir.\n📝 Sebep: ${reason}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
