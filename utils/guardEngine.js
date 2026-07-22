const { EmbedBuilder } = require('discord.js');

/**
 * Yeni katılan üye için Guard (Anti-Raid / Alt-Account / Auto-Role) kontrollerini çalıştırır.
 */
async function processMemberGuard(member, settings) {
    if (!settings || !member.guild) return;

    const { guard, autoRole, quarantineRole } = settings;

    // --- 1. Bot Koruması (Anti-Bot Join) ---
    if (member.user.bot) {
        if (guard?.antiBotJoin) {
            try {
                await member.kick('İzinsiz bot katılımı (Guard Koruması)');
                console.log(`[Guard] İzinsiz bot katılımı engellendi: ${member.user.tag}`);
                return;
            } catch (e) {
                console.error('[Guard] Bot kickleme başarısız:', e.message);
            }
        }

        // Bot Oto-Rol
        if (autoRole?.botRole) {
            try {
                await member.roles.add(autoRole.botRole);
            } catch (e) {
                console.error('[Guard] Bot oto-rol atama başarısız:', e.message);
            }
        }
        return;
    }

    // --- 2. Hesap Yaş Koruması (Alt Account Check) ---
    if (guard?.accountAgeLimit && guard.accountAgeLimit > 0) {
        const createdDaysAgo = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

        if (createdDaysAgo < guard.accountAgeLimit) {
            console.log(`[Guard] Şüpheli taze hesap tespit edildi: ${member.user.tag} (${Math.floor(createdDaysAgo)} günlük)`);

            if (guard.actionOnNewAccount === 'kick') {
                try {
                    await member.send(`⚠️ Sunucumuza katılabilmek için hesabınızın en az **${guard.accountAgeLimit}** günlük olması gerekmektedir.`);
                } catch (e) {}
                try {
                    await member.kick(`Şüpheli yeni hesap (${Math.floor(createdDaysAgo)} günlük)`);
                    return;
                } catch (e) {
                    console.error('[Guard] Yeni hesap kickleme başarısız:', e.message);
                }
            } else if (quarantineRole) {
                // Karantinaya al
                try {
                    await member.roles.add(quarantineRole);
                    console.log(`[Guard] ${member.user.tag} karantina rolüne atıldı.`);
                    return; // Karantinaya alındığı için oto-rol verme
                } catch (e) {
                    console.error('[Guard] Karantina rolü verme başarısız:', e.message);
                }
            }
        }
    }

    // --- 3. Normal Üye Oto-Rol ---
    if (autoRole?.userRole) {
        try {
            await member.roles.add(autoRole.userRole);
        } catch (e) {
            console.error('[Guard] Kullanıcı oto-rol atama başarısız:', e.message);
        }
    }
}

module.exports = { processMemberGuard };
