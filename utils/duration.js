/**
 * Süre stringini millisaniyeye çevirir.
 * Örn: "10m" -> 600000, "1h" -> 3600000, "1d" -> 86400000
 */
function parseDuration(str) {
    if (!str) return null;
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    return parseInt(match[1]) * (units[match[2]] || 0);
}

/**
 * Millisaniyeyi okunabilir metne çevirir.
 * Örn: 600000 -> "10 dakika"
 */
function formatDuration(ms) {
    if (!ms) return null;
    const s = Math.floor(ms / 1000);
    if (s < 60)   return `${s} saniye`;
    if (s < 3600) return `${Math.floor(s / 60)} dakika`;
    if (s < 86400) return `${Math.floor(s / 3600)} saat`;
    return `${Math.floor(s / 86400)} gün`;
}

module.exports = { parseDuration, formatDuration };
