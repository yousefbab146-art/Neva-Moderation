// ============================================================
// NEVA MODERATION DASHBOARD - app.js (Full 5 Features Upgrade)
// ============================================================

const API = '';
let currentGuildId = null;
let guildData = null;
let logPage = 1;

const app = {
    init() {
        this.setupNavigation();
        this.fetchGuildData();
        lucide.createIcons();
    },

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const pages = document.querySelectorAll('.page');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                pages.forEach(p => {
                    p.classList.remove('active', 'animate-fade-in');
                    if (p.id === targetId) {
                        p.classList.add('active');
                        setTimeout(() => p.classList.add('animate-fade-in'), 10);
                    }
                });

                if (targetId === 'modlogs') this.loadModLogs();
                if (targetId === 'warns') this.loadWarns();
                if (targetId === 'logs') this.loadLogs();
            });
        });
        
        document.getElementById('modal-backdrop').addEventListener('click', () => this.closeModals());
    },

    async fetchGuildData() {
        try {
            const res = await fetch(`${API}/api/guilds/current`);
            const data = await res.json();
            
            if (data.error) {
                this.showToast('Veri yüklenemedi: ' + data.error, 'error');
                return;
            }

            currentGuildId = data.id;
            guildData = data;
            
            document.getElementById('currentGuildName').innerText = data.name;
            document.getElementById('stat-members').innerText = data.memberCount || 0;
            document.getElementById('stat-channels').innerText = data.channelCount || 0;
            document.getElementById('bot-ping').innerText = `${data.botPing}ms`;
            
            let totalSeconds = (data.botUptime / 1000);
            let days = Math.floor(totalSeconds / 86400);
            let hours = Math.floor(totalSeconds / 3600) % 24;
            let minutes = Math.floor(totalSeconds / 60) % 60;
            document.getElementById('bot-uptime').innerText = `${days}g ${hours}s ${minutes}d`;
            
            // Dropdown Seçeneklerini doldur (Channels, Categories, Roles)
            this.populateSelects(data.channels, data.categories, data.roles);

            // Mevcut ayarları forma doldur
            const s = data.settings || {};
            this.renderTempVoiceSettings(s);
            this.renderLevelSettings(s);
            this.renderWhitelistSettings(s);
            this.renderCustomLogSettings(s);
            this.renderGuardSettings(s);
            this.renderAutoRoleSettings(s);
            this.renderAutoModSettings(s);
            this.renderWelcomeSettings(s);
            this.renderAutoResponders(s.autoResponders);

        } catch (err) {
            console.error(err);
            this.showToast('Sunucuya bağlanılamadı.', 'error');
        }
    },

    populateSelects(channels = [], categories = [], roles = []) {
        const channelSelects = document.querySelectorAll('.channel-select');
        const categorySelects = document.querySelectorAll('.category-select');
        const roleSelects = document.querySelectorAll('.role-select');

        const channelOptionsHtml = '<option value="">-- Kanal Seçilmedi --</option>' + 
            channels.map(c => `<option value="${c.id}"># ${c.name}</option>`).join('');

        const categoryOptionsHtml = '<option value="">-- Kategori Seçilmedi --</option>' + 
            categories.map(c => `<option value="${c.id}">📁 ${c.name}</option>`).join('');

        const roleOptionsHtml = '<option value="">-- Rol Seçilmedi --</option>' + 
            roles.map(r => `<option value="${r.id}">@ ${r.name}</option>`).join('');

        channelSelects.forEach(select => select.innerHTML = channelOptionsHtml);
        categorySelects.forEach(select => select.innerHTML = categoryOptionsHtml);
        roleSelects.forEach(select => select.innerHTML = roleOptionsHtml);
    },

    // 1. Live Embed Builder
    updateEmbedPreview() {
        const title = document.getElementById('eb-title').value.trim() || 'Başlık Burada Görünecek';
        const desc = document.getElementById('eb-desc').value.trim() || 'Açıklama metniniz canlı olarak burada önizlenecek.';
        const color = document.getElementById('eb-color').value || '#5865F2';
        const image = document.getElementById('eb-image').value.trim();
        const footer = document.getElementById('eb-footer').value.trim() || 'Footer metni';

        const box = document.getElementById('embed-preview-box');
        box.style.borderLeftColor = color;
        
        document.getElementById('prev-title').innerText = title;
        document.getElementById('prev-desc').innerText = desc;
        document.getElementById('prev-footer').innerText = footer;

        const imgEl = document.getElementById('prev-img');
        if (image) {
            imgEl.src = image;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    },

    async sendEmbed() {
        const channelId = document.getElementById('eb-channel').value;
        if (!channelId) return this.showToast('Lütfen hedef bir metin kanalı seçin!', 'error');

        const payload = {
            channelId,
            title: document.getElementById('eb-title').value.trim(),
            description: document.getElementById('eb-desc').value.trim(),
            color: document.getElementById('eb-color').value,
            image: document.getElementById('eb-image').value.trim(),
            footer: document.getElementById('eb-footer').value.trim()
        };

        try {
            const res = await fetch(`${API}/api/guilds/${currentGuildId}/send-embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.showToast('Embed duyurusu kanala başarıyla gönderildi!', 'success');
            } else {
                const err = await res.json();
                this.showToast('Hata: ' + (err.error || 'Gönderilemedi'), 'error');
            }
        } catch (e) {
            this.showToast('Sunucu hatası.', 'error');
        }
    },

    // 2. Geçici Ses Odaları (JTC)
    renderTempVoiceSettings(settings) {
        const tv = settings.tempVoice || {};
        document.getElementById('jtc-enabled').checked = !!tv.enabled;
        document.getElementById('jtc-channel').value = tv.channelId || '';
        document.getElementById('jtc-category').value = tv.categoryId || '';
        document.getElementById('jtc-limit').value = tv.userLimit || 16;
        document.getElementById('jtc-name').value = tv.nameFormat || "{user}'in Odası";
        document.getElementById('jtc-banner').value = tv.bannerUrl || '';
    },

    async saveTempVoiceSettings() {
        const payload = {
            tempVoice: {
                enabled: document.getElementById('jtc-enabled').checked,
                channelId: document.getElementById('jtc-channel').value || null,
                categoryId: document.getElementById('jtc-category').value || null,
                userLimit: parseInt(document.getElementById('jtc-limit').value) || 16,
                nameFormat: document.getElementById('jtc-name').value.trim() || "{user}'in Odası",
                bannerUrl: document.getElementById('jtc-banner').value.trim() || null
            }
        };

        await this.updateSettings(payload, 'Geçici Ses Odası (JTC) ayarları kaydedildi!');
    },

    // 3. Seviye & XP Sistemi
    renderLevelSettings(settings) {
        const ls = settings.levelSystem || {};
        document.getElementById('lvl-enabled').checked = ls.enabled !== false;
        document.getElementById('lvl-log-channel').value = ls.logChannel || '';
        document.getElementById('lvl-xp-rate').value = ls.xpPerMessage || 15;
    },

    async saveLevelSettings() {
        const payload = {
            levelSystem: {
                enabled: document.getElementById('lvl-enabled').checked,
                logChannel: document.getElementById('lvl-log-channel').value || null,
                xpPerMessage: parseInt(document.getElementById('lvl-xp-rate').value) || 15
            }
        };

        await this.updateSettings(payload, 'Seviye & XP sistemi ayarları kaydedildi!');
    },

    // 4. Muafiyet (Whitelist)
    renderWhitelistSettings(settings) {
        const wl = settings.whitelist || {};
        document.getElementById('wl-channel').value = (wl.channels && wl.channels[0]) || '';
        document.getElementById('wl-role').value = (wl.roles && wl.roles[0]) || '';
    },

    async saveWhitelistSettings() {
        const channel = document.getElementById('wl-channel').value;
        const role = document.getElementById('wl-role').value;

        const payload = {
            whitelist: {
                channels: channel ? [channel] : [],
                roles: role ? [role] : []
            }
        };

        await this.updateSettings(payload, 'Muafiyet ayarları kaydedildi!');
    },

    // 5. Ayrı Log Kanalları Ayarları
    renderCustomLogSettings(settings) {
        if (!settings) return;
        document.getElementById('log-ban').value = settings.banLogChannel || '';
        document.getElementById('log-mute').value = settings.muteLogChannel || '';
        document.getElementById('log-kick').value = settings.kickLogChannel || '';
        document.getElementById('log-warn').value = settings.warnLogChannel || '';
        document.getElementById('log-message').value = settings.messageLogChannel || '';
        document.getElementById('log-voice').value = settings.voiceLogChannel || '';
        document.getElementById('log-member').value = settings.memberLogChannel || '';
    },

    async saveLogChannels() {
        const payload = {
            banLogChannel: document.getElementById('log-ban').value || null,
            muteLogChannel: document.getElementById('log-mute').value || null,
            kickLogChannel: document.getElementById('log-kick').value || null,
            warnLogChannel: document.getElementById('log-warn').value || null,
            messageLogChannel: document.getElementById('log-message').value || null,
            voiceLogChannel: document.getElementById('log-voice').value || null,
            memberLogChannel: document.getElementById('log-member').value || null,
        };

        await this.updateSettings(payload, 'Ayrı Log Kanalları kaydedildi!');
    },

    // Guard Ayarları
    renderGuardSettings(settings) {
        const g = settings.guard || {};
        document.getElementById('guard-age-limit').value = g.accountAgeLimit || 7;
        document.getElementById('guard-age-action').value = g.actionOnNewAccount || 'quarantine';
        document.getElementById('guard-anti-bot').checked = !!g.antiBotJoin;
    },

    async saveGuardSettings() {
        const payload = {
            guard: {
                accountAgeLimit: parseInt(document.getElementById('guard-age-limit').value) || 0,
                actionOnNewAccount: document.getElementById('guard-age-action').value,
                antiBotJoin: document.getElementById('guard-anti-bot').checked
            }
        };

        await this.updateSettings(payload, 'Sunucu Koruma (Guard) ayarları kaydedildi!');
    },

    // Oto-Rol Ayarları
    renderAutoRoleSettings(settings) {
        const ar = settings.autoRole || {};
        document.getElementById('role-user').value = ar.userRole || '';
        document.getElementById('role-bot').value = ar.botRole || '';
        document.getElementById('role-quarantine').value = settings.quarantineRole || '';
    },

    async saveAutoRoleSettings() {
        const payload = {
            autoRole: {
                userRole: document.getElementById('role-user').value || null,
                botRole: document.getElementById('role-bot').value || null
            },
            quarantineRole: document.getElementById('role-quarantine').value || null
        };

        await this.updateSettings(payload, 'Oto-Rol ayarları kaydedildi!');
    },

    // Genel Yardımcı
    async updateSettings(payload, successMsg) {
        try {
            const res = await fetch(`${API}/api/guilds/${currentGuildId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                this.showToast(successMsg, 'success');
                this.fetchGuildData();
            } else {
                this.showToast('Ayarlar kaydedilemedi.', 'error');
            }
        } catch (err) {
            console.error(err);
            this.showToast('Sunucu hatası.', 'error');
        }
    },

    async refreshData() {
        await this.fetchGuildData();
        this.showToast('Veriler güncellendi', 'success');
    },

    // ModLogs
    async loadModLogs(page = 1) {
        if (!currentGuildId) return;
        try {
            const res = await fetch(`${API}/api/guilds/${currentGuildId}/modlogs?page=${page}&limit=10`);
            const data = await res.json();
            
            const tbody = document.getElementById('modlog-table-body');
            tbody.innerHTML = '';
            
            if (!data.logs || data.logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted)">Kayıt bulunamadı.</td></tr>';
            } else {
                data.logs.forEach(log => {
                    let actionIcon = '';
                    let actionClass = '';
                    switch (log.type) {
                        case 'ban': actionIcon = 'hammer'; actionClass = 'danger'; break;
                        case 'kick': actionIcon = 'user-minus'; actionClass = 'warning'; break;
                        case 'warn': actionIcon = 'alert-circle'; actionClass = 'warning'; break;
                        default: actionIcon = 'shield'; actionClass = 'success';
                    }

                    const date = new Date(log.createdAt).toLocaleString('tr-TR');
                    tbody.innerHTML += `
                        <tr>
                            <td><span class="status-badge ${actionClass}"><i data-lucide="${actionIcon}" style="width:12px; height:12px; margin-right:4px;"></i>${log.type.toUpperCase()}</span></td>
                            <td>${log.userId}</td>
                            <td>${log.moderator}</td>
                            <td>${log.reason}</td>
                            <td>${date}</td>
                        </tr>
                    `;
                });
            }
            
            logPage = data.page || 1;
            document.getElementById('modlog-page-info').innerText = `Sayfa ${logPage} / ${data.totalPages || 1}`;
            lucide.createIcons();
        } catch (err) {
            console.error(err);
        }
    },

    prevModLogPage() {
        if (logPage > 1) this.loadModLogs(logPage - 1);
    },
    nextModLogPage() {
        this.loadModLogs(logPage + 1);
    },

    // Warns
    async loadWarns(userId = '') {
        if (!currentGuildId) return;
        try {
            const url = userId 
                ? `${API}/api/guilds/${currentGuildId}/warns/${userId}`
                : `${API}/api/guilds/${currentGuildId}/warns`;
                
            const res = await fetch(url);
            const data = await res.json();
            
            const tbody = document.getElementById('warn-table-body');
            tbody.innerHTML = '';
            
            const warns = Array.isArray(data) ? data : (data.warns || []);
            document.getElementById('stat-warns').innerText = warns.length;

            if (warns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted)">Uyarı kaydı bulunamadı.</td></tr>';
                return;
            }

            warns.forEach(warn => {
                const date = new Date(warn.createdAt).toLocaleString('tr-TR');
                tbody.innerHTML += `
                    <tr>
                        <td>${warn.userId}</td>
                        <td>${warn.moderator}</td>
                        <td>${warn.reason}</td>
                        <td>${date}</td>
                        <td>
                            <button class="icon-btn" onclick="app.deleteWarn('${warn._id}')" title="Sil">
                                <i data-lucide="trash-2" style="color: var(--danger)"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            lucide.createIcons();
        } catch (err) {
            console.error(err);
        }
    },

    searchWarns() {
        const input = document.getElementById('warn-search').value.trim();
        this.loadWarns(input);
    },

    async deleteWarn(warnId) {
        if (!confirm('Bu uyarıyı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API}/api/guilds/${currentGuildId}/warns/${warnId}`, { method: 'DELETE' });
            if (res.ok) {
                this.showToast('Uyarı başarıyla silindi.', 'success');
                this.loadWarns();
            }
        } catch (err) {
            console.error(err);
        }
    },

    // AutoMod & Bad Words
    renderAutoModSettings(settings) {
        if (!settings) return;
        const am = settings.automod || {};
        const badWords = settings.badWords || ['amk', 'sik', 'piç', 'yarrak', 'orospu'];

        const badWordsListHtml = badWords.map((word, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #161616; border: 1px solid #333; border-radius: 6px; margin-bottom: 6px;">
                <span style="font-weight: 600; color: #f59e0b; font-size: 0.9rem;">${index + 1}. <span style="color: #fff; font-weight: 400;">${word}</span></span>
                <button class="icon-btn" onclick="app.removeBadWord('${word}')" style="width: 28px; height: 28px;" title="Sil">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--danger)"></i>
                </button>
            </div>
        `).join('');

        const html = `
            <div class="setting-item" style="flex-direction: column; align-items: flex-start; gap: 16px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <div class="setting-info">
                        <h3><i data-lucide="message-square-off" style="width:16px; margin-right:6px"></i> Küfür Koruması</h3>
                        <p>Sunucuda küfür ve argo kelimeleri engeller.</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="am-swear" ${am.filterProfanity ? 'checked' : ''} onchange="app.toggleBadWordsBox()">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <!-- Altın / Amber Temalı Engellenecek Kelimeler Listesi -->
                <div id="bad-words-box" style="width: 100%; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px; display: ${am.filterProfanity ? 'block' : 'none'};">
                    <h4 style="color: #f59e0b; margin-bottom: 12px; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="shield-alert" style="width:16px;"></i> Engellenecek Kelimeler Listesi (Sıralı)
                    </h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                        <input type="text" id="new-bad-word" placeholder="Yeni engellenecek kelime yazın..." class="sleek-input" style="flex: 1;">
                        <button class="action-btn primary" onclick="app.addBadWord()" style="background: #f59e0b; color: #000; font-weight: 600;">
                            <i data-lucide="plus"></i> Ekle
                        </button>
                    </div>
                    <div id="bad-words-container" style="max-height: 250px; overflow-y: auto;">
                        ${badWordsListHtml || '<p style="color: var(--text-muted); font-size: 0.85rem;">Engellenmiş kelime yok.</p>'}
                    </div>
                </div>
            </div>

            <div class="setting-item">
                <div class="setting-info">
                    <h3><i data-lucide="link" style="width:16px; margin-right:6px"></i> Reklam Koruması (Linkler)</h3>
                    <p>Discord davet linkleri ve diğer zararlı linkleri engeller.</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="am-links" ${am.filterLinks ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="setting-item">
                <div class="setting-info">
                    <h3><i data-lucide="shield-alert" style="width:16px; margin-right:6px"></i> Spam Koruması</h3>
                    <p>Arka arkaya hızlı mesaj atılmasını engeller.</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="am-spam" ${am.antiSpam ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
        document.getElementById('automod-settings').innerHTML = html;
        lucide.createIcons();
    },

    toggleBadWordsBox() {
        const isChecked = document.getElementById('am-swear').checked;
        document.getElementById('bad-words-box').style.display = isChecked ? 'block' : 'none';
    },

    async addBadWord() {
        const input = document.getElementById('new-bad-word');
        const word = input.value.trim().toLowerCase();
        if (!word) return;

        const currentWords = guildData?.settings?.badWords || ['amk', 'sik', 'piç', 'yarrak', 'orospu'];
        if (!currentWords.includes(word)) {
            currentWords.push(word);
            await this.updateSettings({ badWords: currentWords }, `"${word}" yasaklı kelimelere eklendi!`);
            input.value = '';
        }
    },

    async removeBadWord(word) {
        let currentWords = guildData?.settings?.badWords || ['amk', 'sik', 'piç', 'yarrak', 'orospu'];
        currentWords = currentWords.filter(w => w.toLowerCase() !== word.toLowerCase());
        await this.updateSettings({ badWords: currentWords }, `"${word}" listeden kaldırıldı.`);
    },

    async saveAutoModSettings() {
        const payload = {
            automod: {
                filterProfanity: document.getElementById('am-swear').checked,
                filterLinks: document.getElementById('am-links').checked,
                antiSpam: document.getElementById('am-spam').checked,
            }
        };
        await this.updateSettings(payload, 'Oto-Mod ayarları kaydedildi!');
    },

    // AutoResponders
    renderAutoResponders(ars) {
        const tbody = document.getElementById('autoresponder-table-body');
        tbody.innerHTML = '';
        if (!ars || ars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted)">Hiç oto-cevap yok.</td></tr>';
            return;
        }

        ars.forEach(ar => {
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: 500">${ar.trigger}</td>
                    <td>${ar.response || ar.reply}</td>
                    <td>
                        <button class="icon-btn" onclick="app.deleteAutoResponder('${ar.trigger}')">
                            <i data-lucide="trash-2" style="color: var(--danger)"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        lucide.createIcons();
    },

    showAddAutoResponderModal() {
        document.getElementById('modal-backdrop').style.display = 'block';
        const modal = document.getElementById('add-autoresponder-modal');
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    },

    closeModals() {
        const modal = document.getElementById('add-autoresponder-modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('modal-backdrop').style.display = 'none';
        }, 300);
    },

    async saveAutoResponder() {
        const trigger = document.getElementById('ar-trigger').value.trim();
        const response = document.getElementById('ar-reply').value.trim();
        if (!trigger || !response) return this.showToast('Lütfen alanları doldurun.', 'error');

        const currentArs = guildData?.settings?.autoResponders || [];
        currentArs.push({ trigger, response });

        await this.updateSettings({ autoResponders: currentArs }, 'Oto-cevap eklendi!');
        this.closeModals();
        document.getElementById('ar-trigger').value = '';
        document.getElementById('ar-reply').value = '';
    },

    async deleteAutoResponder(trigger) {
        if (!confirm('Bunu silmek istiyor musunuz?')) return;
        const currentArs = (guildData?.settings?.autoResponders || []).filter(a => a.trigger !== trigger);
        await this.updateSettings({ autoResponders: currentArs }, 'Oto-cevap silindi.');
    },

    // Welcome Settings
    renderWelcomeSettings(settings) {
        if (!settings) return;
        const w = settings.welcome || {};
        
        const html = `
            <div class="setting-item" style="flex-direction: column; align-items: flex-start; gap: 16px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <div class="setting-info">
                        <h3><i data-lucide="user-check" style="width:16px; margin-right:6px"></i> Karşılama Sistemi</h3>
                        <p>Açık olduğunda yeni üyelere mesaj atılır.</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="w-enabled" ${w.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="form-group" style="width: 100%;">
                    <label>Kanal ID</label>
                    <input type="text" id="w-channel" value="${w.channelId || ''}" placeholder="Kanal ID'sini buraya yapıştırın" class="sleek-input">
                </div>
                <div class="form-group" style="width: 100%;">
                    <label>Hoş Geldin Mesajı (Değişkenler: {user}, {server}, {memberCount})</label>
                    <textarea id="w-message" rows="3" class="sleek-input">${w.message || 'Hoş geldin {user}! {server} sunucusuna katıldın. Seninle beraber {memberCount} kişiyiz.'}</textarea>
                </div>
            </div>
        `;
        document.getElementById('welcome-settings').innerHTML = html;
        lucide.createIcons();
    },

    async saveWelcomeSettings() {
        const payload = {
            welcome: {
                enabled: document.getElementById('w-enabled').checked,
                channelId: document.getElementById('w-channel').value.trim(),
                message: document.getElementById('w-message').value.trim()
            }
        };
        await this.updateSettings(payload, 'Karşılama ayarları kaydedildi!');
    },

    // System Logs
    async loadLogs() {
        try {
            const res = await fetch(`${API}/api/logs`);
            const text = await res.text();
            
            const formatted = text.split('\n').map(line => {
                if(!line.trim()) return '';
                const time = new Date().toLocaleTimeString('tr-TR');
                let cssClass = 'info';
                if(line.toLowerCase().includes('error') || line.toLowerCase().includes('hata')) cssClass = 'error';
                if(line.toLowerCase().includes('warn')) cssClass = 'warn';
                
                return `<span class="time">[${time}]</span><span class="${cssClass}">${line}</span>`;
            }).join('<br>');
            
            const el = document.getElementById('system-logs');
            el.innerHTML = formatted || 'Sistem logu bulunamadı veya boş.';
            el.scrollTop = el.scrollHeight;
        } catch (err) {
            console.error(err);
        }
    },

    showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 'alert-circle';
        
        toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        lucide.createIcons();
        
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
