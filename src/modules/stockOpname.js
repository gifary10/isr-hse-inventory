// stockOpname.js
import { getItems, getStockOpnameHistory, addStockOpname, updateItemStock, getCategories } from '../services.js';
import { formatNumber, formatDate, showToast, debounce } from '../utils/helpers.js';
import { $, delegate, createElement } from '../utils/dom.js';

export function renderStockOpname(container) {
    let items = getItems();
    let history = getStockOpnameHistory();
    const categories = getCategories();
    let selectedItemId = '';
    let selectedCategory = 'all';
    let searchTerm = '';
    let filteredItems = [];

    function filterItems() {
        let filtered = [...items];
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(i => i.kategori === selectedCategory);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(i => i.nama.toLowerCase().includes(term));
        }
        filteredItems = filtered;
        return filteredItems;
    }

    function renderItemSelect() {
        filterItems();
        if (filteredItems.length === 0) {
            return `
                <div class="alert alert-secondary text-center">
                    <i class="bi bi-inbox"></i><br>
                    Tidak ada item pada kategori ini
                </div>
            `;
        }
        return `
            <select class="form-select" id="itemSelect">
                <option value="">-- Pilih Item --</option>
                ${filteredItems.map(item => `
                    <option value="${item.id}" ${selectedItemId === item.id ? 'selected' : ''}>
                        ${escapeHtml(item.nama)} - Stok: ${formatNumber(item.stok)} ${item.satuan}
                    </option>
                `).join('')}
            </select>
        `;
    }

    function renderCategoryFilter() {
        return `
            <div class="mb-3">
                <label class="form-label">Filter Kategori</label>
                <div class="category-tabs" id="categoryFilter">
                    <div class="category-tab ${selectedCategory === 'all' ? 'active' : ''}" data-category="all">
                        <i class="bi bi-grid-3x3-gap-fill"></i> Semua
                    </div>
                    ${categories.map(cat => `
                        <div class="category-tab ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
                            <i class="bi ${getCategoryIcon(cat)}"></i> ${cat}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSearchInput() {
        if (selectedCategory === 'all') {
            return `
                <div class="alert alert-info text-center py-2 mb-3">
                    <i class="bi bi-info-circle"></i> Pilih kategori terlebih dahulu untuk mencari item
                </div>
            `;
        }
        return `
            <div class="search-box mb-3">
                <i class="bi bi-search"></i>
                <input type="text" class="form-control" id="searchItem" 
                       placeholder="Cari ${selectedCategory}..." value="${escapeHtml(searchTerm)}">
            </div>
        `;
    }

    function renderHistoryList() {
        if (history.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-clipboard-check"></i>
                    <p>Belum ada histori opname</p>
                </div>
            `;
        }
        return history.slice(0, 10).map(h => {
            const item = items.find(i => i.id === h.itemId);
            return `
                <div class="card-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${escapeHtml(item?.nama || h.itemName || 'Item tidak ditemukan')}</div>
                            <small class="text-muted">${formatDate(h.tanggal)}</small>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold">Stok baru: ${formatNumber(h.stokBaru)}</div>
                            <small class="text-muted">Sebelumnya: ${formatNumber(h.stokLama)}</small>
                        </div>
                    </div>
                    ${h.catatan ? `<div class="mt-2 text-small text-muted">${escapeHtml(h.catatan)}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    function renderForm() {
        const selectedItem = items.find(i => i.id === selectedItemId);
        
        return `
            ${renderCategoryFilter()}
            ${renderSearchInput()}
            
            <div class="mb-3" id="itemSelectContainer">
                <label class="form-label">Pilih Item</label>
                ${renderItemSelect()}
            </div>
            
            ${selectedItem ? `
                <div class="card-item mb-4">
                    <div class="mb-3">
                        <label class="form-label">Stok Saat Ini (Sebelum Opname)</label>
                        <input type="number" class="form-control" id="currentStock" value="${selectedItem.stok}" readonly disabled>
                        <small class="text-muted">${escapeHtml(selectedItem.nama)} - ${escapeHtml(selectedItem.kategori)}</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Stok Hasil Opname *</label>
                        <input type="number" class="form-control" id="newStock" placeholder="Masukkan jumlah stok aktual" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Catatan Penyesuaian</label>
                        <textarea class="form-control" id="opnameNote" rows="2" placeholder="Contoh: Hasil pengecekan fisik gudang..."></textarea>
                    </div>
                    <button class="btn btn-primary w-100" id="saveOpname">
                        <i class="bi bi-save"></i> Simpan Opname
                    </button>
                </div>
            ` : (selectedCategory !== 'all' && filteredItems.length > 0 ? `
                <div class="alert alert-secondary text-center">
                    <i class="bi bi-hand-index-thumb"></i> Silakan pilih item di atas
                </div>
            ` : '')}
            
            <div class="section-title">
                <i class="bi bi-clock-history"></i>
                <span>Histori Opname Terbaru</span>
            </div>
            <div id="historyList">
                ${renderHistoryList()}
            </div>
        `;
    }

    function refresh() {
        items = getItems();
        history = getStockOpnameHistory();
        const formContainer = $('#opnameForm');
        if (formContainer) formContainer.innerHTML = renderForm();
        bindEvents();
    }

    function handleCategoryChange(category) {
        selectedCategory = category;
        searchTerm = '';
        selectedItemId = '';
        refresh();
    }

    function handleSearchInput(value) {
        searchTerm = value;
        filterItems();
        if (selectedItemId && !filteredItems.find(i => i.id === selectedItemId)) {
            selectedItemId = '';
        }
        const itemSelectContainer = $('#itemSelectContainer');
        if (itemSelectContainer) {
            itemSelectContainer.innerHTML = `
                <label class="form-label">Pilih Item</label>
                ${renderItemSelect()}
            `;
            bindItemSelectEvent();
        }
        if (!selectedItemId) {
            const formContainer = $('#opnameForm');
            if (formContainer) {
                formContainer.innerHTML = renderForm();
                bindEvents();
            }
        }
    }

    function bindItemSelectEvent() {
        const itemSelect = $('#itemSelect');
        if (itemSelect) {
            itemSelect.addEventListener('change', (e) => {
                selectedItemId = e.target.value;
                refresh();
            });
        }
    }

    function bindEvents() {
        delegate(container, '#categoryFilter .category-tab', 'click', (e, el) => {
            const category = el.dataset.category;
            handleCategoryChange(category);
        });
        
        const searchInput = $('#searchItem');
        if (searchInput) {
            const debouncedSearch = debounce((e) => {
                handleSearchInput(e.target.value);
            }, 300);
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        bindItemSelectEvent();
        
        const saveBtn = $('#saveOpname');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const newStockInput = $('#newStock');
                const noteInput = $('#opnameNote');
                const selectedItem = items.find(i => i.id === selectedItemId);
                
                if (!selectedItem) { showToast('Pilih item terlebih dahulu', 'warning'); return; }
                
                const newStock = parseInt(newStockInput.value);
                if (isNaN(newStock) || newStock < 0) { showToast('Masukkan jumlah stok yang valid', 'warning'); return; }
                
                const oldStock = selectedItem.stok;
                const note = noteInput.value || `Opname: stok lama ${oldStock} -> stok baru ${newStock}`;
                
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
                
                try {
                    await updateItemStock(selectedItemId, newStock);
                    await addStockOpname({
                        itemId: selectedItemId,
                        stokLama: oldStock,
                        stokBaru: newStock,
                        catatan: note,
                        tanggal: new Date().toISOString().split('T')[0],
                        waktu: new Date().toISOString()
                    });
                    
                    showToast(`Opname ${selectedItem.nama} berhasil: ${oldStock} → ${newStock}`, 'success');
                    selectedItemId = '';
                    refresh();
                } catch (err) {
                    showToast('Gagal menyimpan opname: ' + err.message, 'danger');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="bi bi-save"></i> Simpan Opname';
                }
            });
        }
    }
    
    container.innerHTML = `
        <div id="opnameForm">
            ${renderForm()}
        </div>
    `;
    
    bindEvents();
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