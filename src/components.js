import { getItems, getEmployees, saveItem, saveEmployee, getItem, getEmployee, getCategories } from './services.js';
import { showToast, formatNumber } from './utils/helpers.js';
import { $, createElement, on } from './utils/dom.js';
import router from './router.js';

let currentModal = null;

export function showModal(content, onClose = null) {
    if (currentModal) {
        currentModal.dispose();
    }
    
    const modalContainer = $('#modalContainer');
    const modalHtml = `
        <div class="modal fade" id="appModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = modalHtml;
    const modalElement = $('#appModal');
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        if (onClose) onClose();
        currentModal = null;
    });
    
    modal.show();
    currentModal = modal;
    
    return modal;
}

export function hideModal() {
    if (currentModal) {
        currentModal.hide();
    }
}

export function showConfirmDialog(message, subMessage = '') {
    return new Promise((resolve) => {
        const content = `
            <div class="modal-header">
                <h5 class="modal-title">Konfirmasi</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p class="mb-0">${message}</p>
                ${subMessage ? `<small class="text-muted">${subMessage}</small>` : ''}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-danger" id="confirmYes">Ya, Hapus</button>
            </div>
        `;
        
        const modal = showModal(content);
        const confirmBtn = $('#confirmYes');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
        }
        
        const modalElement = $('#appModal');
        modalElement.addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });
    });
}

export function showItemModal(itemId = null) {
    const items = getItems();
    const categories = getCategories();
    const item = itemId ? items.find(i => i.id === itemId) : null;
    const isEdit = !!item;
    
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">${isEdit ? 'Edit Item' : 'Tambah Item Baru'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="itemForm">
                <div class="mb-3">
                    <label class="form-label">Nama Item *</label>
                    <input type="text" class="form-control" id="itemName" value="${escapeHtml(item?.nama || '')}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Kategori *</label>
                    <select class="form-select" id="itemCategory" required>
                        ${categories.map(cat => `
                            <option value="${cat}" ${item?.kategori === cat ? 'selected' : ''}>${cat}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label">Stok Awal</label>
                        <input type="number" class="form-control" id="itemStock" value="${item?.stok || 0}" min="0">
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label">Min. Stok</label>
                        <input type="number" class="form-control" id="itemMinStock" value="${item?.minStok || 0}" min="0" required>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label">Satuan</label>
                        <input type="text" class="form-control" id="itemUnit" value="${escapeHtml(item?.satuan || '')}" placeholder="tablet, botol, dll">
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label">Lokasi Penyimpanan</label>
                        <input type="text" class="form-control" id="itemLocation" value="${escapeHtml(item?.lokasi || '')}" placeholder="Rak A1">
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-primary" id="saveItemBtn">Simpan</button>
        </div>
    `;
    
    const modal = showModal(content);
    const saveBtn = $('#saveItemBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const nama = $('#itemName')?.value.trim();
            const kategori = $('#itemCategory')?.value;
            const stok = parseInt($('#itemStock')?.value) || 0;
            const minStok = parseInt($('#itemMinStock')?.value) || 0;
            const satuan = $('#itemUnit')?.value.trim() || 'buah';
            const lokasi = $('#itemLocation')?.value.trim() || '';
            
            if (!nama) { showToast('Nama item harus diisi', 'warning'); return; }
            if (!kategori) { showToast('Pilih kategori', 'warning'); return; }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
            
            try {
                await saveItem({ id: itemId || undefined, nama, kategori, stok, minStok, satuan, lokasi });
                showToast(`Item ${isEdit ? 'diupdate' : 'ditambahkan'}`, 'success');
                modal.hide();
                if (router.getCurrentPage() === 'items') {
                    import('./modules/items.js').then(({ renderItems }) => {
                        const container = $('#pageContainer');
                        if (container) renderItems(container);
                    });
                }
            } catch (err) {
                showToast('Gagal menyimpan item: ' + err.message, 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Simpan';
            }
        });
    }
}

export function showEmployeeModal(employeeId = null) {
    const employees = getEmployees();
    const employee = employeeId ? employees.find(e => e.id === employeeId) : null;
    const isEdit = !!employee;
    
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">${isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="employeeForm">
                <div class="mb-3">
                    <label class="form-label">Nama Lengkap *</label>
                    <input type="text" class="form-control" id="empName" value="${escapeHtml(employee?.nama || '')}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Departemen *</label>
                    <input type="text" class="form-control" id="empDepartment" value="${escapeHtml(employee?.departemen || '')}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Jabatan</label>
                    <input type="text" class="form-control" id="empPosition" value="${escapeHtml(employee?.jabatan || '')}">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-primary" id="saveEmployeeBtn">Simpan</button>
        </div>
    `;
    
    const modal = showModal(content);
    const saveBtn = $('#saveEmployeeBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const nama = $('#empName')?.value.trim();
            const departemen = $('#empDepartment')?.value.trim();
            const jabatan = $('#empPosition')?.value.trim() || '';
            
            if (!nama) { showToast('Nama karyawan harus diisi', 'warning'); return; }
            if (!departemen) { showToast('Departemen harus diisi', 'warning'); return; }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
            
            try {
                await saveEmployee({ id: employeeId || undefined, nama, departemen, jabatan });
                showToast(`Karyawan ${isEdit ? 'diupdate' : 'ditambahkan'}`, 'success');
                modal.hide();
                if (router.getCurrentPage() === 'employees') {
                    import('./modules/employees.js').then(({ renderEmployees }) => {
                        const container = $('#pageContainer');
                        if (container) renderEmployees(container);
                    });
                }
            } catch (err) {
                showToast('Gagal menyimpan karyawan: ' + err.message, 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Simpan';
            }
        });
    }
}

export function showStockOpnameModal() {
    const items = getItems();
    
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">Opname Stok Cepat</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="mb-3">
                <label class="form-label">Pilih Item</label>
                <select class="form-select" id="opnameItemSelect">
                    <option value="">-- Pilih Item --</option>
                    ${items.map(item => `
                        <option value="${item.id}">${escapeHtml(item.nama)} - Stok: ${formatNumber(item.stok)} ${item.satuan}</option>
                    `).join('')}
                </select>
            </div>
            <div class="mb-3" id="opnameStockRow" style="display: none;">
                <label class="form-label">Stok Aktual</label>
                <input type="number" class="form-control" id="opnameActualStock" min="0">
            </div>
            <div class="mb-3" id="opnameNoteRow" style="display: none;">
                <label class="form-label">Catatan</label>
                <textarea class="form-control" id="opnameNote" rows="2" placeholder="Hasil pengecekan fisik..."></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-primary" id="saveOpnameBtn" style="display: none;">Simpan Opname</button>
        </div>
    `;
    
    const modal = showModal(content);
    const itemSelect = $('#opnameItemSelect');
    const stockRow = $('#opnameStockRow');
    const noteRow = $('#opnameNoteRow');
    const saveBtn = $('#saveOpnameBtn');
    
    if (itemSelect) {
        itemSelect.addEventListener('change', (e) => {
            const show = !!e.target.value;
            stockRow.style.display = show ? 'block' : 'none';
            noteRow.style.display = show ? 'block' : 'none';
            saveBtn.style.display = show ? 'block' : 'none';
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const itemId = itemSelect.value;
            const newStock = parseInt($('#opnameActualStock')?.value);
            const note = $('#opnameNote')?.value || '';
            
            if (!itemId) { showToast('Pilih item', 'warning'); return; }
            if (isNaN(newStock) || newStock < 0) { showToast('Masukkan jumlah stok yang valid', 'warning'); return; }
            
            const item = items.find(i => i.id === itemId);
            const oldStock = item.stok;
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
            
            try {
                const { updateItemStock, addStockOpname } = await import('./services.js');
                await updateItemStock(itemId, newStock);
                await addStockOpname({
                    itemId,
                    stokLama: oldStock,
                    stokBaru: newStock,
                    catatan: note || `Opname: ${oldStock} → ${newStock}`,
                    tanggal: new Date().toISOString().split('T')[0],
                    waktu: new Date().toISOString()
                });
                
                showToast(`Opname ${item.nama} berhasil`, 'success');
                modal.hide();
                
                if (router.getCurrentPage() === 'stockOpname') {
                    import('./modules/stockOpname.js').then(({ renderStockOpname }) => {
                        const container = $('#pageContainer');
                        if (container) renderStockOpname(container);
                    });
                }
            } catch (err) {
                showToast('Gagal menyimpan opname: ' + err.message, 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Simpan Opname';
            }
        });
    }
}

export function showQuickActionSheet() {
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">Aksi Cepat</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
            <div class="list-group list-group-flush">
                <div class="list-group-item list-group-item-action modal-option" data-action="item">
                    <i class="bi bi-box-seam me-3"></i> Tambah Item Baru
                </div>
                <div class="list-group-item list-group-item-action modal-option" data-action="employee">
                    <i class="bi bi-person-plus me-3"></i> Tambah Karyawan
                </div>
                <div class="list-group-item list-group-item-action modal-option" data-action="opname">
                    <i class="bi bi-clipboard-check me-3"></i> Opname Stok
                </div>
                <div class="list-group-item list-group-item-action modal-option" data-action="distribution">
                    <i class="bi bi-gift me-3"></i> Distribusi Item
                </div>
            </div>
        </div>
    `;
    
    const modal = showModal(content);
    
    delegate($('#appModal'), '.modal-option', 'click', (e, el) => {
        const action = el.dataset.action;
        modal.hide();
        switch(action) {
            case 'item': showItemModal(); break;
            case 'employee': showEmployeeModal(); break;
            case 'opname': showStockOpnameModal(); break;
            case 'distribution': navigateTo('distribution'); break;
        }
    });
}

export function navigateTo(page) {
    router.navigate(page);
}

export function showDistributionDetailModal(distribution) {
    const items = getItems();
    const employees = getEmployees();
    const employee = employees.find(e => e.id === distribution.employeeId);
    const distItems = Array.isArray(distribution.items) ? distribution.items : [];
    
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">Detail Distribusi</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="mb-3">
                <strong>Karyawan:</strong><br>
                ${escapeHtml(employee?.nama || distribution.employeeName || '-')} 
                ${employee ? `(${escapeHtml(employee?.departemen)})` : ''}
            </div>
            <div class="mb-3">
                <strong>Tanggal:</strong><br>
                ${distribution.tanggal} ${distribution.waktu ? new Date(distribution.waktu).toLocaleTimeString('id-ID') : ''}
            </div>
            <div class="mb-3">
                <strong>Item yang diambil:</strong>
                <ul class="mt-2">
                    ${distItems.map(i => {
                        const item = items.find(it => it.id === i.id);
                        return `<li>${escapeHtml(item?.nama || i.nama || i.id)}: ${i.jumlah} ${item?.satuan || ''}</li>`;
                    }).join('')}
                </ul>
            </div>
            ${distribution.catatan ? `
                <div class="mb-3">
                    <strong>Catatan:</strong><br>
                    ${escapeHtml(distribution.catatan)}
                </div>
            ` : ''}
            ${distribution.signature ? `
                <div class="mb-3">
                    <strong>Tanda Tangan Penerima:</strong><br>
                    <img src="${distribution.signature}" class="signature-preview mt-2" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px;">
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
        </div>
    `;
    
    showModal(content);
}

export function showItemDetailModal(itemId) {
    const item = getItem(itemId);
    if (!item) return;
    
    const content = `
        <div class="modal-header">
            <h5 class="modal-title">Detail Item</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="mb-2"><strong>Nama:</strong> ${escapeHtml(item.nama)}</div>
            <div class="mb-2"><strong>Kategori:</strong> ${item.kategori}</div>
            <div class="mb-2"><strong>Stok:</strong> ${formatNumber(item.stok)} ${item.satuan}</div>
            <div class="mb-2"><strong>Min. Stok:</strong> ${formatNumber(item.minStok)} ${item.satuan}</div>
            <div class="mb-2"><strong>Lokasi:</strong> ${escapeHtml(item.lokasi || '-')}</div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
        </div>
    `;
    
    showModal(content);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function delegate(element, selector, event, handler) {
    if (!element) return;
    element.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && element.contains(target)) {
            handler(e, target);
        }
    });
}