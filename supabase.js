// ============================================================
// supabase.js — Supabase Client Wrapper
// Pancoran Group Kasir System
//
// Menggunakan Supabase REST API langsung (tanpa SDK)
// Setiap request menyertakan x-unit-id header untuk RLS
// ============================================================

const SupabaseClient = {

    _getHeaders(unitId) {
        const session = (typeof AuthUtils !== 'undefined') ? AuthUtils.getSession() : {};
        const uid = unitId || session.unitId || '';
        return {
            'Content-Type':  'application/json',
            'apikey':        CONFIG.supabase.anonKey,
            'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
            'x-unit-id':     uid,
        };
    },

    // Insert satu baris data ke tabel Supabase
    async insert(table, data) {
        const url = `${CONFIG.supabase.url}/rest/v1/${table}`;
        try {
            const res = await fetch(url, {
                method:  'POST',
                headers: { ...this._getHeaders(), 'Prefer': 'return=minimal' },
                body:    JSON.stringify(data),
            });

            if (res.ok || res.status === 201) return { ok: true };

            const errText = await res.text();
            console.error(`[Supabase] Error inserting to ${table}:`, res.status, errText);

            // Duplicate queue_id → sudah pernah disync, anggap sukses
            if (res.status === 409 || errText.includes('duplicate') || errText.includes('unique')) {
                return { ok: true };
            }
            return { ok: false, error: errText };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    // Query data dari Supabase (untuk dashboard)
    async query(table, params = {}) {
        let url = `${CONFIG.supabase.url}/rest/v1/${table}?`;
        const parts = [];
        if (params.select)  parts.push('select=' + params.select);
        if (params.filters) {
            Object.entries(params.filters).forEach(([k, v]) => {
                parts.push(`${k}=${encodeURIComponent(v)}`);
            });
        }
        if (params.order)   parts.push('order=' + params.order);
        if (params.limit)   parts.push('limit=' + params.limit);
        url += parts.join('&');

        try {
            const headers = {
                'apikey':        CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
            };
            // Dashboard query tanpa x-unit-id (akses semua unit)
            if (params.unitId) headers['x-unit-id'] = params.unitId;

            const res = await fetch(url, { headers });
            if (res.ok) return { ok: true, data: await res.json() };
            const errText = await res.text();
            return { ok: false, error: errText, data: [] };
        } catch (e) {
            return { ok: false, error: e.message, data: [] };
        }
    },

    // Test koneksi ke Supabase
    async testConnection() {
        try {
            const url = `${CONFIG.supabase.url}/rest/v1/`;
            const res = await fetch(url, {
                headers: {
                    'apikey':        CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
                },
            });
            return res.ok;
        } catch {
            return false;
        }
    },
};
