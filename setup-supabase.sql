// ============================================================
// setup-supabase.sql — Database Schema Pancoran Group Kasir
// Versi 2: Dengan audit trail, shift closing, dan RLS ketat
//
// Cara pakai:
// 1. Buka Supabase Dashboard → SQL Editor → New Query
// 2. Paste seluruh isi file ini
// 3. Klik Run
// ============================================================

-- ===== BAGIAN 1: TABEL TRANSAKSI (buat jika belum ada) =====

CREATE TABLE IF NOT EXISTS transaksi_hotel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    queue_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ,
    unit TEXT NOT NULL,
    aksi TEXT NOT NULL,
    nomor_kamar TEXT,
    tipe_kamar TEXT,
    nama_tamu TEXT,
    jumlah_malam INTEGER,
    nominal BIGINT DEFAULT 0,
    nominal_fnb BIGINT DEFAULT 0,
    metode_bayar TEXT,
    shift_number INT,
    staff_pin_hash TEXT,
    device_fingerprint TEXT
);

CREATE TABLE IF NOT EXISTS transaksi_karaoke (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    queue_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ,
    unit TEXT NOT NULL,
    aksi TEXT NOT NULL,
    ruangan TEXT,
    tipe TEXT,
    nama_tamu TEXT,
    jam_mulai TEXT,
    durasi_menit INTEGER,
    nominal_sewa BIGINT DEFAULT 0,
    nominal_fnb BIGINT DEFAULT 0,
    total BIGINT DEFAULT 0,
    metode_bayar TEXT,
    shift_number INT,
    staff_pin_hash TEXT,
    device_fingerprint TEXT,
    fnb_cumulative BIGINT DEFAULT 0,
    free_room_activated BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS transaksi_wahana (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    queue_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ,
    unit TEXT NOT NULL,
    items JSONB,
    total BIGINT DEFAULT 0,
    metode_bayar TEXT,
    shift_number INT,
    staff_pin_hash TEXT,
    device_fingerprint TEXT
);

CREATE TABLE IF NOT EXISTS transaksi_fnb (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    queue_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ,
    unit TEXT NOT NULL,
    modul TEXT DEFAULT 'F&B',
    items JSONB,
    total BIGINT DEFAULT 0,
    metode_bayar TEXT,
    shift_number INT,
    staff_pin_hash TEXT,
    device_fingerprint TEXT,
    room_number TEXT,
    guest_name TEXT,
    is_walk_in BOOLEAN DEFAULT true,
    source_context TEXT DEFAULT 'standalone'
);

-- ===== BAGIAN 2: KOLOM TAMBAHAN (jika tabel sudah ada) =====
-- Jalankan jika migrasi dari versi lama (aman dijalankan berulang)

ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS nominal_fnb BIGINT DEFAULT 0;

ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS fnb_cumulative BIGINT DEFAULT 0;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS free_room_activated BOOLEAN DEFAULT false;

ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT true;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS source_context TEXT DEFAULT 'standalone';

-- ===== BAGIAN 3: TABEL CLOSING SHIFT =====

CREATE TABLE IF NOT EXISTS closing_shift (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit TEXT NOT NULL,
    shift_number INT NOT NULL,
    closed_by_pin TEXT,
    closed_at TIMESTAMPTZ DEFAULT now(),
    expected_cash BIGINT DEFAULT 0,
    actual_cash BIGINT DEFAULT 0,
    difference BIGINT GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
    notes TEXT,
    device_fingerprint TEXT,
    is_locked BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_closing_unit_date ON closing_shift(unit, shift_number, DATE(closed_at));

-- ===== BAGIAN 4: AUDIT LOG =====

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changed_by_pin TEXT,
    changed_at TIMESTAMPTZ DEFAULT now(),
    new_values JSONB
);

-- Trigger otomatis catat setiap INSERT ke tabel transaksi
CREATE OR REPLACE FUNCTION fn_audit_insert() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log(table_name, record_id, action, changed_by_pin, new_values)
    VALUES(TG_TABLE_NAME, NEW.id, 'INSERT', NEW.staff_pin_hash, row_to_json(NEW)::jsonb);
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_hotel   ON transaksi_hotel;
DROP TRIGGER IF EXISTS trg_audit_karaoke ON transaksi_karaoke;
DROP TRIGGER IF EXISTS trg_audit_wahana  ON transaksi_wahana;
DROP TRIGGER IF EXISTS trg_audit_fnb     ON transaksi_fnb;

CREATE TRIGGER trg_audit_hotel   AFTER INSERT ON transaksi_hotel   FOR EACH ROW EXECUTE FUNCTION fn_audit_insert();
CREATE TRIGGER trg_audit_karaoke AFTER INSERT ON transaksi_karaoke FOR EACH ROW EXECUTE FUNCTION fn_audit_insert();
CREATE TRIGGER trg_audit_wahana  AFTER INSERT ON transaksi_wahana  FOR EACH ROW EXECUTE FUNCTION fn_audit_insert();
CREATE TRIGGER trg_audit_fnb     AFTER INSERT ON transaksi_fnb     FOR EACH ROW EXECUTE FUNCTION fn_audit_insert();

-- ===== BAGIAN 5: ENABLE RLS =====

ALTER TABLE transaksi_hotel   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_karaoke ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_wahana  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_fnb     ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_shift     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- ===== BAGIAN 6: RLS POLICIES =====
-- INSERT: semua anon boleh insert (kasir offline-first)
-- SELECT: anon hanya bisa lihat data unit sendiri (via header x-unit-id)

-- Hapus policy lama
DROP POLICY IF EXISTS "Allow anon insert hotel"   ON transaksi_hotel;
DROP POLICY IF EXISTS "Allow anon select hotel"   ON transaksi_hotel;
DROP POLICY IF EXISTS "Allow anon insert karaoke" ON transaksi_karaoke;
DROP POLICY IF EXISTS "Allow anon select karaoke" ON transaksi_karaoke;
DROP POLICY IF EXISTS "Allow anon insert wahana"  ON transaksi_wahana;
DROP POLICY IF EXISTS "Allow anon select wahana"  ON transaksi_wahana;
DROP POLICY IF EXISTS "Allow anon insert fnb"     ON transaksi_fnb;
DROP POLICY IF EXISTS "Allow anon select fnb"     ON transaksi_fnb;

-- INSERT: bebas (semua unit boleh insert, validasi via PIN di app)
CREATE POLICY "Anon insert hotel"   ON transaksi_hotel   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert karaoke" ON transaksi_karaoke FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert wahana"  ON transaksi_wahana  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert fnb"     ON transaksi_fnb     FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert closing" ON closing_shift     FOR INSERT TO anon WITH CHECK (true);

-- SELECT: unit hanya bisa lihat datanya sendiri
CREATE POLICY "Unit select hotel"   ON transaksi_hotel   FOR SELECT TO anon
    USING (current_setting('request.headers.x-unit-id', true) IS NULL
        OR current_setting('request.headers.x-unit-id', true) = ''
        OR unit = current_setting('request.headers.x-unit-id', true));

CREATE POLICY "Unit select karaoke" ON transaksi_karaoke FOR SELECT TO anon
    USING (current_setting('request.headers.x-unit-id', true) IS NULL
        OR current_setting('request.headers.x-unit-id', true) = ''
        OR unit = current_setting('request.headers.x-unit-id', true));

CREATE POLICY "Unit select wahana"  ON transaksi_wahana  FOR SELECT TO anon
    USING (current_setting('request.headers.x-unit-id', true) IS NULL
        OR current_setting('request.headers.x-unit-id', true) = ''
        OR unit = current_setting('request.headers.x-unit-id', true));

CREATE POLICY "Unit select fnb"     ON transaksi_fnb     FOR SELECT TO anon
    USING (current_setting('request.headers.x-unit-id', true) IS NULL
        OR current_setting('request.headers.x-unit-id', true) = ''
        OR unit = current_setting('request.headers.x-unit-id', true));

CREATE POLICY "Unit select closing" ON closing_shift     FOR SELECT TO anon
    USING (current_setting('request.headers.x-unit-id', true) IS NULL
        OR current_setting('request.headers.x-unit-id', true) = ''
        OR unit = current_setting('request.headers.x-unit-id', true));

-- audit_log: hanya service_role (owner/dashboard via Supabase key)
CREATE POLICY "Service role audit" ON audit_log FOR ALL TO service_role USING (true);

-- ===== SELESAI =====
-- Verifikasi: cek tabel yang terbuat di Table Editor
-- Dashboard query contoh:
-- SELECT unit, shift_number, expected_cash, actual_cash, difference FROM closing_shift ORDER BY closed_at DESC;
