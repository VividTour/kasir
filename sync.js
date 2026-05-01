// ============================================================
// sync.js — Offline-First Sync Queue
// Pancoran Group Kasir System
//
// Cara kerja:
// 1. Setiap transaksi masuk ke antrian (queue) di localStorage
// 2. Sistem mencoba mengirim ke Supabase setiap 60 detik secara otomatis
// 3. Jika Supabase offline → data tetap aman, kasir bisa terus bekerja
// 4. Saat koneksi kembali → semua data antrian dikirim otomatis
// ============================================================

const SyncQueue = {

    STORAGE_KEY: 'pancoran_sync_queue',
    TIMEOUT_MS: 8000, // 8 detik timeout per request

    // =====================================================
    // Tambahkan transaksi baru ke antrian
    // tableName = nama tabel di Supabase (contoh: 'transaksi_hotel')
    // payload   = data transaksi
    // =====================================================
    push(tableName, payload) {
        const queue = this.getQueue();
        const item = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            tableName,
            payload,
            createdAt: new Date().toISOString(),
            attempts: 0,
            synced: false,
            syncedAt: null,
        };
        queue.push(item);
        this.saveQueue(queue);
        this.updateUI();

        // Langsung coba kirim (mungkin Supabase sedang online)
        this.trySync();
    },

    // =====================================================
    // Baca antrian dari localStorage
    // =====================================================
    getQueue() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    },

    saveQueue(queue) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    },

    getPendingCount() {
        return this.getQueue().filter(i => !i.synced).length;
    },

    // =====================================================
    // Coba sinkronisasi semua item yang belum terkirim
    // =====================================================
    async trySync() {
        const queue = this.getQueue();
        const pending = queue.filter(item => !item.synced);
        if (pending.length === 0) return;

        let syncedCount = 0;

        for (const item of pending) {
            try {
                // Siapkan data yang akan dikirim ke Supabase
                const data = {
                    ...item.payload,
                    queue_id: item.id,
                };

                // Kirim ke Supabase via REST API
                const result = await SupabaseClient.insert(item.tableName, data);

                if (result.ok) {
                    item.synced = true;
                    item.syncedAt = new Date().toISOString();
                    syncedCount++;
                } else {
                    item.attempts++;
                }
            } catch (e) {
                // Network error atau timeout — Supabase belum bisa diakses
                item.attempts++;
            }
        }

        this.saveQueue(queue);
        this.updateUI();

        if (syncedCount > 0) {
            console.log(`[SyncQueue] ✅ ${syncedCount} transaksi berhasil disinkronkan ke Supabase`);
            this.showSyncToast(syncedCount);
        }

        this.cleanup();
    },

    // =====================================================
    // Sinkronisasi manual (dipanggil dari tombol di UI)
    // =====================================================
    async manualSync() {
        const btn = document.getElementById('syncBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⟳ Menyinkron...';
        }
        await this.trySync();
        if (btn) {
            btn.disabled = false;
            this.updateUI();
        }
    },

    // =====================================================
    // Update tampilan badge dan tombol sinkron di navbar
    // =====================================================
    updateUI() {
        const pending = this.getPendingCount();
        const badge = document.getElementById('syncBadge');
        const btn = document.getElementById('syncBtn');
        const dot = document.getElementById('syncDot');

        if (badge) {
            badge.textContent = pending;
            badge.style.display = pending > 0 ? 'flex' : 'none';
        }

        if (btn) {
            if (pending > 0) {
                btn.textContent = `⟳ Antrian (${pending})`;
                btn.style.borderColor = '#d97706';
                btn.style.color = '#d97706';
            } else {
                btn.textContent = '✓ Tersinkron';
                btn.style.borderColor = '#16a34a';
                btn.style.color = '#16a34a';
            }
        }

        if (dot) {
            dot.style.background = pending > 0 ? '#d97706' : '#16a34a';
            dot.title = pending > 0 ? `${pending} transaksi menunggu sinkronisasi` : 'Semua data tersinkron';
        }
    },

    // =====================================================
    // Hapus data lama yang sudah terkirim (>7 hari)
    // =====================================================
    cleanup() {
        const queue = this.getQueue();
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const cleaned = queue.filter(item => {
            if (!item.synced) return true; // Jangan hapus yang belum terkirim
            return new Date(item.syncedAt).getTime() > cutoff;
        });
        this.saveQueue(cleaned);
    },

    // =====================================================
    // Toast notifikasi sinkronisasi berhasil
    // =====================================================
    showSyncToast(count) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = `🔄 ${count} transaksi berhasil disinkronkan ke server`;
        t.className = 'toast success show';
        setTimeout(() => t.classList.remove('show'), 4000);
    },

    // =====================================================
    // Statistik antrian (untuk debugging)
    // =====================================================
    getStats() {
        const queue = this.getQueue();
        const total = queue.length;
        const synced = queue.filter(i => i.synced).length;
        const pending = total - synced;
        console.table({ total, synced, pending });
        return { total, synced, pending };
    },
};

// =====================================================
// Auto-sync setiap 60 detik
// =====================================================
setInterval(() => SyncQueue.trySync(), 60 * 1000);

// Sync saat halaman kembali aktif (user alt-tab, dll)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        SyncQueue.trySync();
    }
});

// Inisialisasi saat halaman pertama kali load
window.addEventListener('load', () => {
    SyncQueue.updateUI();
    SyncQueue.trySync();
});
