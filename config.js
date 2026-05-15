// Google Sheets Configuration
export const CONFIG = {
    SPREADSHEET_ID: '1wffykcbrb8oGyGJWX0ZeGZ_Vt4yttgHjvlfzvd-Tg74',
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
    CACHE_TTL: 30 * 1000, // 30 detik cache
    APP_NAME: 'ISR Inventory'
};

// GANTI DENGAN URL WEB APP ANDA SETELAH DEPLOY
export const API_URL = 'https://script.google.com/macros/s/AKfycbysf43sxMLYbAyVg3CShufdTVx8lb0oBZJnGNutAjD3n1EWGeo9Q65l7uTOLJELzLr_Kg/exec';