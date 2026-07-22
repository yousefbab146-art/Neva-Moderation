const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Sunucuda butonlu çekiliş başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('ödül').setDescription('Çekiliş ödülü').setRequired(true))
        .addIntegerOption(o => o.setName('süre').setDescription('Çekiliş süresi (Dakika)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan sayısı').setRequired(false)),

    async execute(interaction) {
        const prize = interaction.options.getString('ödül');
        const minutes = interaction.options.getInteger('süre');
        const winnerCount = interaction.options.getInteger('kazanan') || 1;

        const durationMs = minutes * 60 * 1000;
        const endTimestamp = Math.floor((Date.now() + durationMs) / 1000);

        const embed = new EmbedBuilder()
            .setColor('#F59E0B')
            .setTitle(`🎉 HEDİYE ÇEKİLİŞİ: ${prize}`)
            .setDescription(`Çekilişe katılmak için aşağıdaki **🎉 Katıl** butonuna basın!\n\n**Bitiş Süresi:** <t:${endTimestamp}:R>\n**Kazanan Sayısı:** ${winnerCount}\n**Düzenleyen:** <@${interaction.user.id}>`)
            .setFooter({ text: 'Çekiliş' })
            .setTimestamp(Date.now() + durationMs);

        const joinBtn = new ButtonBuilder()
            .setCustomId('giveaway_join')
            .setLabel('🎉 Katıl (0)')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(joinBtn);

        const replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const participants = new Set();

        const collector = replyMsg.createMessageComponentCollector({ time: durationMs });

        collector.on('collect', async i => {
            if (i.customId === 'giveaway_join') {
                if (participants.has(i.user.id)) {
                    participants.delete(i.user.id);
                    await i.reply({ content: '❌ Çekilişten ayrıldınız.', ephemeral: true });
                } else {
                    participants.add(i.user.id);
                    await i.reply({ content: '🎉 Çekilişe başarıyla katıldınız!', ephemeral: true });
                }

                // Buton üzerindeki katılımcı sayısını güncelle
                const updatedBtn = new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel(`🎉 Katıl (${participants.size})`)
                    .setStyle(ButtonStyle.Primary);

                const updatedRow = new ActionRowBuilder().addComponents(updatedBtn);
                await replyMsg.edit({ components: [updatedRow] }).catch(() => {});
            }
        });

        collector.on('end', async () => {
            const arr = Array.from(participants);
            let winnersText = 'Yetersiz katılımcı.';

            if (arr.length > 0) {
                const winners = [];
                for (let k = 0; k < Math.min(winnerCount, arr.length); k++) {
                    const randomIndex = Math.floor(Math.random() * arr.length);
                    winners.push(`<@${arr.splice(randomIndex, 1)[0]}>`);
                }
                winnersText = winners.join(', ');
            }

            const endedEmbed = new EmbedBuilder()
                .setColor('#10B981')
                .setTitle(`🎉 ÇEKİLİŞ SONUÇLANDI: ${prize}`)
                .setDescription(`**Ödül:** ${prize}\n**Kazanan(lar):** ${winnersText}\n**Toplam Katılımcı:** ${participants.size}`)
                .setTimestamp();

            const disabledBtn = new ButtonBuilder()
                .setCustomId('giveaway_ended')
                .setLabel('🎉 Çekiliş Bitti')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            await replyMsg.edit({ embeds: [endedEmbed], components: [new ActionRowBuilder().addComponents(disabledBtn)] }).catch(() => {});
        });
    }
};
