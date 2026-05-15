import { getItems, saveItem, deleteItem, getCategories } from '../services.js';
import { formatNumber, showToast } from '../utils/helpers.js';
import { $, delegate, createElement } from '../utils/dom.js';
import { showItemModal, showConfirmDialog } from '../components.js';

export function renderItems(container) {
    let items = getItems();
    const categories = getCategories();
    let currentCategory = 'all';
    let searchTerm = '';
    
    function renderList() {
        let filtered = [...items];
        
        if (currentCategory !== 'all') {
            filtered = filtered.filter(i => i.kategori === currentCategory);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(i => i.nama.toLowerCase().includes(term));
        }
        
        if (filtered.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-box-seam"></i>
                    <h5>Tidak ada item</h5>
                    <p>Tekan tombol + untuk menambah item</p>
                </div>
            `;
        }
        
        return filtered.map(item => `
            <div class="card-item clickable" data-id="${item.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge-category badge-cat-${getCategoryIndex(item.kategori) + 1}">
                                <i class="bi ${getCategoryIcon(item.kategori)}"></i> ${item.kategori}
                            </span>
                        </div>
                        <div class="fw-bold">${escapeHtml(item.nama)}</div>
                        <div class="text-small text-muted mt-1">
                            <i class="bi bi-geo-alt-fill"></i> ${escapeHtml(item.lokasi || '-')}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold ${Number(item.stok) <= Number(item.minStok) ? 'text-danger' : 'text-success'}">
                            ${formatNumber(item.stok)} ${escapeHtml(item.satuan)}
                        </div>
                        <small class="text-muted">Min: ${formatNumber(item.minStok)}</small>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary edit-item" data-id="${item.id}">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-item" data-id="${item.id}">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function render() {
        const html = `
            <div class="mb-3">
                <div class="search-box mb-3">
                    <i class="bi bi-search"></i>
                    <input type="text" class="form-control" id="searchItem" placeholder="Cari item...">
                </div>
                <div class="category-tabs" id="categoryTabs">
                    <div class="category-tab ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
                        <i class="bi bi-grid-3x3-gap-fill"></i> Semua
                    </div>
                    ${categories.map(cat => `
                        <div class="category-tab ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
                            <i class="bi ${getCategoryIcon(cat)}"></i> ${cat}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div id="itemsList">
                ${renderList()}
            </div>
        `;
        
        container.innerHTML = html;
        
        const searchInput = $('#searchItem');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                const itemsList = $('#itemsList');
                if (itemsList) itemsList.innerHTML = renderList();
                bindDeleteEvents();
                bindEditEvents();
                bindCardEvents();
            });
        }
        
        delegate(container, '.category-tab', 'click', (e, el) => {
            currentCategory = el.dataset.category;
            render();
        });
        
        bindDeleteEvents();
        bindEditEvents();
        bindCardEvents();
    }
    
    function bindDeleteEvents() {
        delegate(container, '.delete-item', 'click', async (e, el) => {
            e.stopPropagation();
            const id = el.dataset.id;
            const item = items.find(i => i.id === id);
            if (await showConfirmDialog(`Hapus item "${item?.nama}"?`, 'Item akan dihapus permanen')) {
                el.disabled = true;
                el.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                try {
                    await deleteItem(id);
                    items = getItems();
                    render();
                    showToast('Item berhasil dihapus', 'success');
                } catch (err) {
                    showToast('Gagal menghapus: ' + err.message, 'danger');
                    el.disabled = false;
                    el.innerHTML = '<i class="bi bi-trash3"></i>';
                }
            }
        });
    }
    
    function bindEditEvents() {
        delegate(container, '.edit-item', 'click', (e, el) => {
            e.stopPropagation();
            const id = el.dataset.id;
            showItemModal(id);
        });
    }
    
    function bindCardEvents() {
        delegate(container, '.card-item', 'click', (e, el) => {
            const id = el.dataset.id;
            if (id && !e.target.closest('.edit-item') && !e.target.closest('.delete-item')) {
                showItemModal(id);
            }
        });
    }
    
    render();
}

function getCategoryIndex(category) {
    const cats = ['Obat', 'Vitamin', 'P3K', 'APD'];
    return cats.indexOf(category);
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