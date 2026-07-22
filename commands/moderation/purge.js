const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createModLog } = require('../../utils/modLogger');
const GuildSettings = require('../../database/models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Kanaldan toplu mesaj siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('miktar').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('kullanıcı').setDescription('Sadece bu kullanıcının mesajlarını sil (opsiyonel)'))
        .addStringOption(o => o.setName('içerik').setDescription('Bu kelimeyi içeren mesajları sil (opsiyonel)')),

    async execute(interaction) {
        const amount = interaction.options.getInteger('miktar');
        const targetUser = interaction.options.getUser('kullanıcı');
        const keyword = interaction.options.getString('içerik')?.toLowerCase();

        await interaction.deferReply({ ephemeral: true });

        let messages = await interaction.channel.messages.fetch({ limit: 100 });

        // Filtrele
        if (targetUser) messages = messages.filter(m => m.author.id === targetUser.id);
        if (keyword) messages = messages.filter(m => m.content.toLowerCase().includes(keyword));

        // İlk N tanesini al
        const toDelete = messages.first(amount);

        const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => null);
        const count = deleted?.size ?? 0;

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

        await createModLog(interaction.client, interaction.guild, {
            type: 'purge',
            user: { id: interaction.user.id, tag: interaction.user.tag },
            moderator: interaction.user,
            reason: `${count} mesaj silindi${targetUser ? ` (${targetUser.tag} kullanıcısından)` : ''}`,
            settings
        });

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🗑️ Mesajlar Silindi')
            .setDescription(`**${count}** mesaj başarıyla silindi.`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
