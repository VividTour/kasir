-- ============================================================
-- MIGRATION FIX v2 — Tambah semua kolom yang kurang
-- Jalankan di Supabase Dashboard → SQL Editor → New Query
-- AMAN dijalankan berulang kali (IF NOT EXISTS)
-- ============================================================

-- ===== TRANSAKSI HOTEL (semua kolom yang dikirim kasir) =====
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS queue_id TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS aksi TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS nomor_kamar TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS tipe_kamar TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS nama_tamu TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS jumlah_malam INTEGER;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS nominal BIGINT DEFAULT 0;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS nominal_fnb BIGINT DEFAULT 0;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS metode_bayar TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS jam_checkin TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_hotel ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ===== TRANSAKSI KARAOKE =====
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS queue_id TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS aksi TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS ruangan TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS tipe TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS nama_tamu TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS jam_mulai TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS durasi_menit INTEGER;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS nominal_sewa BIGINT DEFAULT 0;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS nominal_fnb BIGINT DEFAULT 0;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS total BIGINT DEFAULT 0;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS metode_bayar TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS fnb_cumulative BIGINT DEFAULT 0;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS free_room_activated BOOLEAN DEFAULT false;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_karaoke ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ===== TRANSAKSI WAHANA =====
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS queue_id TEXT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS total BIGINT DEFAULT 0;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS metode_bayar TEXT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_wahana ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ===== TRANSAKSI FNB =====
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS queue_id TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS modul TEXT DEFAULT 'F&B';
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS total BIGINT DEFAULT 0;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS metode_bayar TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT true;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS source_context TEXT DEFAULT 'standalone';
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS shift_number INT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;
ALTER TABLE transaksi_fnb ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ===== TABEL CLOSING SHIFT (buat jika belum ada) =====
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

-- ===== TABEL AUDIT LOG (buat jika belum ada) =====
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changed_by_pin TEXT,
    changed_at TIMESTAMPTZ DEFAULT now(),
    new_values JSONB
);

-- ===== RLS: AKTIFKAN DAN BUAT POLICY =====
ALTER TABLE transaksi_hotel   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_karaoke ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_wahana  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_fnb     ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_shift     ENABLE ROW LEVEL SECURITY;

-- Hapus semua policy lama (aman, tidak error jika belum ada)
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Anon insert hotel"   ON transaksi_hotel';
  EXECUTE 'DROP POLICY IF EXISTS "Anon insert karaoke" ON transaksi_karaoke';
  EXECUTE 'DROP POLICY IF EXISTS "Anon insert wahana"  ON transaksi_wahana';
  EXECUTE 'DROP POLICY IF EXISTS "Anon insert fnb"     ON transaksi_fnb';
  EXECUTE 'DROP POLICY IF EXISTS "Anon insert closing" ON closing_shift';
  EXECUTE 'DROP POLICY IF EXISTS "Anon select hotel"   ON transaksi_hotel';
  EXECUTE 'DROP POLICY IF EXISTS "Anon select karaoke" ON transaksi_karaoke';
  EXECUTE 'DROP POLICY IF EXISTS "Anon select wahana"  ON transaksi_wahana';
  EXECUTE 'DROP POLICY IF EXISTS "Anon select fnb"     ON transaksi_fnb';
  EXECUTE 'DROP POLICY IF EXISTS "Anon select closing" ON closing_shift';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert hotel"   ON transaksi_hotel';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert karaoke" ON transaksi_karaoke';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert wahana"  ON transaksi_wahana';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert fnb"     ON transaksi_fnb';
  EXECUTE 'DROP POLICY IF EXISTS "Unit select hotel"   ON transaksi_hotel';
  EXECUTE 'DROP POLICY IF EXISTS "Unit select karaoke" ON transaksi_karaoke';
  EXECUTE 'DROP POLICY IF EXISTS "Unit select wahana"  ON transaksi_wahana';
  EXECUTE 'DROP POLICY IF EXISTS "Unit select fnb"     ON transaksi_fnb';
  EXECUTE 'DROP POLICY IF EXISTS "Unit select closing" ON closing_shift';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Buat policy baru
CREATE POLICY "Anon insert hotel"   ON transaksi_hotel   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert karaoke" ON transaksi_karaoke FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert wahana"  ON transaksi_wahana  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert fnb"     ON transaksi_fnb     FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert closing" ON closing_shift     FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon select hotel"   ON transaksi_hotel   FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select karaoke" ON transaksi_karaoke FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select wahana"  ON transaksi_wahana  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select fnb"     ON transaksi_fnb     FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select closing" ON closing_shift     FOR SELECT TO anon USING (true);

-- ===== VERIFIKASI AKHIR =====
-- Jalankan ini setelah migration selesai untuk cek semua kolom sudah ada:
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('transaksi_hotel','transaksi_karaoke','transaksi_wahana','transaksi_fnb','closing_shift')
  AND column_name IN ('shift_number','staff_pin_hash','device_fingerprint','jam_checkin','jam_mulai','queue_id','nominal_fnb','fnb_cumulative')
ORDER BY table_name, column_name;
-- Harus muncul semua kolom di atas untuk tiap tabel yang relevan
