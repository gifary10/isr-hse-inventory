import { apiService } from './services.js';
import { $, renderContent, showToast, formatNumber, formatDate } from './dom.js';
import { CONFIG } from './config.js';
import { escapeHtml, generateId } from './helpers.js';

let currentItems = [];
let currentCategory = 'all';
let searchQuery = '';

export async function renderItems() {
    renderContent(`
        <div class="items-container">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="section-title mb-0">
                    <i class="bi bi-box-seam"></i> Master Item
                </div>
                <button class="btn btn-primary btn-sm" id="addItemBtn">
                    <i class="bi bi-plus-lg"></i> Tambah
                </button>
            </div>
            
            <div class="category-tabs mb-3">
                <div class="category-tab ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
                    <i class="bi bi-grid"></i>
                    <span>Semua</span>
                </div>
                ${CONFIG.CATEGORIES.map(cat => `
                    <div class="category-tab ${currentCategory === cat.id.toString() ? 'active' : ''}" data-category="${cat.id}">
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
    attachItemsEvents();
}

async function loadItems() {
    try {
        const allItems = await apiService.getItems();
        currentItems = [...allItems];
        
        if (currentCategory !== 'all') {
            currentItems = currentItems.filter(item => item.category_id === parseInt(currentCategory));
        }
        
        if (searchQuery) {
            currentItems = currentItems.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        renderItemsList();
    } catch (error) {
        console.error('Error loading items:', error);
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
                <p>Belum ada item dalam kategori ini</p>
                <button class="btn btn-primary btn-sm mt-2" id="emptyAddBtn">
                    <i class="bi bi-plus-lg"></i> Tambah Item Baru
                </button>
            </div>
        `;
        
        const emptyBtn = $('#emptyAddBtn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', () => openItemModal());
        }
        return;
    }
    
    container.innerHTML = currentItems.map(item => {
        const stockStatus = getStockStatusText(item.current_stock, item.min_stock);
        const categoryIcon = CONFIG.CATEGORIES.find(c => c.id === item.category_id)?.icon || 'bi-box';
        
        return `
            <div class="card-item" data-item-id="${item.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <i class="bi ${categoryIcon} text-accent"></i>
                            <h6 class="mb-0">${escapeHtml(item.name)}</h6>
                            <span class="badge-category badge-cat-${item.category_id}">
                                <i class="bi ${categoryIcon}"></i> ${item.category}
                            </span>
                        </div>
                        <div class="mt-2">
                            <span class="badge-status ${stockStatus.class}">
                                ${stockStatus.text}
                            </span>
                            <span class="badge bg-light ms-2">
                                <i class="bi bi-box"></i> ${formatNumber(item.current_stock)} ${item.unit}
                            </span>
                            <span class="badge bg-light ms-2">
                                <i class="bi bi-flag"></i> Min: ${formatNumber(item.min_stock)}
                            </span>
                        </div>
                        <div class="text-muted small mt-1">
                            <i class="bi bi-clock"></i> Diperbarui: ${formatDate(item.last_updated, 'date')}
                        </div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item edit-item" href="#" data-item='${JSON.stringify(item)}'>
                                <i class="bi bi-pencil"></i> Edit
                            </a></li>
                            <li><a class="dropdown-item text-danger delete-item" href="#" data-item-id="${item.id}">
                                <i class="bi bi-trash"></i> Hapus
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.edit-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const item = JSON.parse(btn.dataset.item);
            openItemModal(item);
        });
    });
    
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const itemId = btn.dataset.itemId;
            confirmDeleteItem(itemId);
        });
    });
}

function getStockStatusText(current, min) {
    if (current <= 0) return { class: 'badge-danger', text: 'Habis' };
    if (current < min) return { class: 'badge-warning', text: 'Menipis' };
    return { class: 'badge-success', text: 'Aman' };
}

function openItemModal(item = null) {
    const isEdit = !!item;
    const modalHtml = `
        <div class="modal fade" id="itemModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary-dark text-white">
                        <h5 class="modal-title">${isEdit ? 'Edit Item' : 'Tambah Item Baru'}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Nama Item *</label>
                            <input type="text" class="form-control" id="itemName" value="${isEdit ? escapeHtml(item.name) : ''}" placeholder="Contoh: Paracetamol">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Kategori *</label>
                            <select class="form-select" id="itemCategory">
                                ${CONFIG.CATEGORIES.map(cat => `
                                    <option value="${cat.id}" ${isEdit && item.category_id === cat.id ? 'selected' : ''}>
                                        ${cat.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <div class="mb-3">
                                    <label class="form-label">Stok Awal</label>
                                    <input type="number" class="form-control" id="itemStock" value="${isEdit ? item.current_stock : '0'}" min="0">
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="mb-3">
                                    <label class="form-label">Satuan</label>
                                    <select class="form-select" id="itemUnit">
                                        <option value="tablet" ${isEdit && item.unit === 'tablet' ? 'selected' : ''}>Tablet</option>
                                        <option value="pcs" ${isEdit && item.unit === 'pcs' ? 'selected' : ''}>Pcs</option>
                                        <option value="botol" ${isEdit && item.unit === 'botol' ? 'selected' : ''}>Botol</option>
                                        <option value="strip" ${isEdit && item.unit === 'strip' ? 'selected' : ''}>Strip</option>
                                        <option value="pasang" ${isEdit && item.unit === 'pasang' ? 'selected' : ''}>Pasang</option>
                                        <option value="box" ${isEdit && item.unit === 'box' ? 'selected' : ''}>Box</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Stok Minimum</label>
                            <input type="number" class="form-control" id="itemMinStock" value="${isEdit ? item.min_stock : '50'}" min="0">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="saveItemBtn">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = $('#itemModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal($('#itemModal'));
    modal.show();
    
    $('#saveItemBtn').onclick = async () => {
        const name = $('#itemName').value.trim();
        const categoryId = parseInt($('#itemCategory').value);
        const stock = parseInt($('#itemStock').value) || 0;
        const unit = $('#itemUnit').value;
        const minStock = parseInt($('#itemMinStock').value) || 0;
        
        if (!name) {
            showToast('Nama item harus diisi', 'error');
            return;
        }
        
        const category = CONFIG.CATEGORIES.find(c => c.id === categoryId);
        
        const itemData = {
            id: isEdit ? item.id : generateId('item'),
            name: name,
            category_id: categoryId,
            category: category.name,
            current_stock: stock,
            unit: unit,
            min_stock: minStock,
            last_updated: new Date().toISOString()
        };
        
        let result;
        if (isEdit) {
            result = await apiService.updateItem(itemData);
        } else {
            result = await apiService.addItem(itemData);
        }
        
        if (result.success) {
            modal.hide();
            showToast(`Item ${isEdit ? 'diupdate' : 'ditambahkan'} successfully!`, 'success');
            await loadItems();
        }
    };
}

async function confirmDeleteItem(itemId) {
    const confirmHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">Konfirmasi Hapus</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Apakah Anda yakin ingin menghapus item ini?</p>
                        <p class="text-danger small">Tindakan ini tidak dapat dibatalkan!</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Hapus</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = $('#confirmModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', confirmHtml);
    const modal = new bootstrap.Modal($('#confirmModal'));
    modal.show();
    
    $('#confirmDeleteBtn').onclick = async () => {
        const result = await apiService.deleteItem(itemId);
        if (result.success) {
            modal.hide();
            showToast('Item berhasil dihapus!', 'success');
            await loadItems();
        }
    };
}

function attachItemsEvents() {
    const addBtn = $('#addItemBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openItemModal());
    }
    
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentCategory = tab.dataset.category;
            loadItems();
            
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
        });
    });
    
    const searchInput = $('#searchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchQuery = e.target.value;
                loadItems();
            }, 300);
        });
    }
}