// ============================================================
// closing-utils.js — Tutup Kasir per Shift
// Pancoran Group Kasir System
//
// Flow:
// 1. Hitung expected cash dari Supabase (total Cash per unit+shift hari ini)
// 2. Kasir input actual cash (hitung fisik)
// 3. Sistem catat selisih + PIN kasir yang menutup
// ============================================================

const ClosingUtils = {

    // Cek apakah shift ini sudah ditutup hari ini
    async checkAlreadyClosed(unitName, shift) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const url = `${CONFIG.supabase.url}/rest/v1/${CONFIG.tables.closing}` +
                `?select=id` +
                `&unit=eq.${encodeURIComponent(unitName)}` +
                `&shift_number=eq.${shift}` +
                `&closed_at=gte.${today}T00:00:00Z`;
            
            const res = await fetch(url, {
                headers: {
                    'apikey': CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
                    'x-unit-id': unitName,
                },
            });
            if (res.ok) {
                const rows = await res.json();
                return rows.length > 0;
            }
        } catch { /* offline, anggap belum */ }
        return false;
    },

    // Hitung total expected cash dari semua tabel transaksi hari ini
    async calculateExpectedCash(unitName, shift) {
        const tables = [
            { tbl: CONFIG.tables.hotel },
            { tbl: CONFIG.tables.karaoke },
            { tbl: CONFIG.tables.wahana },
            { tbl: CONFIG.tables.fnb },
        ];

        const today = new Date().toISOString().split('T')[0];
        let total = 0;
        const unitEncoded = encodeURIComponent(unitName);

        for (const { tbl } of tables) {
            try {
                // Ambil semua field yang mungkin dipakai untuk kalkulasi spesifik
                const url = `${CONFIG.supabase.url}/rest/v1/${tbl}` +
                    `?select=aksi,nominal,nominal_fnb,total,metode_bayar` +
                    `&unit=eq.${unitEncoded}` +
                    `&shift_number=eq.${shift}` +
                    `&metode_bayar=eq.Cash` +
                    `&created_at=gte.${today}T00:00:00Z`;

                const res = await fetch(url, {
                    headers: {
                        'apikey': CONFIG.supabase.anonKey,
                        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
                        'x-unit-id': unitName,
                    },
                });

                if (res.ok) {
                    const rows = await res.json();
                    rows.forEach(r => {
                        // LOGIKA PENCEGAH DOUBLE COUNTING
                        if (tbl === CONFIG.tables.hotel) {
                            if (r.aksi === 'CHECK_IN') total += parseInt(r.nominal || 0);
                            if (r.aksi === 'CHECK_OUT') total += parseInt(r.nominal_fnb || 0);
                        } else if (tbl === CONFIG.tables.karaoke) {
                            if (r.aksi === 'END') total += parseInt(r.total || 0);
                        } else {
                            total += parseInt(r.total || 0);
                        }
                    });
                }
            } catch { /* offline — abaikan */ }
        }
        return total;
    },

    // Submit closing shift ke Supabase
    async submit(unitName, pinInput, actualCash, notes) {
        const auth = AuthUtils.getAuthPayload();
        const pinHash = await AuthUtils.hashPin(pinInput);
        const expected = await this.calculateExpectedCash(unitName, auth.shift_number);

        const payload = {
            unit:               unitName,
            shift_number:       auth.shift_number,
            closed_by_pin:      pinHash,
            expected_cash:      expected,
            actual_cash:        parseInt(actualCash) || 0,
            notes:              notes || null,
            device_fingerprint: auth.device_fingerprint,
        };

        return SupabaseClient.insert(CONFIG.tables.closing, payload);
    },

    // Tampilkan modal tutup kasir
    async showModal(unitName) {
        const shift = AuthUtils.getAutoShift();
        const isClosed = await this.checkAlreadyClosed(unitName, shift);
        
        if (isClosed) {
            const lanjut = confirm(`⚠️ Shift ${shift} sudah pernah ditutup hari ini!\n\nJika Anda melanjutkan, sistem akan membuat rekam tutup kasir baru (ganda) di laporan owner.\n\nApakah Anda yakin ingin menutup kasir lagi?`);
            if (!lanjut) return;
        }

        const modal = document.getElementById('modalClosing');
        if (!modal) return;
        document.getElementById('closingUnitName').textContent = unitName;
        document.getElementById('actualCashInput').value = '';
        document.getElementById('diffPreview').textContent = '';
        document.getElementById('closingNotes').value = '';
        modal.classList.add('show');
    },

    // Preview selisih saat user mengetik actual cash
    previewDiff() {
        const actual = parseInt(document.getElementById('actualCashInput')?.value) || 0;
        const expectedText = document.getElementById('expectedCashDisplay')?.textContent || '0';
        const expected = parseInt(expectedText.replace(/\D/g, '')) || 0;
        const diff = actual - expected;
        const el = document.getElementById('diffPreview');
        if (!el) return;
        if (diff === 0) {
            el.textContent = '✅ Pas';
            el.style.color = 'var(--available)';
        } else if (diff > 0) {
            el.textContent = `➕ Lebih Rp ${diff.toLocaleString('id-ID')}`;
            el.style.color = '#d97706';
        } else {
            el.textContent = `➖ Kurang Rp ${Math.abs(diff).toLocaleString('id-ID')}`;
            el.style.color = 'var(--occupied)';
        }
    },
};
