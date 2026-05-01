// ============================================================
// config.js — Konfigurasi Terpusat Sistem Kasir Pancoran Group
// Edit file ini untuk mengubah nama unit, harga, PIN, atau konfigurasi Supabase
// ============================================================

// ===== HELPER: Generate Kamar/Ruangan =====
function _kamar(n) {
    return [
        { id: `h${n}-101`, nomor: '101', tipe: 'Standard', harga: 250000 },
        { id: `h${n}-102`, nomor: '102', tipe: 'Standard', harga: 250000 },
        { id: `h${n}-103`, nomor: '103', tipe: 'Standard', harga: 250000 },
        { id: `h${n}-104`, nomor: '104', tipe: 'Standard', harga: 250000 },
        { id: `h${n}-105`, nomor: '105', tipe: 'Standard', harga: 250000 },
        { id: `h${n}-106`, nomor: '106', tipe: 'Deluxe',   harga: 350000 },
        { id: `h${n}-107`, nomor: '107', tipe: 'Deluxe',   harga: 350000 },
        { id: `h${n}-108`, nomor: '108', tipe: 'Deluxe',   harga: 350000 },
        { id: `h${n}-109`, nomor: '109', tipe: 'Suite',    harga: 500000 },
        { id: `h${n}-110`, nomor: '110', tipe: 'Suite',    harga: 500000 },
    ];
}

function _ruangan(n) {
    const r = [
        { id: `k${n}-V01`, nomor: 'V01', tipe: 'VIP',     harga_per_jam: 150000 },
        { id: `k${n}-V02`, nomor: 'V02', tipe: 'VIP',     harga_per_jam: 150000 },
    ];
    for (let i = 1; i <= 8; i++) {
        r.push({ id: `k${n}-R0${i}`, nomor: `R0${i}`, tipe: 'Regular', harga_per_jam: 75000 });
    }
    return r;
}

// ===== PIN HASHING =====
// PIN disimpan sebagai SHA-256 hash. Untuk generate hash PIN baru:
// Buka browser → Console → ketik: AuthUtils.hashPin('PIN_ANDA').then(h=>console.log(h))
// Lalu copy hasilnya ke sini.
//
// ⚠️  PENTING: Hash di bawah harus di-generate ulang menggunakan instruksi di atas!
//     Setelah app pertama kali dibuka, buka Console dan jalankan:
//     AuthUtils.hashPin('110001').then(h=>console.log('hotel-1:',h))
//     Lakukan untuk setiap PIN, lalu update nilai di bawah.
//
// Default PIN mapping:
//   hotel-1 (Srono Indah)          : 110001
//   hotel-2 (Pancoran)             : 110002
//   hotel-3 (Royal Inn)            : 110003
//   hotel-4 (Gumukmas)             : 110004
//   hotel-5 (Besuki)               : 110005
//   karaoke-1 (Ashika Pancoran)    : 220001
//   karaoke-2 (Grand Royal)        : 220002
//   karaoke-3 (Ashika Gumukmas)    : 220003
//   karaoke-4 (Ashika Banyuglugur) : 220004
//   wahana-1 (Pancoran Waterpark)  : 330001
//   wahana-2 (Banyuwangi Nature)   : 330002
//   master (Dashboard Owner)       : 999999
//
// Untuk generate SEMUA hash sekaligus, buka Console di browser dan jalankan:
// ['110001','110002','110003','110004','110005','220001','220002','220003','220004','330001','330002','999999']
//   .forEach(p => AuthUtils.hashPin(p).then(h => console.log(p + ':', h)))

const CONFIG = {

    // ===== SUPABASE =====
    supabase: {
        url: 'https://cwgbiutipxhduuglzjxy.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Z2JpdXRpcHhoZHV1Z2x6anh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTEyNDUsImV4cCI6MjA5Mjg4NzI0NX0.8-cGSTZeeZ2d9kOklAdweMuTN2Zxq8t_uh_L5yrXfoU',
    },

    // ===== TABEL DATABASE =====
    tables: {
        hotel:   'transaksi_hotel',
        karaoke: 'transaksi_karaoke',
        wahana:  'transaksi_wahana',
        fnb:     'transaksi_fnb',
        closing: 'closing_shift',
        audit:   'audit_log',
    },

    // ===== SHIFT =====
    // Shift 1: 07:00 - 19:00 (Pagi)
    // Shift 2: 19:00 - 07:00 (Malam)
    shifts: [
        { number: 1, label: 'Pagi',  startHour: 7,  endHour: 19 },
        { number: 2, label: 'Malam', startHour: 19, endHour: 7  },
    ],

    // ===== KARAOKE SETTING =====
    karaoke_fnb_threshold: 200000, // Rp 200.000 → Free Room

    // ===== PINS PER UNIT (SHA-256 Hash dari PIN 6 digit) =====
    // Hash di bawah adalah SHA-256 dari PIN masing-masing unit.
    // Untuk mengubah PIN: AuthUtils.hashPin('PINNBARU').then(h => console.log(h))
    pins: {
        'hotel-1':   'f4972d45b42830d180360f2a2b5e921e5f67aa18ad09e94dd1cd0c041fed1329', // 110001
        'hotel-2':   '9e2adb8e95b6d4f0d645ad02c8cbd935ec7701ec5da22557ec5411c46e9c7f4a', // 110002
        'hotel-3':   'ddd95eb2b5667ea656f39b8794a65feba591c82c4b80d454992a9145dbb2ad92', // 110003
        'hotel-4':   '6f33bfaa9350543354c1b74ecc16c89e9471f0177d4e2f870d41ac2b3f1fc6a2', // 110004
        'hotel-5':   '7dcce47519b8fe22be7288cd2ea5760ef009b9daf97e1ceb4410123159177a49', // 110005
        'karaoke-1': '6ba1caf444cd7382bed420aa65c0f8465361eabcb876c724afb8f2769d7cbc81', // 220001
        'karaoke-2': '09afd909ea2eee298aa77b1ac67c42018c6bacbd9e7e988231aa829c50ba3252', // 220002
        'karaoke-3': 'eb28741ff2bd642489e119df79220fa013b5096208772015d409eb6359adbd9f', // 220003
        'karaoke-4': '425e54af31a81b4b8d31f537ce81d6777734b2b8286c64d79deab822b3120220', // 220004
        'wahana-1':  'c88d6a670d4c20772ca893855682afee6572a14e06d4190b802ffdc9021615d7', // 330001
        'wahana-2':  'e795cc8979c23fbe49e3582edc43177ffb3e97c09a0b80970bb0d38e0c158b3a', // 330002
        'master':    '937377f056160fc4b15e0b770c67136a5f03c15205b4d3bf918268fefa2c6d0a', // 999999
    },

    // ===== HOTEL =====
    hotels: [
        { id: 'hotel-1', nama: 'Srono Indah',  shortName: 'Srono',   kamar: _kamar(1) },
        { id: 'hotel-2', nama: 'Pancoran',      shortName: 'Pancoran', kamar: _kamar(2) },
        { id: 'hotel-3', nama: 'Royal Inn',     shortName: 'Royal',   kamar: _kamar(3) },
        { id: 'hotel-4', nama: 'Gumukmas',      shortName: 'Gumukmas', kamar: _kamar(4) },
        { id: 'hotel-5', nama: 'Besuki',        shortName: 'Besuki',  kamar: _kamar(5) },
    ],

    // ===== KARAOKE =====
    karaokes: [
        { id: 'karaoke-1', nama: 'Ashika Pancoran',    shortName: 'Ashika Pancoran', ruangan: _ruangan(1) },
        { id: 'karaoke-2', nama: 'Grand Royal',         shortName: 'Grand Royal',    ruangan: _ruangan(2) },
        { id: 'karaoke-3', nama: 'Ashika Gumukmas',    shortName: 'Ashika Gumukmas', ruangan: _ruangan(3) },
        { id: 'karaoke-4', nama: 'Ashika Banyuglugur', shortName: 'Ashika Banyuglugur', ruangan: _ruangan(4) },
    ],

    // ===== WAHANA =====
    wahanas: [
        {
            id: 'wahana-1', nama: 'Pancoran Waterpark',
            tiket: [{ tipe: 'Dewasa', harga: 50000 }, { tipe: 'Anak-anak', harga: 30000 }]
        },
        {
            id: 'wahana-2', nama: 'Banyuwangi Nature Adventure',
            tiket: [{ tipe: 'Dewasa', harga: 40000 }, { tipe: 'Anak-anak', harga: 25000 }]
        },
    ],

    // ===== MENU F&B =====
    menu_fnb: [
        // ── MOCKTAIL ──
        { id: 'm01', nama: 'Red Squash',       harga: 25000, kategori: 'Mocktail', unit: ['all'] },
        { id: 'm02', nama: 'Rainbow',           harga: 25000, kategori: 'Mocktail', unit: ['all'] },
        { id: 'm03', nama: 'Sunrise',           harga: 25000, kategori: 'Mocktail', unit: ['all'] },
        { id: 'm04', nama: 'Blue Ocean',        harga: 25000, kategori: 'Mocktail', unit: ['all'] },
        { id: 'm05', nama: 'Green Squash',      harga: 25000, kategori: 'Mocktail', unit: ['all'] },

        // ── JUICE ──
        { id: 'm06', nama: 'Jus Wortel',        harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm07', nama: 'Jus Semangka',      harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm08', nama: 'Jus Melon',         harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm09', nama: 'Jus Mangga',        harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm10', nama: 'Jus Nanas',         harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm11', nama: 'Jus Alpukat',       harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm12', nama: 'Jus Jeruk',         harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm13', nama: 'Jus Apel',          harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm14', nama: 'Jus Jambu',         harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm15', nama: 'Jus Tomat',         harga: 25000, kategori: 'Juice', unit: ['all'] },
        { id: 'm16', nama: 'Jus Sirsak',        harga: 25000, kategori: 'Juice', unit: ['all'] },

        // ── ASAM / PEDAS MANIS ──
        { id: 'm17', nama: 'Gurame Asam/Pedas Manis',     harga: 65000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm18', nama: 'Ikan Laut Asam/Pedas Manis',  harga: 75000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm19', nama: 'Udang Saus Tiram',             harga: 40000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm20', nama: 'Udang Saus Inggris',           harga: 40000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm21', nama: 'Udang Asam/Pedas',             harga: 40000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm22', nama: 'Ayam Rica-Rica',               harga: 35000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm23', nama: 'Ayam Saus Inggris',            harga: 40000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm24', nama: 'Cumi Asam/Manis',              harga: 40000, kategori: 'Masakan', unit: ['all'] },
        { id: 'm25', nama: 'Koloke',                       harga: 35000, kategori: 'Masakan', unit: ['all'] },

        // ── MENU MIE ──
        { id: 'm26', nama: 'Bakmi Goreng/Kuah',       harga: 35000, kategori: 'Mie', unit: ['all'] },
        { id: 'm27', nama: 'Kwetiauw Goreng/Kuah',    harga: 35000, kategori: 'Mie', unit: ['all'] },
        { id: 'm28', nama: 'Bihun Goreng/Kuah',       harga: 40000, kategori: 'Mie', unit: ['all'] },

        // ── MENU BARBEQUE ──
        { id: 'm29', nama: 'Steak',              harga: 85000, kategori: 'Barbeque', unit: ['all'] },
        { id: 'm30', nama: 'Ikan Laut Bakar',    harga: 75000, kategori: 'Barbeque', unit: ['all'] },
        { id: 'm31', nama: 'Gurame Bakar',       harga: 65000, kategori: 'Barbeque', unit: ['all'] },
        { id: 'm32', nama: 'Ayam Bakar',         harga: 40000, kategori: 'Barbeque', unit: ['all'] },
        { id: 'm33', nama: 'Cumi Bakar',         harga: 40000, kategori: 'Barbeque', unit: ['all'] },
        { id: 'm34', nama: 'Lele Bakar',         harga: 25000, kategori: 'Barbeque', unit: ['all'] },

        // ── MENU TAMBAHAN ──
        { id: 'm35', nama: 'Nasi Putih',         harga: 10000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm36', nama: 'Telur Mata Sapi',    harga: 10000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm37', nama: 'Telur Gulung',       harga: 30000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm38', nama: 'Kentucky Sayap',     harga: 25000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm39', nama: 'Kentucky Dada',      harga: 30000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm40', nama: 'Kentucky Paha',      harga: 30000, kategori: 'Tambahan', unit: ['all'] },
        { id: 'm41', nama: 'Tahu Penyet',        harga: 20000, kategori: 'Tambahan', unit: ['all'] },
    ],

    // ===== METODE PEMBAYARAN =====
    metode_bayar: ['Cash', 'Transfer', 'QRIS'],
};
