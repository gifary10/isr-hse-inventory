import { apiService } from './services.js';
import { $, renderContent, showToast, formatNumber } from './dom.js';
import { CONFIG } from './config.js';
import { escapeHtml, generateId } from './helpers.js';

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

// Kompres signature (sama seperti sebelumnya)
function compressSignatureForUpload(pad) {
    const data = pad.toData();
    if (!data || data.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.forEach(stroke => {
        stroke.points.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
        });
    });

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = maxX + padding;
    maxY = maxY + padding;

    const srcW = maxX - minX;
    const srcH = maxY - minY;
    if (srcW <= 0 || srcH <= 0) return null;

    const maxW = 300, maxH = 120;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    data.forEach(stroke => {
        const pts = stroke.points;
        if (pts.length === 0) return;
        ctx.beginPath();
        ctx.moveTo((pts[0].x - minX) * scale, (pts[0].y - minY) * scale);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo((pts[i].x - minX) * scale, (pts[i].y - minY) * scale);
        }
        ctx.stroke();
    });

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    console.log(`[Signature] size to upload: ~${Math.round(base64.length * 0.75 / 1024)}KB`);
    return base64;
}

// MODIFIKASI: Upload signature dulu, baru simpan distribusi
function openSignatureModal() {
    const existingModal = $('#signatureConfirmModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', `
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
                                <strong>Karyawan:</strong> ${escapeHtml(selectedEmployee.name)}<br>
                                <strong>Item:</strong> ${escapeHtml(selectedItem.name)}<br>
                                <strong>Jumlah:</strong> ${quantity} ${escapeHtml(selectedItem.unit)}
                            </div>
                        </div>
                        <p class="text-muted small mb-2">Tanda tangan digital sebagai bukti:</p>
                        <canvas id="modalSignatureCanvas" width="400" height="150"
                            style="width:100%; height:150px; touch-action:none;
                                   border:1px solid #dee2e6; border-radius:8px;"></canvas>
                        <div class="d-flex justify-content-between mt-2">
                            <button class="btn btn-sm btn-outline-danger" id="modalClearSignature">
                                <i class="bi bi-eraser"></i> Hapus
                            </button>
                            <small class="text-muted">Tap/tarik untuk menandatangani</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="modalConfirmSubmit">
                            <i class="bi bi-send"></i> Konfirmasi & Kirim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    const modal = new bootstrap.Modal($('#signatureConfirmModal'));
    modal.show();

    $('#signatureConfirmModal').addEventListener('shown.bs.modal', () => {
        const canvas = $('#modalSignatureCanvas');
        if (!canvas || !window.SignaturePad) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width  = canvas.offsetWidth  * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        signaturePad = new window.SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 1,
            maxWidth: 3
        });
    }, { once: true });
    
    $('#modalClearSignature').onclick = () => {
        if (signaturePad) signaturePad.clear();
    };
    
    $('#modalConfirmSubmit').onclick = async () => {
        if (!signaturePad || signaturePad.isEmpty()) {
            showToast('Silakan tanda tangan terlebih dahulu', 'error');
            return;
        }

        const confirmBtn = $('#modalConfirmSubmit');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengupload tanda tangan...';

        try {
            // Langkah 1: Kompres signature
            const base64Png = compressSignatureForUpload(signaturePad);
            if (!base64Png) {
                showToast('Gagal membaca tanda tangan', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-send"></i> Konfirmasi & Kirim';
                return;
            }

            // Langkah 2: Upload signature ke Drive (DULUAN)
            const uploadResult = await apiService.uploadSignature({
                imageBase64: base64Png,
                fileName: `TTD_${selectedEmployee.name.replace(/\s+/g,'_')}_${Date.now()}.png`
            });

            if (!uploadResult.success) {
                showToast('Gagal mengupload tanda tangan: ' + (uploadResult.error || ''), 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-send"></i> Konfirmasi & Kirim';
                return;
            }

            const signatureUrl = uploadResult.url; // URL Google Drive

            // Langkah 3: Simpan distribusi dengan signature URL (sekali saja)
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan distribusi...';
            const saveResult = await apiService.saveDistribution({
                employee_id: selectedEmployee.id,
                employee_name: selectedEmployee.name,
                department: selectedEmployee.department,
                position: selectedEmployee.position,
                item_id: selectedItem.id,
                item_name: selectedItem.name,
                category: selectedItem.category,
                quantity: quantity,
                signature: signatureUrl,   // langsung pakai URL hasil upload
                distributor: 'Admin',
                notes: `Distribusi ${quantity} ${selectedItem.unit}`
            });

            if (!saveResult.success) {
                showToast('Gagal menyimpan distribusi: ' + (saveResult.error || ''), 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-send"></i> Konfirmasi & Kirim';
                return;
            }

            modal.hide();
            showToast('Distribusi berhasil disimpan dengan tanda tangan!', 'success');
            renderDistribution(); // refresh halaman

        } catch (err) {
            showToast('Terjadi kesalahan: ' + err.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-send"></i> Konfirmasi & Kirim';
        }
    };
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
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
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
            if (val > 1) { quantityInput.value = val - 1; validateQuantity(); updateSubmitButton(); }
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
        quantityInput.addEventListener('change', () => { validateQuantity(); updateSubmitButton(); });
    }
    
    const submitBtn = $('#submitDistributionBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (validateQuantity()) openSignatureModal();
        });
    }
}