// ============================================================
// NEVA MODERATION DASHBOARD - app.js
// ============================================================

const API = '';
let currentGuildId = null;
let guildData = null;
let logPage = 1;
let activityChart = null;

// ---- YARDIMCI FONKSİYONLAR ----
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.className = 'toast', 3000);
}

function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${name}`)?.classList.add('active');
    document.getElementById(`nav-${name}`)?.classList.add('active');
    const titles = {
        overview: 'Genel Bakış', modlogs: 'Mod Kayıtları', automod: 'Oto-Moderasyon',
        warns: 'Uyarı Sistemi', logs: 'Log Kanalları', autoresponder: 'Oto-Cevaplar', welcome: 'Hoş Geldin'
    };
    document.getElementById('page-title').textContent = titles[name] || name;
    if (name === 'modlogs') loadModLogs();
    if (name === 'autoresponder') loadAutoResponders();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function getBadgeClass(type) {
    const map = { ban:'badge-ban', tempban:'badge-tempban', kick:'badge-kick',
                  mute:'badge-mute', warn:'badge-warn', jail:'badge-jail', unban:'badge-unban' };
    return map[type] || 'badge-default';
}

const ACTION_EMOJIS = {
    ban:'🔨', tempban:'⏱️🔨', unban:'✅', kick:'👢', mute:'🔇',
    unmute:'🔊', warn:'⚠️', jail:'🔒', unjail:'🔓', purge:'🗑️',
    lockdown:'🚨', unlock:'🔐'
};

// ---- BOT DURUM ----
async function loadBotStatus() {
    try {
        const r = await fetch(`${API}/api/status`);
        const data = await r.json();
        const dot  = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (data.online) {
            dot.className  = 'status-dot online';
            text.textContent = data.tag;
        } else {
            dot.className  = 'status-dot offline';
            text.textContent = 'Çevrimdışı';
        }
    } catch (_) {}
}

// ---- SUNUCULAR ----
async function loadGuilds() {
    try {
        const r = await fetch(`${API}/api/guilds`);
        const guilds = await r.json();
        const sel = document.getElementById('guild-selector');
        if (!guilds.length) { sel.innerHTML = '<span>Sunucu Yok</span>'; return; }

        // İlk sunucuyu seç
        currentGuildId = guilds[0].id;
        sel.innerHTML = `<span>${guilds[0].name}</span><span>▾</span>`;
        await loadGuildData();
    } catch (e) {
        console.error('Guild yükleme hatası:', e);
    }
}

// ---- SUNUCU VERİSİ ----
async function loadGuildData() {
    if (!currentGuildId) return;
    try {
        const r = await fetch(`${API}/api/guilds/${currentGuildId}`);
        guildData = await r.json();
        populateChannelSelects();
        populateSettings();
        await loadStats();
        await loadRecentActions();
    } catch (e) {
        console.error('Guild data hatası:', e);
    }
}

function populateChannelSelects() {
    const channels = guildData?.channels || [];
    const selects = ['log-channel', 'mod-log-channel', 'welcome-channel'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<option value="">-- Seç --</option>' +
            channels.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    });
}

function populateSettings() {
    const s = guildData?.settings;
    if (!s) return;

    // Automod
    if (s.automod) {
        setCheck('automod-enabled',   s.automod.enabled);
        setCheck('automod-profanity', s.automod.filterProfanity);
        setCheck('automod-links',     s.automod.filterLinks);
        setCheck('automod-invites',   s.automod.filterInvites);
        setCheck('automod-spam',      s.automod.antiSpam);
        setCheck('automod-raid',      s.automod.antiRaid);
        setCheck('automod-nuke',      s.automod.antiNuke);
    }
    if (s.badWords?.length) {
        document.getElementById('bad-words-input').value = s.badWords.join(', ');
    }

    // Warn system
    if (s.warnSystem) {
        setCheck('warn-enabled', s.warnSystem.enabled);
        setVal('warn-mute-at',       s.warnSystem.muteAt || 3);
        setVal('warn-ban-at',        s.warnSystem.banAt  || 5);
        setVal('warn-mute-duration', s.warnSystem.muteDuration || 60);
    }

    // Log channels
    setSelectVal('log-channel',     s.logChannel);
    setSelectVal('mod-log-channel', s.modLogChannel);

    // Welcome
    if (s.welcome) {
        setCheck('welcome-enabled', s.welcome.enabled);
        setSelectVal('welcome-channel', s.welcome.channelId);
        setVal('welcome-message', s.welcome.message || '');
    }
}

function setCheck(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
function setVal(id, val)   { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function setSelectVal(id, val) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
}

// ---- İSTATİSTİKLER ----
async function loadStats() {
    if (!currentGuildId) return;
    try {
        const r = await fetch(`${API}/api/guilds/${currentGuildId}/stats`);
        const data = await r.json();
        document.getElementById('stat-bans').textContent  = data.totalBans  || 0;
        document.getElementById('stat-kicks').textContent = data.totalKicks || 0;
        document.getElementById('stat-warns').textContent = data.totalWarns || 0;
        document.getElementById('stat-mutes').textContent = data.totalMutes || 0;
        renderActivityChart(data.recentActions || []);
    } catch (_) {}
}

function renderActivityChart(actions) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }));
    }

    const counts = days.map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return actions.filter(a => {
            const ad = new Date(a.createdAt);
            return ad.toDateString() === d.toDateString();
        }).length;
    });

    if (activityChart) activityChart.destroy();
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Moderasyon İşlemi',
                data: counts,
                backgroundColor: 'rgba(88, 101, 242, 0.5)',
                borderColor: '#5865f2',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e8e8f0' } } },
            scales: {
                y: { ticks: { color: '#72767d', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#72767d' }, grid: { display: false } }
            }
        }
    });
}

// ---- SON İŞLEMLER ----
async function loadRecentActions() {
    if (!currentGuildId) return;
    const container = document.getElementById('recent-actions');
    try {
        const r = await fetch(`${API}/api/guilds/${currentGuildId}/modlogs?limit=8`);
        const { logs } = await r.json();
        if (!logs?.length) { container.innerHTML = '<div style="color:#72767d;padding:20px;text-align:center">Henüz kayıt yok.</div>'; return; }
        container.innerHTML = logs.map(l => `
            <div class="recent-item">
                <span class="action-badge ${getBadgeClass(l.type)}">${ACTION_EMOJIS[l.type] || ''} ${l.type.toUpperCase()}</span>
                <span style="flex:1;color:#e8e8f0;font-weight:600">${l.userTag}</span>
                <span style="color:#72767d">${l.reason?.slice(0, 40) || '-'}</span>
                <span style="color:#72767d;font-size:12px">${new Date(l.createdAt).toLocaleDateString('tr-TR')}</span>
            </div>
        `).join('');
    } catch (_) {
        container.innerHTML = '<div style="color:#72767d;padding:20px;text-align:center">Yüklenemedi.</div>';
    }
}

// ---- MOD LOGS ----
async function loadModLogs() {
    if (!currentGuildId) return;
    const tbody = document.getElementById('modlog-tbody');
    const type  = document.getElementById('log-type-filter')?.value || '';
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">⏳ Yükleniyor...</td></tr>';
    try {
        const r = await fetch(`${API}/api/guilds/${currentGuildId}/modlogs?page=${logPage}&limit=20${type ? `&type=${type}` : ''}`);
        const { logs, total, totalPages } = await r.json();

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-row">📭 Kayıt bulunamadı.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr>
                <td><span class="action-badge ${getBadgeClass(l.type)}">${ACTION_EMOJIS[l.type] || ''} ${l.type.toUpperCase()}</span></td>
                <td><b>${l.userTag}</b><br><small style="color:#72767d">${l.userId}</small></td>
                <td style="color:#72767d">${l.modTag}</td>
                <td>${l.reason?.slice(0, 50) || '-'}</td>
                <td style="color:#72767d">${l.duration || '-'}</td>
                <td style="color:#72767d;white-space:nowrap">${new Date(l.createdAt).toLocaleString('tr-TR')}</td>
            </tr>
        `).join('');

        // Pagination
        const pag = document.getElementById('log-pagination');
        pag.innerHTML = Array.from({ length: totalPages }, (_, i) =>
            `<button class="page-btn ${i + 1 === logPage ? 'active' : ''}" onclick="logPage=${i+1};loadModLogs()">${i + 1}</button>`
        ).join('');
    } catch (_) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">❌ Hata oluştu.</td></tr>';
    }
}

// ---- AUTOMOD KAYDET ----
async function saveAutomod() {
    if (!currentGuildId) return showToast('Sunucu seçilmedi!', 'error');
    const badWordsRaw = document.getElementById('bad-words-input').value;
    const badWords = badWordsRaw.split(',').map(w => w.trim()).filter(Boolean);

    const body = {
        automod: {
            enabled:         document.getElementById('automod-enabled').checked,
            filterProfanity: document.getElementById('automod-profanity').checked,
            filterLinks:     document.getElementById('automod-links').checked,
            filterInvites:   document.getElementById('automod-invites').checked,
            antiSpam:        document.getElementById('automod-spam').checked,
            antiRaid:        document.getElementById('automod-raid').checked,
            antiNuke:        document.getElementById('automod-nuke').checked,
        },
        badWords
    };

    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    r.ok ? showToast('✅ Oto-moderasyon ayarları kaydedildi!') : showToast('❌ Hata!', 'error');
}

// ---- WARN SİSTEMİ KAYDET ----
async function saveWarnSystem() {
    if (!currentGuildId) return showToast('Sunucu seçilmedi!', 'error');
    const body = {
        warnSystem: {
            enabled:      document.getElementById('warn-enabled').checked,
            muteAt:       parseInt(document.getElementById('warn-mute-at').value),
            banAt:        parseInt(document.getElementById('warn-ban-at').value),
            muteDuration: parseInt(document.getElementById('warn-mute-duration').value)
        }
    };
    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    r.ok ? showToast('✅ Uyarı sistemi kaydedildi!') : showToast('❌ Hata!', 'error');
}

// ---- LOG KANALLARI KAYDET ----
async function saveLogs() {
    if (!currentGuildId) return showToast('Sunucu seçilmedi!', 'error');
    const body = {
        logChannel:    document.getElementById('log-channel').value || null,
        modLogChannel: document.getElementById('mod-log-channel').value || null
    };
    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    r.ok ? showToast('✅ Log kanalları kaydedildi!') : showToast('❌ Hata!', 'error');
}

// ---- HOŞ GELDİN KAYDET ----
async function saveWelcome() {
    if (!currentGuildId) return showToast('Sunucu seçilmedi!', 'error');
    const body = {
        welcome: {
            enabled:   document.getElementById('welcome-enabled').checked,
            channelId: document.getElementById('welcome-channel').value || null,
            message:   document.getElementById('welcome-message').value
        }
    };
    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    r.ok ? showToast('✅ Hoş geldin sistemi kaydedildi!') : showToast('❌ Hata!', 'error');
}

// ---- UYARI SORGULA ----
async function lookupWarns() {
    if (!currentGuildId) return;
    const userId = document.getElementById('warn-user-id').value.trim();
    if (!userId) return showToast('Kullanıcı ID girin!', 'error');
    const container = document.getElementById('warn-results');
    container.innerHTML = '⏳ Yükleniyor...';
    try {
        const r = await fetch(`${API}/api/guilds/${currentGuildId}/warns/${userId}`);
        const warns = await r.json();
        if (!warns.length) { container.innerHTML = '<div style="color:#72767d;padding:16px">Bu kullanıcının hiç uyarısı yok. ✅</div>'; return; }
        container.innerHTML = warns.map((w, i) => `
            <div class="warn-item">
                <div class="warn-item-header">
                    <span class="warn-num">⚠️ Uyarı #${i + 1}</span>
                    <span class="warn-date">${new Date(w.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <div class="warn-reason">${w.reason}</div>
                <div class="warn-mod">🛡️ Yetkili: ${w.moderator}</div>
            </div>
        `).join('');
    } catch (_) { container.innerHTML = '<div style="color:#ed4245">Hata oluştu.</div>'; }
}

// ---- OTO-CEVAPLAR ----
async function loadAutoResponders() {
    if (!currentGuildId) return;
    const container = document.getElementById('ar-list');
    const s = guildData?.settings?.autoResponders;
    if (!s?.length) { container.innerHTML = '<div style="color:#72767d;padding:16px;text-align:center">Henüz oto-cevap eklenmemiş.</div>'; return; }
    container.innerHTML = s.map(ar => `
        <div class="ar-item">
            <div class="ar-item-text">
                <span class="ar-trigger">${ar.trigger}</span>
                <span style="color:#72767d">→</span>
                <span style="margin-left:8px">${ar.response}</span>
            </div>
            <button class="btn-danger" onclick="deleteAutoResponder('${ar.trigger}')">🗑️ Sil</button>
        </div>
    `).join('');
}

async function addAutoResponder() {
    if (!currentGuildId) return;
    const trigger  = document.getElementById('ar-trigger').value.trim().toLowerCase();
    const response = document.getElementById('ar-response').value.trim();
    if (!trigger || !response) return showToast('Lütfen tüm alanları doldurun!', 'error');

    const body = { $push: { autoResponders: { trigger, response } } };
    // Var olan listeye ekle
    const existing = guildData?.settings?.autoResponders || [];
    existing.push({ trigger, response });
    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoResponders: existing })
    });
    if (r.ok) {
        showToast('✅ Oto-cevap eklendi!');
        document.getElementById('ar-trigger').value = '';
        document.getElementById('ar-response').value = '';
        await loadGuildData();
        loadAutoResponders();
    } else showToast('❌ Hata!', 'error');
}

async function deleteAutoResponder(trigger) {
    if (!currentGuildId) return;
    const existing = (guildData?.settings?.autoResponders || []).filter(ar => ar.trigger !== trigger);
    const r = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoResponders: existing })
    });
    if (r.ok) {
        showToast('✅ Silindi!');
        await loadGuildData();
        loadAutoResponders();
    } else showToast('❌ Hata!', 'error');
}

// ---- BAŞLAT ----
(async () => {
    await loadBotStatus();
    await loadGuilds();
    setInterval(loadBotStatus, 30000);
})();
