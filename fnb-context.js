// ============================================================
// fnb-context.js — Konteks F&B (Walk-in vs Tamu Kamar/Ruangan)
// Pancoran Group Kasir System
// ============================================================

const FnbContext = {

    // Toggle tampilan field linked (kamar/ruangan)
    toggleUI() {
        const isWalkIn = document.getElementById('fnbWalkIn')?.checked;
        const linkedFields = document.getElementById('fnbLinkedFields');
        const label = document.getElementById('fnbContextLabel');
        if (linkedFields) linkedFields.style.display = isWalkIn ? 'none' : 'flex';
        if (label) label.textContent = isWalkIn ? '🚶 Walk-in' : '🔗 Terhubung Kamar/Ruangan';
    },

    // Filter menu berdasarkan unit ID
    filterMenuByUnit(unitId) {
        return CONFIG.menu_fnb.filter(item =>
            item.unit.includes('all') || item.unit.includes(unitId)
        );
    },

    // Build payload context F&B
    getPayload(sourceContext) {
        const isWalkIn = document.getElementById('fnbWalkIn')?.checked ?? true;
        return {
            is_walk_in:     isWalkIn,
            room_number:    isWalkIn ? null : (document.getElementById('fnbRoom')?.value || null),
            guest_name:     isWalkIn ? null : (document.getElementById('fnbGuest')?.value || null),
            source_context: sourceContext || 'standalone',
        };
    },
};
