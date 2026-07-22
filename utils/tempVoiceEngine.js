const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

// Bot tarafından açılmış ses odalarının detay takibi: channelId -> { ownerId, guildId }
const activeTempChannels = new Map();
// Kullanıcının aktif odası: userId -> channelId (Kişi başı max 1 oda kuralı)
const userActiveRooms = new Map();

/**
 * Ses kanalı hareketlerini dinleyip Geçici Ses Odası (JTC) işlemlerini yürütür.
 */
async function processTempVoice(oldState, newState, settings) {
    if (!settings || !settings.tempVoice?.enabled || !settings.tempVoice.channelId) return;

    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const { channelId, categoryId, userLimit, nameFormat, bannerUrl } = settings.tempVoice;
    const member = newState.member;

    // --- 1. KULLANICI JTC KANALINA GİRDİ (ODA OLUŞTUR) ---
    if (newState.channelId === channelId && member) {

        // 🛑 KİŞİ BAŞI MAX 1 ODA KURALI
        const existingRoomId = userActiveRooms.get(member.id);
        if (existingRoomId && guild.channels.cache.has(existingRoomId)) {
            const existingChannel = guild.channels.cache.get(existingRoomId);
            try {
                await member.voice.setChannel(existingChannel);
                console.log(`[TempVoice] ${member.user.tag} zaten odası olduğu için var olan odaya taşındı.`);
                return;
            } catch (e) {}
        }

        // Standart İsim: "Ahmet'in Odası" (displayName)
        const rawName = nameFormat || "{user}'in Odası";
        const channelName = rawName.replace('{user}', member.displayName || member.user.username);

        try {
            // 1. Yeni geçici oda oluştur
            const tempChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: categoryId || newState.channel?.parentId || null,
                userLimit: userLimit || 16, // Standart 16 kişilik
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers,
                            PermissionFlagsBits.Connect
                        ]
                    }
                ]
            });

            // Hafızaya kaydet
            activeTempChannels.set(tempChannel.id, { ownerId: member.id, guildId: guild.id });
            userActiveRooms.set(member.id, tempChannel.id);

            // 2. Kullanıcıyı yeni odaya taşı
            await member.voice.setChannel(tempChannel);

            // 3. ODA İÇİ SESLİ SOHBET CHAT'İNE KONTROL PANELİ EMBEDİ GÖNDER
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('👑 Özel Oda Kontrol Paneli')
                .setDescription(`Hoş geldin <@${member.id}>!\nBu oda senin için özel oluşturuldu. Tüm üyeler çıktığında oda otomatik olarak silinecektir.`)
                .addFields(
                    { name: '👑 Oda Sahibi', value: `<@${member.id}>`, inline: true },
                    { name: '👥 Kişi Limiti', value: `${userLimit || 16} Kişi`, inline: true },
                    { name: '⚙️ Yönetim', value: 'Aşağıdaki butonları kullanarak odayı kilitleyebilir, kişileri atabilir veya odayı kapatabilirsin.', inline: false }
                )
                .setFooter({ text: 'Neva Moderation | Geçici Oda Sistemi' })
                .setTimestamp();

            if (bannerUrl) {
                embed.setImage(bannerUrl); // PNG, GIF, JPG Desteği
            }

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`jtc_lock_${tempChannel.id}`).setLabel('🔒 Kilitle / Aç').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`jtc_limit_${tempChannel.id}`).setLabel('👥 Limit Ayarla').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`jtc_kick_${tempChannel.id}`).setLabel('👢 Üye At').setStyle(ButtonStyle.Warning),
                new ButtonBuilder().setCustomId(`jtc_close_${tempChannel.id}`).setLabel('🗑️ Odayı Kapat').setStyle(ButtonStyle.Danger)
            );

            await tempChannel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row1] }).catch(err => {
                console.error('[TempVoice] Panel embedi gönderilemedi:', err.message);
            });

            console.log(`[TempVoice] Özel oda ve panel başarıyla açıldı: ${tempChannel.name}`);
        } catch (e) {
            console.error('[TempVoice] Oda oluşturma hatası:', e.message);
        }
    }

    // --- 2. KULLANICI ODADAN AYRILDI (TÜM ÜYELER ÇIKINCA ODA SİLİNİR) ---
    if (oldState.channelId && oldState.channelId !== channelId) {
        const oldChannel = oldState.channel;

        if (oldChannel && activeTempChannels.has(oldChannel.id) && oldChannel.members.size === 0) {
            const roomData = activeTempChannels.get(oldChannel.id);
            try {
                if (roomData) {
                    userActiveRooms.delete(roomData.ownerId);
                }
                activeTempChannels.delete(oldChannel.id);
                await oldChannel.delete('Tüm üyeler ayrıldığı için silindi');
                console.log(`[TempVoice] Boşalan geçici oda silindi: ${oldChannel.name}`);
            } catch (e) {
                console.error('[TempVoice] Oda silme hatası:', e.message);
            }
        }
    }
}

/**
 * Temp Voice Kontrol Paneli Buton Etkileşimlerini Yürütür
 */
async function handleTempVoiceButtons(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('jtc_')) return;

    const [prefix, action, channelId] = interaction.customId.split('_');
    const roomData = activeTempChannels.get(channelId);

    if (!roomData) {
        return interaction.reply({ content: '❌ Bu geçici oda artık aktif değil.', ephemeral: true });
    }

    // GÜVENLİK KONTROLÜ: Sadece oda sahibi veya Admin butonları kullanabilir!
    const isOwner = interaction.user.id === roomData.ownerId;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
        return interaction.reply({ content: `❌ Bu butonları sadece oda sahibi (<@${roomData.ownerId}>) veya yöneticiler kullanabilir!`, ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: '❌ Oda bulunamadı.', ephemeral: true });

    switch (action) {
        case 'lock': {
            const currentOverwrites = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
            const isLocked = currentOverwrites?.deny.has(PermissionFlagsBits.Connect);

            if (isLocked) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
                return interaction.reply({ content: '🔓 Oda kilidi açıldı. Artık herkes katılabilir.', ephemeral: true });
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
                return interaction.reply({ content: '🔒 Oda kilitlendi. Artık kimse katılamaz.', ephemeral: true });
            }
        }

        case 'close': {
            await interaction.reply({ content: '🗑️ Oda kapatılıyor...', ephemeral: true });
            userActiveRooms.delete(roomData.ownerId);
            activeTempChannels.delete(channelId);
            await channel.delete('Oda sahibi tarafından kapatıldı');
            break;
        }

        case 'limit': {
            // Limiti 16 -> 5 -> 10 -> 0 arasında döngüye sok
            let newLimit = 16;
            if (channel.userLimit === 16) newLimit = 5;
            else if (channel.userLimit === 5) newLimit = 10;
            else if (channel.userLimit === 10) newLimit = 0; // Sınırsız

            await channel.setUserLimit(newLimit);
            return interaction.reply({ content: `👥 Oda kişi limiti **${newLimit === 0 ? 'Sınırsız' : newLimit + ' Kişi'}** olarak değiştirildi.`, ephemeral: true });
        }

        case 'kick': {
            const membersInRoom = channel.members.filter(m => m.id !== roomData.ownerId);
            if (membersInRoom.size === 0) {
                return interaction.reply({ content: '❌ Odada atılacak başka kimse yok.', ephemeral: true });
            }

            // Odadaki ilk kişiyi at
            const targetMember = membersInRoom.first();
            try {
                await targetMember.voice.disconnect('Oda sahibi tarafından atıldı');
                return interaction.reply({ content: `👢 **${targetMember.user.tag}** odadan çıkarıldı.`, ephemeral: true });
            } catch (e) {
                return interaction.reply({ content: '❌ Kullanıcı atılamadı.', ephemeral: true });
            }
        }
    }
}

module.exports = { processTempVoice, handleTempVoiceButtons };
