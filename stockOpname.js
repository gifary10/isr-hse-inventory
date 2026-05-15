import { apiService } from './services.js';
import { $, renderContent, showToast, formatNumber } from './dom.js';
import { CONFIG } from './config.js';
import { getStockStatus } from './helpers.js';

let currentItems = [];
let currentCategory = 1;
let searchQuery = '';

export async function renderStockOpname(params = {}) {
    currentCategory = params.category || 1;
    searchQuery = '';
    
    renderContent(`
        <div class="stock-opname-container">
            <div class="category-tabs mb-3">
                ${CONFIG.CATEGORIES.map(cat => `
                    <div class="category-tab ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                        <i class="bi ${cat.icon}"></i>
                        <span>${cat.name}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="mb-3">
                <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="searchInput" placeholder="Cari item...">
                </div>
            </div>
            
            <div id="itemsList">
                <div class="text-center py-4">
                    <div class="spinner-border text-accent"></div>
                </div>
            </div>
        </div>
    `);
    
    await loadItems();
    attachOpnameEvents();
}

async function loadItems() {
    try {
        const allItems = await apiService.getItems();
        currentItems = allItems.filter(item => item.category_id === currentCategory);
        
        if (searchQuery) {
            currentItems = currentItems.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        renderItemsList();
    } catch (error) {
        showToast('Gagal memuat data item', 'error');
    }
}

function renderItemsList() {
    const container = $('#itemsList');
    if (!container) return;
    
    if (currentItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h5>Tidak ada item</h5>
                <p>Tidak ditemukan item dalam kategori ini</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="mb-3">
            <div class="alert alert-secondary">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-info-circle"></i> Klik pada item untuk melakukan opname</span>
                    <span class="badge bg-primary">${currentItems.length} item</span>
                </div>
            </div>
        </div>
        ${currentItems.map(item => {
            const stockStatus = getStockStatus(item.current_stock, item.min_stock);
            const categoryIcon = CONFIG.CATEGORIES.find(c => c.id === item.category_id)?.icon || 'bi-box';
            return `
                <div class="card-item clickable" data-item='${JSON.stringify(item)}'>
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi ${categoryIcon} text-accent"></i>
                                <h6 class="mb-0">${escapeHtml(item.name)}</h6>
                            </div>
                            <div class="mt-2">
                                <span class="badge-status ${stockStatus.class === 'success' ? 'badge-success' : stockStatus.class === 'warning' ? 'badge-warning' : 'badge-danger'}">
                                    ${stockStatus.text}
                                </span>
                                <span class="badge bg-light ms-2">
                                    <i class="bi bi-box"></i> ${formatNumber(item.current_stock)} ${item.unit}
                                </span>
                                <span class="badge bg-light ms-2">
                                    <i class="bi bi-flag"></i> Min: ${formatNumber(item.min_stock)}
                                </span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline-primary opname-btn">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('')}
    `;
    
    document.querySelectorAll('.card-item').forEach(card => {
        const itemData = JSON.parse(card.dataset.item);
        const btn = card.querySelector('.opname-btn');
        
        const openModal = () => openOpnameModal(itemData);
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.opname-btn')) {
                openModal();
            }
        });
        
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal();
            });
        }
    });
}

function openOpnameModal(item) {
    const modalHtml = `
        <div class="modal fade" id="opnameModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary-dark text-white">
                        <h5 class="modal-title">Stok Opname: ${escapeHtml(item.name)}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Stok Saat Ini</label>
                            <div class="alert alert-info">
                                <i class="bi bi-box"></i> ${formatNumber(item.current_stock)} ${item.unit}
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Stok Baru *</label>
                            <input type="number" class="form-control" id="newStock" value="${item.current_stock}" min="0">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Catatan (Opsional)</label>
                            <textarea class="form-control" id="opnameNotes" rows="2" placeholder="Contoh: Opname rutin, penambahan stok, dll"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="saveOpnameBtn">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = $('#opnameModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal($('#opnameModal'));
    modal.show();
    
    $('#saveOpnameBtn').onclick = async () => {
        const newStock = parseInt($('#newStock').value);
        const notes = $('#opnameNotes').value;
        
        if (isNaN(newStock) || newStock < 0) {
            showToast('Stok baru harus berupa angka positif', 'error');
            return;
        }
        
        const result = await apiService.saveStockOpname({
            item_id: item.id,
            item_name: item.name,
            category: item.category,
            old_stock: item.current_stock,
            new_stock: newStock,
            notes: notes,
            adjusted_by: 'Admin'
        });
        
        if (result.success) {
            modal.hide();
            await loadItems();
        }
    };
}

function attachOpnameEvents() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentCategory = parseInt(tab.dataset.category);
            searchQuery = '';
            const searchInput = $('#searchInput');
            if (searchInput) searchInput.value = '';
            renderStockOpname({ category: currentCategory });
        });
    });
    
    const searchInput = $('#searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            loadItems();
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}