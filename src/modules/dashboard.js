import { getItems, getDistributions, getEmployees } from '../services.js';
import { formatNumber, showToast } from '../utils/helpers.js';
import { $, createElement, delegate } from '../utils/dom.js';
import { navigateTo } from '../components.js';

export function renderDashboard(container) {
    const items = getItems();
    const distributions = getDistributions();
    const employees = getEmployees();
    
    // Calculate stats
    const totalItems = items.length;
    const lowStock = items.filter(i => i.stok <= i.minStok && i.stok > 0).length;
    const outOfStock = items.filter(i => i.stok === 0).length;
    
    // Most requested item
    const itemUsage = {};
    distributions.forEach(d => {
        if (d.items) {
            d.items.forEach(item => {
                itemUsage[item.itemId] = (itemUsage[item.itemId] || 0) + item.jumlah;
            });
        }
    });
    let mostUsedItem = null;
    let maxUsage = 0;
    for (const [id, usage] of Object.entries(itemUsage)) {
        if (usage > maxUsage) {
            maxUsage = usage;
            const item = items.find(i => i.id === id);
            if (item) mostUsedItem = item;
        }
    }
    
    // Today's distributions
    const today = new Date().toISOString().split('T')[0];
    const todayDistributions = distributions.filter(d => d.tanggal === today);
    const todayTotal = todayDistributions.reduce((sum, d) => {
        return sum + (d.items?.reduce((s, i) => s + i.jumlah, 0) || 0);
    }, 0);
    
    // Stock summary by category
    const categories = ['Obat', 'Vitamin', 'P3K', 'APD'];
    const categoryStats = categories.map(cat => ({
        name: cat,
        total: items.filter(i => i.kategori === cat).reduce((sum, i) => sum + i.stok, 0),
        count: items.filter(i => i.kategori === cat).length
    }));
    
    const html = `
        <div class="hero-card mb-4">
            <div>
                <div class="hero-label">Total Stok</div>
                <div class="hero-value">${formatNumber(items.reduce((s, i) => s + i.stok, 0))}</div>
                <div class="hero-label mt-2">${totalItems} item aktif</div>
            </div>
            <div class="hero-icon">
                <i class="bi bi-building" style="font-size: 3.5rem; color: rgba(255,255,255,0.3);"></i>
            </div>
        </div>
        
        <div class="stats-grid mb-4">
            <div class="stat-mini stat-mini-danger" data-action="monitoring" data-filter="out">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <div class="stat-mini-value">${outOfStock}</div>
                <div class="stat-mini-label">Stok Habis</div>
            </div>
            <div class="stat-mini stat-mini-warning" data-action="monitoring" data-filter="low">
                <i class="bi bi-exclamation-circle-fill"></i>
                <div class="stat-mini-value">${lowStock}</div>
                <div class="stat-mini-label">Stok Menipis</div>
            </div>
            <div class="stat-mini stat-mini-success" data-action="distribution">
                <i class="bi bi-gift-fill"></i>
                <div class="stat-mini-value">${todayTotal}</div>
                <div class="stat-mini-label">Distribusi Hari Ini</div>
            </div>
            <div class="stat-mini stat-mini-info" data-action="employees">
                <i class="bi bi-people-fill"></i>
                <div class="stat-mini-value">${employees.length}</div>
                <div class="stat-mini-label">Karyawan</div>
            </div>
        </div>
        
        <div class="section-title">
            <i class="bi bi-star-fill text-accent"></i>
            <span>Item Paling Sering Keluar</span>
        </div>
        ${mostUsedItem ? `
            <div class="card-item clickable" data-action="items" data-id="${mostUsedItem.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${escapeHtml(mostUsedItem.nama)}</div>
                        <small class="text-muted">${mostUsedItem.kategori} • ${formatNumber(maxUsage)} kali diambil</small>
                    </div>
                    <i class="bi bi-chevron-right text-muted"></i>
                </div>
            </div>
        ` : `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>Belum ada data distribusi</p>
            </div>
        `}
        
        <div class="section-title mt-4">
            <i class="bi bi-pie-chart-fill"></i>
            <span>Ringkasan Stok per Kategori</span>
        </div>
        <div class="row g-2">
            ${categoryStats.map(cat => `
                <div class="col-6">
                    <div class="card-stat text-center clickable" data-action="monitoring" data-category="${cat.name}">
                        <div class="stat-label">${cat.name}</div>
                        <div class="stat-value fs-3">${formatNumber(cat.total)}</div>
                        <small class="text-muted">${cat.count} item</small>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="section-title mt-4">
            <i class="bi bi-lightning-charge-fill"></i>
            <span>Aksi Cepat</span>
        </div>
        <div class="quick-actions-grid">
            <div class="btn-quick-action" data-action="stockOpname">
                <i class="bi bi-clipboard-check fs-4"></i>
                <span>Opname Stok</span>
            </div>
            <div class="btn-quick-action" data-action="distribution">
                <i class="bi bi-gift fs-4"></i>
                <span>Distribusi Item</span>
            </div>
            <div class="btn-quick-action" data-action="items">
                <i class="bi bi-plus-circle fs-4"></i>
                <span>Tambah Item</span>
            </div>
            <div class="btn-quick-action" data-action="employees">
                <i class="bi bi-person-plus fs-4"></i>
                <span>Tambah Karyawan</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Bind click events
    delegate(container, '[data-action]', 'click', (e, el) => {
        const action = el.dataset.action;
        const category = el.dataset.category;
        const filter = el.dataset.filter;
        const id = el.dataset.id;
        
        if (action === 'monitoring') {
            import('../components.js').then(({ navigateTo }) => {
                let url = 'monitoring';
                if (category) url += `?category=${encodeURIComponent(category)}`;
                if (filter === 'low') url += `?filter=low`;
                if (filter === 'out') url += `?filter=out`;
                navigateTo(url);
            });
        } else if (action === 'stockOpname') {
            import('../components.js').then(({ navigateTo }) => navigateTo('stockOpname'));
        } else if (action === 'distribution') {
            import('../components.js').then(({ navigateTo }) => navigateTo('distribution'));
        } else if (action === 'items') {
            import('../components.js').then(({ navigateTo, showItemModal }) => {
                if (id) {
                    navigateTo('items');
                    setTimeout(() => showItemModal(id), 100);
                } else {
                    showItemModal();
                }
            });
        } else if (action === 'employees') {
            import('../components.js').then(({ navigateTo, showEmployeeModal }) => {
                navigateTo('employees');
                setTimeout(() => showEmployeeModal(), 100);
            });
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}