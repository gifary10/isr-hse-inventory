import { getItems } from '../services.js';
import { formatNumber } from '../utils/helpers.js';
import { $, delegate } from '../utils/dom.js';
import { showItemModal } from '../components.js';

export function renderMonitoring(container) {
    let items = getItems();
    let currentCategory = 'all';
    let currentFilter = 'all';
    
    function getFilterParam() {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        currentCategory = params.get('category') || 'all';
        currentFilter = params.get('filter') || 'all';
    }
    
    getFilterParam();
    
    function renderList() {
        let filtered = [...items];
        
        if (currentCategory !== 'all') {
            filtered = filtered.filter(i => i.kategori === currentCategory);
        }
        
        if (currentFilter === 'low') {
            filtered = filtered.filter(i => i.stok <= i.minStok && i.stok > 0);
        } else if (currentFilter === 'out') {
            filtered = filtered.filter(i => i.stok === 0);
        }
        
        if (filtered.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-box-seam"></i>
                    <p>Tidak ada item yang ditemukan</p>
                </div>
            `;
        }
        
        return filtered.map(item => {
            const percentage = Math.min(100, (item.stok / item.minStok) * 100);
            let statusClass = '';
            let statusText = '';
            let statusIcon = '';
            
            if (item.stok === 0) {
                statusClass = 'danger';
                statusText = 'Stok Habis';
                statusIcon = 'bi-exclamation-circle-fill';
            } else if (item.stok <= item.minStok) {
                statusClass = 'warning';
                statusText = 'Stok Menipis';
                statusIcon = 'bi-exclamation-triangle-fill';
            } else {
                statusClass = 'success';
                statusText = 'Stok Normal';
                statusIcon = 'bi-check-circle-fill';
            }
            
            return `
                <div class="card-item clickable" data-id="${item.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="badge-status badge-${statusClass}">
                                    <i class="bi ${statusIcon}"></i>
                                    ${statusText}
                                </span>
                                <span class="badge bg-light">${escapeHtml(item.kategori)}</span>
                            </div>
                            <div class="fw-bold">${escapeHtml(item.nama)}</div>
                            <div class="mt-2">
                                <div class="d-flex justify-content-between text-small">
                                    <span>Stok: <strong class="${item.stok <= item.minStok ? 'text-danger' : 'text-success'}">${formatNumber(item.stok)} ${escapeHtml(item.satuan)}</strong></span>
                                    <span>Min: ${formatNumber(item.minStok)} ${escapeHtml(item.satuan)}</span>
                                </div>
                                <div class="progress-track mt-1">
                                    <div class="progress-fill bg-${statusClass}" style="width: ${percentage}%;"></div>
                                </div>
                            </div>
                            ${item.lokasi ? `<div class="text-small text-muted mt-2"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(item.lokasi)}</div>` : ''}
                        </div>
                        <div class="ms-2">
                            <i class="bi bi-chevron-right text-muted"></i>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderFilters() {
        const categories = ['all', 'Obat', 'Vitamin', 'P3K', 'APD'];
        const filters = [
            { value: 'all', label: 'Semua', icon: 'bi-grid-3x3-gap-fill' },
            { value: 'low', label: 'Menipis', icon: 'bi-exclamation-triangle-fill' },
            { value: 'out', label: 'Habis', icon: 'bi-x-circle-fill' }
        ];
        
        return `
            <div class="mb-3">
                <div class="form-label mb-2">Kategori</div>
                <div class="category-tabs">
                    ${categories.map(cat => `
                        <div class="category-tab ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
                            <i class="bi ${cat === 'all' ? 'bi-grid-3x3-gap-fill' : getCategoryIcon(cat)}"></i>
                            ${cat === 'all' ? 'Semua' : cat}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="mb-4">
                <div class="form-label mb-2">Filter Stok</div>
                <div class="d-flex gap-2">
                    ${filters.map(f => `
                        <button class="btn btn-sm ${currentFilter === f.value ? 'btn-primary' : 'btn-outline-secondary'} flex-fill filter-btn" data-filter="${f.value}">
                            <i class="bi ${f.icon}"></i> ${f.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    function render() {
        const html = `
            ${renderFilters()}
            <div id="itemsList">
                ${renderList()}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Bind category events
        delegate(container, '.category-tab', 'click', (e, el) => {
            currentCategory = el.dataset.category;
            render();
        });
        
        // Bind filter events
        delegate(container, '.filter-btn', 'click', (e, el) => {
            currentFilter = el.dataset.filter;
            render();
        });
        
        // Bind item click
        delegate(container, '.card-item', 'click', (e, el) => {
            const id = el.dataset.id;
            if (id) {
                showItemModal(id);
            }
        });
    }
    
    render();
}

function getCategoryIcon(category) {
    const icons = {
        'Obat': 'bi-capsule',
        'Vitamin': 'bi-capsule-pill',
        'P3K': 'bi-suitcase2',
        'APD': 'bi-shield-shaded'
    };
    return icons[category] || 'bi-box';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}