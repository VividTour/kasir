// ============================================================
// karaoke-logic.js — Dual Room System Karaoke
// Pancoran Group Kasir System
//
// 2 cara sewa ruangan:
// 1. Langsung bayar sewa per jam
// 2. Beli F&B >= Rp 200.000 → FREE ROOM (sewa = Rp 0)
// ============================================================

const KaraokeLogic = {

    threshold: 0, // diisi dari CONFIG saat init()

    session: {
        ruanganId: null,
        hargaPerJam: 0,
        durasiMenit: 0,
        fnbItems: [],
        fnbCumulative: 0,
        freeRoomActivated: false,
    },

    init() {
        this.threshold = (CONFIG && CONFIG.karaoke_fnb_threshold) ? CONFIG.karaoke_fnb_threshold : 200000;
    },

    startSession(ruanganId, hargaPerJam) {
        this.session = {
            ruanganId,
            hargaPerJam,
            durasiMenit: 0,
            fnbItems: [],
            fnbCumulative: 0,
            freeRoomActivated: false,
        };
    },

    addFnbItem(item, qty) {
        const subtotal = item.harga * qty;
        const existing = this.session.fnbItems.find(i => i.id === item.id);
        if (existing) {
            existing.qty += qty;
            existing.subtotal += subtotal;
        } else {
            this.session.fnbItems.push({ ...item, qty, subtotal });
        }
        this.session.fnbCumulative += subtotal;

        // Cek threshold free room
        if (!this.session.freeRoomActivated && this.session.fnbCumulative >= this.threshold) {
            this.session.freeRoomActivated = true;
            this._showFreeRoomBadge(true);
        }
        this._updateUI();
    },

    removeFnbItem(itemId) {
        const idx = this.session.fnbItems.findIndex(i => i.id === itemId);
        if (idx < 0) return;
        const item = this.session.fnbItems[idx];
        this.session.fnbCumulative -= item.subtotal;
        this.session.fnbItems.splice(idx, 1);

        // Re-check threshold
        if (this.session.freeRoomActivated && this.session.fnbCumulative < this.threshold) {
            this.session.freeRoomActivated = false;
            this._showFreeRoomBadge(false);
        }
        this._updateUI();
    },

    setDurasi(durasiMenit) {
        this.session.durasiMenit = durasiMenit;
        this._updateUI();
    },

    getRoomFee() {
        if (this.session.freeRoomActivated) return 0;
        const jam = Math.ceil(this.session.durasiMenit / 60) || 0;
        return jam * this.session.hargaPerJam;
    },

    getGrandTotal() {
        return this.getRoomFee() + this.session.fnbCumulative;
    },

    _showFreeRoomBadge(show) {
        const badge = document.getElementById('freeRoomBadge');
        if (badge) badge.style.display = show ? 'block' : 'none';
    },

    _updateUI() {
        const roomFee = this.getRoomFee();
        const total = this.getGrandTotal();

        const elSewa = document.getElementById('karaokeSewaDisplay');
        const elFnb = document.getElementById('karaokeFnbTotal');
        const elGrand = document.getElementById('karaokeGrandTotal');

        if (elSewa) elSewa.textContent = this.session.freeRoomActivated
            ? '🎉 GRATIS (Free Room aktif)'
            : 'Rp ' + roomFee.toLocaleString('id-ID');
        if (elFnb) elFnb.textContent = 'Rp ' + this.session.fnbCumulative.toLocaleString('id-ID');
        if (elGrand) elGrand.textContent = 'Rp ' + total.toLocaleString('id-ID');
    },

    getClosingPayload() {
        return {
            fnb_cumulative:      this.session.fnbCumulative,
            free_room_activated: this.session.freeRoomActivated,
        };
    },

    reset() {
        this.session = {
            ruanganId: null, hargaPerJam: 0, durasiMenit: 0,
            fnbItems: [], fnbCumulative: 0, freeRoomActivated: false,
        };
        this._showFreeRoomBadge(false);
        this._updateUI();
    },
};

// Init saat file di-load
KaraokeLogic.init();
