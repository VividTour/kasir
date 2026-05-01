// ============================================================
// auth-utils.js — Autentikasi PIN, Device Binding & Shift
// Pancoran Group Kasir System
//
// Arsitektur keamanan 2 lapis:
// Layer 1 — Device Binding (localStorage, permanen):
//   Perangkat fisik dikunci ke 1 unit bisnis oleh owner/master.
//   Staff tidak bisa berpindah unit tanpa master PIN.
//   Walaupun staff saling berbagi PIN, mereka tetap tidak bisa
//   akses unit lain dari perangkat yang sudah terkunci.
//
// Layer 2 — Session PIN (sessionStorage, per-shift):
//   Kasir input PIN untuk membuka sesi kerja.
//   PIN divalidasi terhadap unit yang sudah terikat di Layer 1.
//   Sesi hilang saat browser ditutup / tab di-refresh.
// ============================================================

const AuthUtils = {

    DEVICE_UNIT_KEY: 'pancoran_device_unit',     // localStorage — permanen
    DEVICE_TYPE_KEY: 'pancoran_device_type',     // 'hotel' | 'karaoke' | 'wahana' | 'fnb'

    // =====================================================
    // SHA-256 Hash PIN via Web Crypto API
    // =====================================================
    async hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(pin));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    },

    getDeviceFingerprint() {
        return `${navigator.userAgent.substring(0, 60)}|${screen.width}x${screen.height}|${navigator.language}`;
    },

    // =====================================================
    // Shift — Pagi 07:00-19:00, Malam 19:00-07:00
    // =====================================================
    getAutoShift() {
        const h = new Date().getHours();
        return (h >= 7 && h < 19) ? 1 : 2;
    },

    getShiftLabel() {
        return this.getAutoShift() === 1 ? 'Shift Pagi (07:00–19:00)' : 'Shift Malam (19:00–07:00)';
    },

    // =====================================================
    // LAYER 1: DEVICE BINDING
    // Perangkat dikunci ke 1 unit oleh owner (master PIN)
    // =====================================================

    /** Cek apakah perangkat sudah terikat ke unit tertentu */
    getDeviceUnit() {
        return localStorage.getItem(this.DEVICE_UNIT_KEY); // contoh: 'hotel-1'
    },

    getDeviceType() {
        return localStorage.getItem(this.DEVICE_TYPE_KEY); // contoh: 'hotel'
    },

    /** Ikat perangkat ke unit (dipanggil setelah master PIN valid) */
    bindDevice(unitId, unitType) {
        localStorage.setItem(this.DEVICE_UNIT_KEY, unitId);
        localStorage.setItem(this.DEVICE_TYPE_KEY, unitType);
    },

    /** Reset binding perangkat (dipanggil oleh master PIN) */
    unbindDevice() {
        localStorage.removeItem(this.DEVICE_UNIT_KEY);
        localStorage.removeItem(this.DEVICE_TYPE_KEY);
    },

    isDeviceBound() {
        return !!this.getDeviceUnit();
    },

    /**
     * Tampilkan modal setup perangkat pertama kali.
     * Membutuhkan master PIN → owner pilih unit → tersimpan permanen.
     *
     * @param {string} allowedType - 'hotel' | 'karaoke' | 'wahana' | null (semua)
     * @param {Function} onBound(unitId, unitName) - callback setelah binding berhasil
     */
    showDeviceSetupModal(allowedType, onBound) {
        // Kumpulkan unit sesuai tipe halaman
        const allUnits = [
            ...CONFIG.hotels.map(h => ({ id: h.id, nama: h.nama, type: 'hotel' })),
            ...CONFIG.karaokes.map(k => ({ id: k.id, nama: k.nama, type: 'karaoke' })),
            ...CONFIG.wahanas.map(w => ({ id: w.id, nama: w.nama, type: 'wahana' })),
        ];
        const units = allowedType ? allUnits.filter(u => u.type === allowedType) : allUnits;

        const overlay = document.createElement('div');
        overlay.id = 'setupOverlay';
        overlay.className = 'pin-modal-overlay';
        overlay.innerHTML = `
            <div class="pin-modal" style="max-width:400px">
                <div class="pin-modal-icon">📱</div>
                <h2 class="pin-modal-title">Setup Perangkat</h2>
                <p class="pin-modal-subtitle" style="margin-bottom:16px">
                    Perangkat ini belum dikonfigurasi.<br>
                    Masukkan <strong>Master PIN</strong> untuk melanjutkan.
                </p>

                <!-- Step 1: Master PIN -->
                <div id="setupStep1">
                    <div class="pin-display">
                        <span class="pin-dot" id="spd0"></span><span class="pin-dot" id="spd1"></span>
                        <span class="pin-dot" id="spd2"></span><span class="pin-dot" id="spd3"></span>
                        <span class="pin-dot" id="spd4"></span><span class="pin-dot" id="spd5"></span>
                    </div>
                    <p class="pin-error" id="setupPinError" style="display:none">❌ Master PIN salah.</p>
                    <div class="pin-keypad">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `
                            <button class="pin-key${k === '' ? ' pin-key-empty' : ''}" ${k === '' ? 'disabled' : ''}
                                onclick="AuthUtils._setupKeyPress('${k}')">${k}</button>
                        `).join('')}
                    </div>
                    <p class="pin-footer">Master PIN hanya diketahui oleh owner/manajemen</p>
                </div>

                <!-- Step 2: Pilih Unit -->
                <div id="setupStep2" style="display:none">
                    <p style="font-size:13px;color:var(--muted);margin-bottom:12px;text-align:left">
                        ✅ Master PIN benar. Pilih unit bisnis untuk perangkat ini:
                    </p>
                    <div style="display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto">
                        ${units.map(u => `
                            <button onclick="AuthUtils._bindToUnit('${u.id}','${u.type}','${u.nama}')"
                                style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;
                                background:var(--bg);cursor:pointer;text-align:left;font-family:'Outfit',sans-serif;
                                font-size:14px;font-weight:600;transition:all 0.15s"
                                onmouseover="this.style.background='var(--primary)';this.style.color='#fff';this.style.borderColor='var(--primary)'"
                                onmouseout="this.style.background='var(--bg)';this.style.color='';this.style.borderColor='var(--border)'">
                                ${u.nama}
                                <span style="font-size:11px;font-weight:400;color:inherit;opacity:0.7"> — ${u.type}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._setupBuf = '';
        this._setupOverlay = overlay;
        this._setupOnBound = onBound;
    },

    _setupBuf: '', _setupOverlay: null, _setupOnBound: null,

    _setupKeyPress(key) {
        if (key === '⌫') this._setupBuf = this._setupBuf.slice(0, -1);
        else if (this._setupBuf.length < 6 && key !== '') this._setupBuf += key;

        for (let i = 0; i < 6; i++) {
            const d = document.getElementById('spd' + i);
            if (d) d.classList.toggle('filled', i < this._setupBuf.length);
        }
        if (this._setupBuf.length === 6) this._submitSetupPin();
    },

    async _submitSetupPin() {
        const ok = await this.validateMasterPin(this._setupBuf);
        if (ok) {
            document.getElementById('setupStep1').style.display = 'none';
            document.getElementById('setupStep2').style.display = 'block';
        } else {
            const errEl = document.getElementById('setupPinError');
            if (errEl) errEl.style.display = 'block';
            for (let i = 0; i < 6; i++) {
                const d = document.getElementById('spd' + i);
                if (d) d.classList.add('error');
            }
            this._setupBuf = '';
            setTimeout(() => {
                if (errEl) errEl.style.display = 'none';
                for (let i = 0; i < 6; i++) {
                    const d = document.getElementById('spd' + i);
                    if (d) d.classList.remove('error', 'filled');
                }
            }, 1500);
        }
    },

    _bindToUnit(unitId, unitType, unitName) {
        this.bindDevice(unitId, unitType);
        if (this._setupOverlay) this._setupOverlay.remove();
        if (this._setupOnBound) this._setupOnBound(unitId, unitName);
    },

    // =====================================================
    // LAYER 2: SESSION PIN (per shift)
    // =====================================================

    async validatePin(unitId, pinInput) {
        const hash = await this.hashPin(pinInput);
        return CONFIG.pins[unitId] === hash;
    },

    async validateMasterPin(pinInput) {
        const hash = await this.hashPin(pinInput);
        return CONFIG.pins['master'] === hash;
    },

    setSession(unitId, pinHash) {
        sessionStorage.setItem('kasir_unit', unitId);
        sessionStorage.setItem('kasir_pin_hash', pinHash);
        sessionStorage.setItem('kasir_shift', this.getAutoShift());
        sessionStorage.setItem('kasir_device', this.getDeviceFingerprint());
        sessionStorage.setItem('kasir_login_at', new Date().toISOString());
    },

    getSession() {
        return {
            unitId: sessionStorage.getItem('kasir_unit'),
            pinHash: sessionStorage.getItem('kasir_pin_hash'),
            shift: parseInt(sessionStorage.getItem('kasir_shift') || '1'),
            device: sessionStorage.getItem('kasir_device'),
            loginAt: sessionStorage.getItem('kasir_login_at'),
        };
    },

    isLoggedIn(unitId) {
        return sessionStorage.getItem('kasir_unit') === unitId;
    },

    clearSession() {
        ['kasir_unit', 'kasir_pin_hash', 'kasir_shift', 'kasir_device', 'kasir_login_at']
            .forEach(k => sessionStorage.removeItem(k));
    },

    getAuthPayload() {
        const s = this.getSession();
        return {
            staff_pin_hash: s.pinHash || null,
            device_fingerprint: s.device || this.getDeviceFingerprint(),
            shift_number: s.shift || this.getAutoShift(),
        };
    },

    /**
     * Entry point utama untuk setiap halaman kasir.
     * Alur:
     *   1. Cek apakah perangkat sudah bound ke unit → jika belum, setup dulu
     *   2. Verifikasi unit yang bound sesuai tipe halaman → keamanan tambahan
     *   3. Tampilkan PIN modal untuk buka sesi kasir
     *
     * @param {string} allowedType - 'hotel' | 'karaoke' | 'wahana'
     * @param {Function} onReady(unitId, unitName) - callback setelah semua valid
     */
    initPage(allowedType, onReady) {
        const boundUnitId = this.getDeviceUnit();
        const boundUnitType = this.getDeviceType();

        // Belum pernah di-setup → tampilkan setup modal
        if (!boundUnitId) {
            this.showDeviceSetupModal(allowedType, (unitId, unitName) => {
                this._openSessionPin(unitId, unitName, onReady);
            });
            return;
        }

        // Perangkat sudah bound tapi dibuka di halaman yang salah
        // (misal: tablet hotel dibuka di kasir-karaoke.html)
        if (allowedType && boundUnitType !== allowedType) {
            this._showWrongPageWarning(boundUnitType, boundUnitId);
            return;
        }

        // Cari nama unit dari CONFIG
        const allUnits = [
            ...CONFIG.hotels.map(h => ({ id: h.id, nama: h.nama })),
            ...CONFIG.karaokes.map(k => ({ id: k.id, nama: k.nama })),
            ...CONFIG.wahanas.map(w => ({ id: w.id, nama: w.nama })),
        ];
        const unit = allUnits.find(u => u.id === boundUnitId);
        const unitName = unit ? unit.nama : boundUnitId;

        // Jika sesi sudah aktif untuk unit ini, langsung lanjut
        if (this.isLoggedIn(boundUnitId)) {
            const s = this.getSession();
            onReady(boundUnitId, unitName, s.pinHash);
            return;
        }

        // Tampilkan PIN modal untuk buka sesi
        this._openSessionPin(boundUnitId, unitName, onReady);
    },

    _openSessionPin(unitId, unitName, onReady) {
        const overlay = document.createElement('div');
        overlay.id = 'pinModalOverlay';
        overlay.className = 'pin-modal-overlay';
        overlay.innerHTML = `
            <div class="pin-modal">
                <div class="pin-modal-icon">🔐</div>
                <h2 class="pin-modal-title">${unitName}</h2>
                <p class="pin-modal-subtitle">${this.getShiftLabel()}</p>
                <div class="pin-display">
                    <span class="pin-dot" id="pd0"></span><span class="pin-dot" id="pd1"></span>
                    <span class="pin-dot" id="pd2"></span><span class="pin-dot" id="pd3"></span>
                    <span class="pin-dot" id="pd4"></span><span class="pin-dot" id="pd5"></span>
                </div>
                <p class="pin-error" id="pinError" style="display:none">❌ PIN salah. Coba lagi.</p>
                <div class="pin-keypad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `
                        <button class="pin-key${k === '' ? ' pin-key-empty' : ''}" ${k === '' ? 'disabled' : ''}
                            onclick="AuthUtils._keyPress('${k}')">${k}</button>
                    `).join('')}
                </div>
                <p class="pin-footer">Perangkat ini terkunci untuk: <strong>${unitName}</strong></p>
            </div>
        `;
        document.body.appendChild(overlay);

        this._pinBuffer = '';
        this._pinUnitId = unitId;
        this._pinOnSuccess = (uid, hash) => onReady(uid, unitName, hash);
        this._pinOverlay = overlay;
    },

    _showWrongPageWarning(boundType, boundUnitId) {
        const overlay = document.createElement('div');
        overlay.className = 'pin-modal-overlay';
        overlay.innerHTML = `
            <div class="pin-modal">
                <div class="pin-modal-icon">⛔</div>
                <h2 class="pin-modal-title" style="color:var(--occupied)">Akses Ditolak</h2>
                <p class="pin-modal-subtitle">
                    Perangkat ini dikonfigurasi untuk modul <strong>${boundType.toUpperCase()}</strong>.<br>
                    Anda membuka halaman yang salah.
                </p>
                <p style="font-size:13px;color:var(--muted);margin-top:12px">
                    Hubungi owner/manajemen untuk mengubah konfigurasi perangkat.
                </p>
                <button onclick="window.location.href='index.html'"
                    style="margin-top:20px;width:100%;padding:12px;background:var(--primary);color:#fff;
                    border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">
                    ← Kembali ke Beranda
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // =====================================================
    // PIN Keypad handler (session login)
    // =====================================================
    _pinBuffer: '', _pinUnitId: '', _pinOnSuccess: null, _pinOverlay: null,

    _keyPress(key) {
        if (key === '⌫') this._pinBuffer = this._pinBuffer.slice(0, -1);
        else if (this._pinBuffer.length < 6 && key !== '') this._pinBuffer += key;

        for (let i = 0; i < 6; i++) {
            const dot = document.getElementById('pd' + i);
            if (dot) dot.classList.toggle('filled', i < this._pinBuffer.length);
        }
        if (this._pinBuffer.length === 6) this._submitPin();
    },

    async _submitPin() {
        const valid = await this.validatePin(this._pinUnitId, this._pinBuffer);
        if (valid) {
            const hash = await this.hashPin(this._pinBuffer);
            this.setSession(this._pinUnitId, hash);
            if (this._pinOverlay) this._pinOverlay.remove();
            if (this._pinOnSuccess) this._pinOnSuccess(this._pinUnitId, hash);
        } else {
            const errEl = document.getElementById('pinError');
            if (errEl) errEl.style.display = 'block';
            for (let i = 0; i < 6; i++) {
                const dot = document.getElementById('pd' + i);
                if (dot) dot.classList.add('error');
            }
            this._pinBuffer = '';
            setTimeout(() => {
                if (errEl) errEl.style.display = 'none';
                for (let i = 0; i < 6; i++) {
                    const dot = document.getElementById('pd' + i);
                    if (dot) dot.classList.remove('error', 'filled');
                }
            }, 1500);
        }
    },

    // =====================================================
    // Ganti binding perangkat (butuh master PIN)
    // Untuk owner yang ingin pindahkan tablet ke unit lain
    // =====================================================
    showRebindModal(allowedType) {
        const overlay = document.createElement('div');
        overlay.className = 'pin-modal-overlay';
        overlay.innerHTML = `
            <div class="pin-modal">
                <div class="pin-modal-icon">⚙️</div>
                <h2 class="pin-modal-title">Ganti Perangkat</h2>
                <p class="pin-modal-subtitle">Masukkan Master PIN untuk mengubah konfigurasi perangkat ini.</p>
                <div class="pin-display">
                    <span class="pin-dot" id="rpd0"></span><span class="pin-dot" id="rpd1"></span>
                    <span class="pin-dot" id="rpd2"></span><span class="pin-dot" id="rpd3"></span>
                    <span class="pin-dot" id="rpd4"></span><span class="pin-dot" id="rpd5"></span>
                </div>
                <p class="pin-error" id="rebindError" style="display:none">❌ Master PIN salah.</p>
                <div class="pin-keypad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `
                        <button class="pin-key${k === '' ? ' pin-key-empty' : ''}" ${k === '' ? 'disabled' : ''}
                            onclick="AuthUtils._rebindKey('${k}')">${k}</button>
                    `).join('')}
                </div>
                <button onclick="this.closest('.pin-modal-overlay').remove()"
                    style="margin-top:8px;width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);
                    border-radius:10px;font-size:14px;cursor:pointer;font-family:'Outfit',sans-serif">
                    Batal
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        this._rebindBuf = '';
        this._rebindOverlay = overlay;
        this._rebindType = allowedType;
    },

    _rebindBuf: '', _rebindOverlay: null, _rebindType: null,

    _rebindKey(key) {
        if (key === '⌫') this._rebindBuf = this._rebindBuf.slice(0, -1);
        else if (this._rebindBuf.length < 6 && key !== '') this._rebindBuf += key;
        for (let i = 0; i < 6; i++) {
            const d = document.getElementById('rpd' + i);
            if (d) d.classList.toggle('filled', i < this._rebindBuf.length);
        }
        if (this._rebindBuf.length === 6) this._submitRebind();
    },

    async _submitRebind() {
        const ok = await this.validateMasterPin(this._rebindBuf);
        if (ok) {
            this.unbindDevice();
            this.clearSession();
            if (this._rebindOverlay) this._rebindOverlay.remove();
            location.reload(); // reload → setup modal muncul
        } else {
            const errEl = document.getElementById('rebindError');
            if (errEl) errEl.style.display = 'block';
            for (let i = 0; i < 6; i++) {
                const d = document.getElementById('rpd' + i);
                if (d) d.classList.add('error');
            }
            this._rebindBuf = '';
            setTimeout(() => {
                if (errEl) errEl.style.display = 'none';
                for (let i = 0; i < 6; i++) {
                    const d = document.getElementById('rpd' + i);
                    if (d) d.classList.remove('error', 'filled');
                }
            }, 1500);
        }
    },

    // Kompatibilitas mundur — showPinModal lama tetap berfungsi
    showPinModal(unitId, unitName, onSuccess) {
        if (this.isLoggedIn(unitId)) {
            const s = this.getSession();
            onSuccess(unitId, s.pinHash);
            return;
        }
        this._openSessionPin(unitId, unitName, onSuccess);
    },
};
