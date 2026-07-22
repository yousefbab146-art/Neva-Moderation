const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Oto-cevap yönetimi.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('listele').setDescription('Tüm oto-cevapları listele'))
        .addSubcommand(s => s
            .setName('ekle')
            .setDescription('Yeni oto-cevap ekle')
            .addStringOption(o => o.setName('tetikleyici').setDescription('Tetikleyici kelime').setRequired(true))
            .addStringOption(o => o.setName('cevap').setDescription('Verilecek cevap').setRequired(true))
        )
        .addSubcommand(s => s
            .setName('sil')
            .setDescription('Oto-cevap sil')
            .addStringOption(o => o.setName('tetikleyici').setDescription('Silinecek tetikleyici').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        let settings = await GuildSettings.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { $setOnInsert: { guildId: interaction.guild.id } },
            { upsert: true, new: true }
        );

        if (sub === 'listele') {
            if (!settings.autoResponders?.length) {
                return interaction.reply({ content: '📭 Henüz hiç oto-cevap eklenmemiş.', ephemeral: true });
            }
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🤖 Oto-Cevap Listesi')
                .setDescription(settings.autoResponders.map((ar, i) =>
                    `**${i + 1}.** \`${ar.trigger}\` → ${ar.response}`
                ).join('\n'))
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'ekle') {
            const trigger = interaction.options.getString('tetikleyici').toLowerCase();
            const response = interaction.options.getString('cevap');
            await GuildSettings.updateOne(
                { guildId: interaction.guild.id },
                { $push: { autoResponders: { trigger, response } } }
            );
            return interaction.reply({ content: `✅ \`${trigger}\` → \`${response}\` oto-cevabı eklendi.`, ephemeral: true });
        }

        if (sub === 'sil') {
            const trigger = interaction.options.getString('tetikleyici').toLowerCase();
            await GuildSettings.updateOne(
                { guildId: interaction.guild.id },
                { $pull: { autoResponders: { trigger } } }
            );
            return interaction.reply({ content: `✅ \`${trigger}\` oto-cevabı silindi.`, ephemeral: true });
        }
    }
};
