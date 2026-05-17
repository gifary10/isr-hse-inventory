// Google Sheets Configuration
export const CONFIG = {
    SPREADSHEET_ID: '1m7FF85UULA0nb-9m6q5QB2z_UYkwSzBhpNSUtkR9kdQ',
    SHEET_NAMES: {
        ITEMS: 'Items',
        STOCK_OPNAME: 'StockOpname',
        DISTRIBUTION: 'Distribution',
        EMPLOYEES: 'Employees'
    },
    CATEGORIES: [
        { id: 1, name: 'Obat', icon: 'bi-capsule', color: '#3b82f6' },
        { id: 2, name: 'Vitamin', icon: 'bi-flower1', color: '#10b981' },
        { id: 3, name: 'Isi P3K', icon: 'bi-heart-pulse', color: '#f59e0b' },
        { id: 4, name: 'APD', icon: 'bi-shield-check', color: '#8b5cf6' }
    ],
    // Perpanjang TTL cache frontend (milidetik)
    CACHE_TTL: {
        ITEMS: 5 * 60 * 1000,      // 5 menit
        DASHBOARD: 5 * 60 * 1000,  // 5 menit
        HISTORY: 60 * 1000,        // 1 menit
        EMPLOYEES: 10 * 60 * 1000  // 10 menit
    },
    APP_NAME: 'ISR Inventory'
};

// GANTI DENGAN URL WEB APP ANDA SETELAH DEPLOY
export const API_URL = 'https://script.google.com/macros/s/AKfycbw4W3dnIdbUp9fFCJgsM46gfkW8y_q2Xn46i67u1Q5UL_QGSY37ADXQjT9j3VoWm6O3/exec';