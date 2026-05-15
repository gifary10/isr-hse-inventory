import { apiService } from './services.js';
import { $, renderContent, formatNumber, showToast } from './dom.js';
import { CONFIG } from './config.js';
import { router } from './router.js';

export async function renderDashboard() {
    renderContent(`
        <div class="dashboard-container">
            <div class="hero-card mb-3">
                <div>
                    <div class="hero-label">Total Stok Saat Ini</div>
                    <div class="hero-value" id="totalStock">0</div>
                    <div class="text-white-50 small mt-1">dari semua kategori</div>
                </div>
                <div class="hero-icon">
                    <i class="bi bi-box-seam fs-1 text-white-50"></i>
                </div>
            </div>
            
            <div class="row g-3 mb-4">
                <div class="col-6">
                    <div class="card-stat">
                        <div class="stat-label">Total Item</div>
                        <div class="stat-value" id="totalItems">0</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card-stat">
                        <div class="stat-label">Stok Menipis</div>
                        <div class="stat-value text-warning" id="lowStock">0</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card-stat">
                        <div class="stat-label">Total Distribusi</div>
                        <div class="stat-value text-accent" id="totalDistributed">0</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card-stat">
                        <div class="stat-label">Kategori Aktif</div>
                        <div class="stat-value text-info" id="activeCategories">0</div>
                    </div>
                </div>
            </div>
            
            <div class="section-title">
                <i class="bi bi-grid"></i> Kategori
            </div>
            <div class="row g-2 mb-4" id="categoriesGrid"></div>
            
            <div class="section-title">
                <i class="bi bi-lightning-charge"></i> Aksi Cepat
            </div>
            <div class="row g-3">
                <div class="col-6">
                    <div class="btn-quick-action" data-action="opname">
                        <i class="bi bi-clipboard-check fs-4"></i>
                        <span>Stok Opname</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="btn-quick-action" data-action="distribution">
                        <i class="bi bi-truck fs-4"></i>
                        <span>Distribusi</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="btn-quick-action" data-action="history">
                        <i class="bi bi-clock-history fs-4"></i>
                        <span>Riwayat</span>
                    </div>
                </div>
                <div class="col-6">
                    <div class="btn-quick-action" data-action="items">
                        <i class="bi bi-box-seam fs-4"></i>
                        <span>Master Item</span>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    await loadDashboardData();
    attachDashboardEvents();
}

async function loadDashboardData() {
    try {
        const stats = await apiService.getDashboardStats();
        
        const totalItemsEl = $('#totalItems');
        const lowStockEl = $('#lowStock');
        const totalStockEl = $('#totalStock');
        const totalDistributedEl = $('#totalDistributed');
        const activeCategoriesEl = $('#activeCategories');
        
        if (totalItemsEl) totalItemsEl.textContent = formatNumber(stats.total_items || 0);
        if (lowStockEl) lowStockEl.textContent = formatNumber(stats.low_stock || 0);
        if (totalStockEl) totalStockEl.textContent = formatNumber(stats.total_stock || 0);
        if (totalDistributedEl) totalDistributedEl.textContent = formatNumber(stats.total_distributed || 0);
        if (activeCategoriesEl) activeCategoriesEl.textContent = stats.categories ? stats.categories.length : 0;
        
        const categoriesGrid = $('#categoriesGrid');
        if (categoriesGrid && stats.categories) {
            categoriesGrid.innerHTML = stats.categories.map(cat => {
                const catConfig = CONFIG.CATEGORIES.find(c => c.id === cat.id);
                return `
                    <div class="col-6">
                        <div class="stat-mini stat-mini-${cat.id === 1 ? 'info' : cat.id === 2 ? 'success' : cat.id === 3 ? 'warning' : 'info'}" data-category="${cat.id}">
                            <i class="bi ${catConfig ? catConfig.icon : 'bi-box'}"></i>
                            <div class="stat-mini-value">${cat.count || 0}</div>
                            <div class="stat-mini-label">${cat.name}</div>
                            ${cat.low_stock > 0 ? `<span class="qa-badge">${cat.low_stock}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Gagal memuat data dashboard', 'error');
    }
}

function attachDashboardEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            if (action === 'opname') {
                router.navigate('opname');
            } else if (action === 'distribution') {
                router.navigate('distribution');
            } else if (action === 'history') {
                router.navigate('history');
            } else if (action === 'items') {
                router.navigate('items');
            }
        });
    });
    
    document.querySelectorAll('[data-category]').forEach(cat => {
        cat.addEventListener('click', () => {
            router.navigate('opname', { category: cat.dataset.category });
        });
    });
}