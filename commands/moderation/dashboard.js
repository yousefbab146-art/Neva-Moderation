const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Neva Moderation web panelinin linkini gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: 'Neva Moderation Dashboard',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle('🛡️ Web Paneline Hoş Geldiniz!')
            .setDescription(
                'Aşağıdaki butona tıklayarak sunucu yönetim panelinize ulaşabilirsiniz.\n\n' +
                '**Panelde Neler Yapabilirsiniz?**\n' +
                '`📊` Moderasyon istatistiklerini görüntüle\n' +
                '`📋` Tüm mod kayıtlarını filtrele\n' +
                '`🤖` Oto-moderasyon ayarlarını değiştir\n' +
                '`⚠️` Uyarı sistemini yapılandır\n' +
                '`💬` Oto-cevapları yönet\n' +
                '`👋` Hoş geldin mesajını düzenle'
            )
            .setFooter({ text: '🔒 Sadece yöneticiler bu komutu kullanabilir.' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Paneli Aç')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Link)
                .setURL(dashboardUrl)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
};
