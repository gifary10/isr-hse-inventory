import { apiService } from './services.js';
import { $, renderContent, showToast, formatNumber } from './dom.js';
import { CONFIG } from './config.js';

let selectedEmployee = null;
let selectedItem = null;
let quantity = 1;
let currentCategory = 1;
let currentItems = [];
let searchQuery = '';
let signaturePad = null;

export async function renderDistribution() {
    selectedEmployee = null;
    selectedItem = null;
    quantity = 1;
    currentCategory = 1;
    searchQuery = '';
    
    renderContent(`
        <div class="distribution-container">
            <div class="card-item mb-3">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-person-badge fs-5 text-accent"></i>
                    <h6 class="mb-0">1. Pilih Karyawan</h6>
                </div>
                <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="employeeSearch" placeholder="Cari nama atau ID karyawan...">
                </div>
                <div id="employeeResults" class="mt-2" style="max-height: 200px; overflow-y: auto;"></div>
                <div id="selectedEmployeeInfo" class="mt-3" style="display: none;">
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle-fill"></i>
                        <strong id="selectedEmployeeName"></strong><br>
                        <small id="selectedEmployeeDetails"></small>
                    </div>
                </div>
            </div>
            
            <div class="card-item mb-3" id="itemSelectionSection" style="opacity: 0.5; pointer-events: none;">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-box-seam fs-5 text-accent"></i>
                    <h6 class="mb-0">2. Pilih Item</h6>
                </div>
                
                <div class="category-tabs mb-3">
                    ${CONFIG.CATEGORIES.map(cat => `
                        <div class="category-tab ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                            <i class="bi ${cat.icon}"></i>
                            <span>${cat.name}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="input-group mb-3">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="itemSearch" placeholder="Cari item...">
                </div>
                
                <div id="itemsList">
                    <div class="text-center py-3 text-muted">
                        <i class="bi bi-box"></i> Pilih kategori terlebih dahulu
                    </div>
                </div>
                
                <div id="selectedItemInfo" style="display: none;">
                    <div class="alert alert-info mt-3">
                        <i class="bi bi-cube"></i>
                        <strong id="selectedItemName"></strong><br>
                        <small>Stok tersedia: <span id="selectedItemStock"></span></small>
                    </div>
                </div>
            </div>
            
            <div class="card-item mb-3" id="quantitySection" style="opacity: 0.5; pointer-events: none;">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-123 fs-5 text-accent"></i>
                    <h6 class="mb-0">3. Jumlah Item</h6>
                </div>
                <div class="input-group">
                    <button class="btn btn-outline-secondary" id="decrementQty" type="button">-</button>
                    <input type="number" class="form-control text-center" id="quantityInput" value="1" min="1">
                    <button class="btn btn-outline-secondary" id="incrementQty" type="button">+</button>
                </div>
                <div id="quantityError" class="text-danger small mt-2" style="display: none;"></div>
            </div>
            
            <button class="btn btn-primary btn-lg w-100" id="submitDistributionBtn" disabled>
                <i class="bi bi-send"></i> Kirim & Tanda Tangan
            </button>
        </div>
    `);
    
    await loadItems();
    attachDistributionEvents();
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
            <div class="text-center py-3 text-muted">
                <i class="bi bi-inbox"></i> Tidak ada item dalam kategori ini
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentItems.map(item => `
        <div class="card-item clickable mb-2 p-3" data-item='${JSON.stringify(item)}'>
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-semibold">${escapeHtml(item.name)}</div>
                    <small class="text-muted">Stok: ${formatNumber(item.current_stock)} ${item.unit}</small>
                </div>
                <i class="bi bi-chevron-right text-accent"></i>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('#itemsList .card-item').forEach(card => {
        card.addEventListener('click', () => {
            selectedItem = JSON.parse(card.dataset.item);
            updateSelectedItemInfo();
        });
    });
}

function updateSelectedItemInfo() {
    if (selectedItem) {
        $('#selectedItemInfo').style.display = 'block';
        $('#selectedItemName').textContent = selectedItem.name;
        $('#selectedItemStock').textContent = `${formatNumber(selectedItem.current_stock)} ${selectedItem.unit}`;
        
        const quantitySection = $('#quantitySection');
        if (quantitySection) {
            quantitySection.style.opacity = '1';
            quantitySection.style.pointerEvents = 'auto';
        }
        
        quantity = 1;
        $('#quantityInput').value = 1;
        validateQuantity();
        updateSubmitButton();
    }
}

function validateQuantity() {
    const qty = parseInt($('#quantityInput').value);
    const errorDiv = $('#quantityError');
    
    if (isNaN(qty) || qty < 1) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Jumlah harus minimal 1';
        }
        return false;
    }
    
    if (selectedItem && qty > selectedItem.current_stock) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = `Stok tidak mencukupi! Tersedia: ${selectedItem.current_stock} ${selectedItem.unit}`;
        }
        return false;
    }
    
    if (errorDiv) errorDiv.style.display = 'none';
    quantity = qty;
    return true;
}

function updateSubmitButton() {
    const submitBtn = $('#submitDistributionBtn');
    if (submitBtn) {
        if (selectedEmployee && selectedItem && validateQuantity()) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }
}

function updateSelectedEmployeeInfo() {
    if (selectedEmployee) {
        const employeeSearch = $('#employeeSearch');
        const employeeResults = $('#employeeResults');
        const selectedInfo = $('#selectedEmployeeInfo');
        
        if (employeeSearch) employeeSearch.style.display = 'none';
        if (employeeResults) employeeResults.style.display = 'none';
        if (selectedInfo) selectedInfo.style.display = 'block';
        
        $('#selectedEmployeeName').textContent = selectedEmployee.name;
        $('#selectedEmployeeDetails').textContent = `${selectedEmployee.department} | ${selectedEmployee.position}`;
        
        const itemSection = $('#itemSelectionSection');
        if (itemSection) {
            itemSection.style.opacity = '1';
            itemSection.style.pointerEvents = 'auto';
        }
        
        updateSubmitButton();
    }
}

async function searchEmployees(query) {
    if (query.length < 2) {
        $('#employeeResults').innerHTML = '';
        return;
    }
    
    try {
        const employees = await apiService.searchEmployees(query);
        const resultsDiv = $('#employeeResults');
        
        if (employees.length === 0) {
            resultsDiv.innerHTML = '<div class="text-muted small p-2">Karyawan tidak ditemukan</div>';
            return;
        }
        
        resultsDiv.innerHTML = employees.map(emp => `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom clickable" data-employee='${JSON.stringify(emp)}'>
                <div>
                    <div class="fw-semibold">${escapeHtml(emp.name)}</div>
                    <small class="text-muted">${escapeHtml(emp.department)} | ${escapeHtml(emp.position)}</small>
                </div>
                <i class="bi bi-check-circle text-accent"></i>
            </div>
        `).join('');
        
        document.querySelectorAll('#employeeResults [data-employee]').forEach(el => {
            el.addEventListener('click', () => {
                selectedEmployee = JSON.parse(el.dataset.employee);
                updateSelectedEmployeeInfo();
            });
        });
    } catch (error) {
        showToast('Gagal mencari karyawan', 'error');
    }
}

function openSignatureModal() {
    const modalHtml = `
        <div class="modal fade" id="signatureConfirmModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary-dark text-white">
                        <h5 class="modal-title">Konfirmasi Distribusi</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <div class="alert alert-info">
                                <strong>Karyawan:</strong> ${selectedEmployee.name}<br>
                                <strong>Item:</strong> ${selectedItem.name}<br>
                                <strong>Jumlah:</strong> ${quantity} ${selectedItem.unit}
                            </div>
                        </div>
                        <p class="text-muted small mb-2">Tanda tangan digital sebagai bukti:</p>
                        <canvas id="modalSignatureCanvas" width="400" height="150" style="width:100%; height:150px; touch-action:none;"></canvas>
                        <div class="d-flex justify-content-between mt-2">
                            <button class="btn btn-sm btn-outline-danger" id="modalClearSignature">Hapus</button>
                            <small class="text-muted">Tap/tarik untuk menandatangani</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="modalConfirmSubmit">Konfirmasi & Kirim</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = $('#signatureConfirmModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal($('#signatureConfirmModal'));
    modal.show();
    
    const canvas = $('#modalSignatureCanvas');
    if (canvas && window.SignaturePad) {
        signaturePad = new window.SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });
        
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        signaturePad.clear();
    }
    
    const clearBtn = $('#modalClearSignature');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (signaturePad) signaturePad.clear();
        };
    }
    
    const confirmBtn = $('#modalConfirmSubmit');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (signaturePad && signaturePad.isEmpty()) {
                showToast('Silakan tanda tangan terlebih dahulu', 'error');
                return;
            }
            
            const signatureData = signaturePad ? signaturePad.toDataURL() : '';
            
            const result = await apiService.saveDistribution({
                employee_id: selectedEmployee.id,
                employee_name: selectedEmployee.name,
                department: selectedEmployee.department,
                position: selectedEmployee.position,
                item_id: selectedItem.id,
                item_name: selectedItem.name,
                category: selectedItem.category,
                quantity: quantity,
                signature: signatureData,
                distributor: 'Admin',
                notes: `Distribusi ${quantity} ${selectedItem.unit}`
            });
            
            if (result.success) {
                modal.hide();
                showToast('Distribusi berhasil!', 'success');
                renderDistribution();
            }
        };
    }
}

function attachDistributionEvents() {
    const employeeSearch = $('#employeeSearch');
    if (employeeSearch) {
        let timeout;
        employeeSearch.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => searchEmployees(e.target.value), 300);
        });
    }
    
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentCategory = parseInt(tab.dataset.category);
            searchQuery = '';
            if ($('#itemSearch')) $('#itemSearch').value = '';
            loadItems();
            
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
        });
    });
    
    const itemSearch = $('#itemSearch');
    if (itemSearch) {
        let timeout;
        itemSearch.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchQuery = e.target.value;
                loadItems();
            }, 300);
        });
    }
    
    const decrementBtn = $('#decrementQty');
    const incrementBtn = $('#incrementQty');
    const quantityInput = $('#quantityInput');
    
    if (decrementBtn) {
        decrementBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
                validateQuantity();
                updateSubmitButton();
            }
        });
    }
    
    if (incrementBtn) {
        incrementBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            quantityInput.value = val + 1;
            validateQuantity();
            updateSubmitButton();
        });
    }
    
    if (quantityInput) {
        quantityInput.addEventListener('change', () => {
            validateQuantity();
            updateSubmitButton();
        });
    }
    
    const submitBtn = $('#submitDistributionBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (validateQuantity()) {
                openSignatureModal();
            }
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}