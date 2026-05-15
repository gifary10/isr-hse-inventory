// modules/distribution.js
import { getItems, getEmployees, addDistribution, updateItemStock } from '../services.js';
import { formatNumber, showToast, debounce } from '../utils/helpers.js';
import { $, delegate } from '../utils/dom.js';

export function renderDistribution(container) {
    let items = getItems();
    let employees = getEmployees();
    
    // Employee selection state
    let selectedDepartment = '';
    let employeeSearchTerm = '';
    let employeeSearchResults = [];
    let selectedEmployeeId = '';
    let selectedEmployeeName = '';
    
    // Item selection state
    let selectedCategory = '';
    let itemSearchTerm = '';
    let itemSearchResults = [];
    let selectedItems = [];
    
    const departments = [...new Set(employees.map(e => e.departemen))].sort();
    const categories = ['Obat', 'Vitamin', 'P3K', 'APD'];
    
    function filterEmployeeResults() {
        if (!selectedDepartment) { employeeSearchResults = []; return; }
        let filtered = employees.filter(e => e.departemen === selectedDepartment);
        if (employeeSearchTerm.trim()) {
            const term = employeeSearchTerm.toLowerCase();
            filtered = filtered.filter(e => e.nama.toLowerCase().includes(term) || e.jabatan.toLowerCase().includes(term));
        }
        employeeSearchResults = filtered;
    }
    
    function filterItemResults() {
        if (!selectedCategory) { itemSearchResults = []; return; }
        let filtered = items.filter(i => i.kategori === selectedCategory && Number(i.stok) > 0);
        if (itemSearchTerm.trim()) {
            const term = itemSearchTerm.toLowerCase();
            filtered = filtered.filter(i => i.nama.toLowerCase().includes(term));
        }
        itemSearchResults = filtered;
    }
    
    function selectEmployee(empId, empName) {
        selectedEmployeeId = empId;
        selectedEmployeeName = empName;
        renderEmployeeSection();
    }
    
    function renderEmployeeSection() {
        const employeeContainer = $('#employeeSection');
        if (!employeeContainer) return;
        
        let html = `
            <div class="mb-3">
                <label class="form-label">Pilih Departemen *</label>
                <select class="form-select" id="departmentSelect">
                    <option value="">-- Pilih Departemen --</option>
                    ${departments.map(dept => `
                        <option value="${escapeHtml(dept)}" ${selectedDepartment === dept ? 'selected' : ''}>
                            ${escapeHtml(dept)}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
        
        if (selectedDepartment) {
            html += `
                <div class="mb-3">
                    <label class="form-label">Cari Karyawan</label>
                    <div class="search-box">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" id="employeeSearch" 
                               placeholder="Cari nama atau jabatan..." value="${escapeHtml(employeeSearchTerm)}">
                    </div>
                </div>
            `;
            
            if (selectedEmployeeId) {
                const selectedEmp = employees.find(e => e.id === selectedEmployeeId);
                if (selectedEmp) {
                    html += `
                        <div class="alert alert-success mb-3">
                            <i class="bi bi-check-circle-fill"></i> 
                            <strong>Karyawan terpilih:</strong> ${escapeHtml(selectedEmp.nama)} - ${escapeHtml(selectedEmp.jabatan)}
                        </div>
                    `;
                }
            }
            
            if (employeeSearchResults.length > 0) {
                html += `
                    <div class="mb-3">
                        <label class="form-label">Hasil pencarian (${employeeSearchResults.length} karyawan)</label>
                        <div class="employee-results-list" style="max-height: 250px; overflow-y: auto;">
                            ${employeeSearchResults.map(emp => `
                                <div class="card-item clickable employee-result-item mb-2" data-id="${emp.id}" data-name="${escapeHtml(emp.nama)}">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="fw-bold">${escapeHtml(emp.nama)}</div>
                                            <div class="text-small text-muted">
                                                <i class="bi bi-briefcase-fill"></i> ${escapeHtml(emp.jabatan)}
                                            </div>
                                        </div>
                                        <i class="bi bi-chevron-right text-muted"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (employeeSearchTerm) {
                html += `
                    <div class="alert alert-secondary text-center mb-3">
                        <i class="bi bi-search"></i> Tidak ditemukan karyawan dengan nama "${escapeHtml(employeeSearchTerm)}"
                    </div>
                `;
            }
        }
        
        employeeContainer.innerHTML = html;
        
        const deptSelect = $('#departmentSelect');
        if (deptSelect) {
            deptSelect.removeEventListener('change', handleDepartmentChange);
            deptSelect.addEventListener('change', handleDepartmentChange);
        }
        
        const employeeSearchInput = $('#employeeSearch');
        if (employeeSearchInput) {
            const debouncedSearch = debounce((e) => {
                employeeSearchTerm = e.target.value;
                filterEmployeeResults();
                renderEmployeeSection();
            }, 300);
            employeeSearchInput.removeEventListener('input', employeeSearchInput._debouncedListener);
            employeeSearchInput._debouncedListener = debouncedSearch;
            employeeSearchInput.addEventListener('input', employeeSearchInput._debouncedListener);
        }
        
        bindEmployeeResultClicks();
    }
    
    function handleDepartmentChange(e) {
        selectedDepartment = e.target.value;
        employeeSearchTerm = '';
        selectedEmployeeId = '';
        selectedEmployeeName = '';
        filterEmployeeResults();
        renderEmployeeSection();
    }
    
    function bindEmployeeResultClicks() {
        const employeeSection = $('#employeeSection');
        if (!employeeSection) return;
        if (employeeSection._delegateListener) {
            employeeSection.removeEventListener('click', employeeSection._delegateListener);
        }
        const clickHandler = (e) => {
            const target = e.target.closest('.employee-result-item');
            if (target && employeeSection.contains(target)) {
                e.stopPropagation();
                const id = target.dataset.id;
                const name = target.dataset.name;
                if (id) selectEmployee(id, name);
            }
        };
        employeeSection.addEventListener('click', clickHandler);
        employeeSection._delegateListener = clickHandler;
    }
    
    function renderItemSection() {
        const itemContainer = $('#itemSection');
        if (!itemContainer) return;
        
        let html = `
            <div class="mb-3">
                <label class="form-label">Pilih Kategori Item *</label>
                <select class="form-select" id="categorySelect">
                    <option value="">-- Pilih Kategori --</option>
                    ${categories.map(cat => `
                        <option value="${cat}" ${selectedCategory === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                </select>
            </div>
        `;
        
        if (selectedCategory) {
            html += `
                <div class="mb-3">
                    <label class="form-label">Cari Item</label>
                    <div class="search-box">
                        <i class="bi bi-search"></i>
                        <input type="text" class="form-control" id="itemSearch" 
                               placeholder="Cari nama item..." value="${escapeHtml(itemSearchTerm)}">
                    </div>
                </div>
            `;
            
            if (itemSearchResults.length > 0) {
                html += `
                    <div class="mb-3">
                        <label class="form-label">Hasil pencarian (${itemSearchResults.length} item)</label>
                        <div class="item-results-list" style="max-height: 250px; overflow-y: auto;">
                            ${itemSearchResults.map(item => `
                                <div class="card-item clickable item-result-item mb-2" data-id="${item.id}" data-name="${escapeHtml(item.nama)}" data-stok="${item.stok}" data-satuan="${item.satuan}">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="fw-bold">${escapeHtml(item.nama)}</div>
                                            <div class="text-small">
                                                <span class="text-muted">Stok: ${formatNumber(item.stok)} ${escapeHtml(item.satuan)}</span>
                                            </div>
                                        </div>
                                        <i class="bi bi-plus-circle text-accent fs-5"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (itemSearchTerm) {
                html += `
                    <div class="alert alert-secondary text-center mb-3">
                        <i class="bi bi-search"></i> Tidak ditemukan item "${escapeHtml(itemSearchTerm)}"
                    </div>
                `;
            } else {
                html += `
                    <div class="alert alert-info text-center mb-3">
                        <i class="bi bi-info-circle"></i> Mulai ketik untuk mencari item di kategori ${selectedCategory}
                    </div>
                `;
            }
        }
        
        itemContainer.innerHTML = html;
        
        const catSelect = $('#categorySelect');
        if (catSelect) {
            catSelect.removeEventListener('change', handleCategorySelectChange);
            catSelect.addEventListener('change', handleCategorySelectChange);
        }
        
        const itemSearchInput = $('#itemSearch');
        if (itemSearchInput) {
            const debouncedSearch = debounce((e) => {
                itemSearchTerm = e.target.value;
                filterItemResults();
                renderItemSection();
            }, 300);
            itemSearchInput.removeEventListener('input', itemSearchInput._debouncedListener);
            itemSearchInput._debouncedListener = debouncedSearch;
            itemSearchInput.addEventListener('input', itemSearchInput._debouncedListener);
        }
        
        bindItemResultClicks();
    }
    
    function handleCategorySelectChange(e) {
        selectedCategory = e.target.value;
        itemSearchTerm = '';
        filterItemResults();
        renderItemSection();
    }
    
    function bindItemResultClicks() {
        const itemSection = $('#itemSection');
        if (!itemSection) return;
        if (itemSection._delegateListener) {
            itemSection.removeEventListener('click', itemSection._delegateListener);
        }
        const clickHandler = (e) => {
            const target = e.target.closest('.item-result-item');
            if (target && itemSection.contains(target)) {
                e.stopPropagation();
                const itemId = target.dataset.id;
                const itemName = target.dataset.name;
                const maxStock = parseInt(target.dataset.stok);
                const satuan = target.dataset.satuan;
                if (itemId) showQuantityModal(itemId, itemName, maxStock, satuan);
            }
        };
        itemSection.addEventListener('click', clickHandler);
        itemSection._delegateListener = clickHandler;
    }
    
    function showQuantityModal(itemId, itemName, maxStock, satuan) {
        const modalHtml = `
            <div class="modal fade" id="quantityModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Tambah ${escapeHtml(itemName)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Jumlah (Maks: ${formatNumber(maxStock)} ${escapeHtml(satuan)})</label>
                                <input type="number" class="form-control" id="quantityInput" min="1" max="${maxStock}" value="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" id="confirmAddItem">Tambah</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        let modalContainer = $('#quantityModalContainer');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'quantityModalContainer';
            document.body.appendChild(modalContainer);
        }
        modalContainer.innerHTML = modalHtml;
        
        const modalElement = $('#quantityModal');
        const modal = new bootstrap.Modal(modalElement);
        
        const confirmBtn = $('#confirmAddItem');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const quantity = parseInt($('#quantityInput')?.value);
                if (isNaN(quantity) || quantity <= 0) { showToast('Masukkan jumlah yang valid', 'warning'); return; }
                if (quantity > maxStock) { showToast(`Jumlah melebihi stok (tersisa ${formatNumber(maxStock)})`, 'danger'); return; }
                
                const existingIndex = selectedItems.findIndex(i => i.id === itemId);
                if (existingIndex >= 0) {
                    const newJumlah = selectedItems[existingIndex].jumlah + quantity;
                    if (newJumlah > maxStock) { showToast('Total pengambilan melebihi stok', 'danger'); return; }
                    selectedItems[existingIndex].jumlah = newJumlah;
                } else {
                    selectedItems.push({ id: itemId, jumlah: quantity });
                }
                
                modal.hide();
                showToast(`${quantity} ${satuan} ${itemName} ditambahkan`, 'success');
                renderSelectedItems();
            });
        }
        
        modalElement.addEventListener('hidden.bs.modal', () => { modalContainer.innerHTML = ''; });
        modal.show();
    }
    
    function renderSelectedItems() {
        const selectedContainer = $('#selectedItemsContainer');
        if (!selectedContainer) return;
        
        if (selectedItems.length === 0) {
            selectedContainer.innerHTML = `
                <div class="alert alert-secondary text-center">
                    <i class="bi bi-cart"></i> Belum ada item yang dipilih
                </div>
            `;
            return;
        }
        
        selectedContainer.innerHTML = `
            <div class="list-group">
                ${selectedItems.map((item, idx) => {
                    const itemData = items.find(i => i.id === item.id);
                    return `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${escapeHtml(itemData?.nama)}</strong><br>
                                <small>${formatNumber(item.jumlah)} ${escapeHtml(itemData?.satuan)}</small>
                            </div>
                            <button class="btn btn-sm btn-danger remove-item" data-index="${idx}">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        bindRemoveButtons();
    }
    
    function bindRemoveButtons() {
        const selectedContainer = $('#selectedItemsContainer');
        if (!selectedContainer) return;
        if (selectedContainer._removeListener) {
            selectedContainer.removeEventListener('click', selectedContainer._removeListener);
        }
        const clickHandler = (e) => {
            const target = e.target.closest('.remove-item');
            if (target && selectedContainer.contains(target)) {
                const index = parseInt(target.dataset.index);
                if (!isNaN(index)) {
                    selectedItems.splice(index, 1);
                    renderSelectedItems();
                    showToast('Item dihapus dari daftar', 'info');
                }
            }
        };
        selectedContainer.addEventListener('click', clickHandler);
        selectedContainer._removeListener = clickHandler;
    }
    
    function initSignature() {
        const canvas = $('#signatureCanvas');
        if (!canvas) return;
        const cont = canvas.parentElement;
        canvas.width = cont.clientWidth - 32;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#00102c';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        let drawing = false;
        
        const getPos = (e, c) => {
            const rect = c.getBoundingClientRect();
            const scaleX = c.width / rect.width;
            const scaleY = c.height / rect.height;
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: Math.max(0, Math.min(c.width, (clientX - rect.left) * scaleX)),
                y: Math.max(0, Math.min(c.height, (clientY - rect.top) * scaleY))
            };
        };
        
        canvas.addEventListener('mousedown', e => { drawing = true; const p = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        canvas.addEventListener('mousemove', e => { if (!drawing) return; const p = getPos(e, canvas); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });
        canvas.addEventListener('mouseleave', () => { drawing = false; ctx.beginPath(); });
        canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; const p = getPos(e.touches[0], canvas); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }, { passive: false });
        canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!drawing) return; const p = getPos(e.touches[0], canvas); ctx.lineTo(p.x, p.y); ctx.stroke(); }, { passive: false });
        canvas.addEventListener('touchend', () => { drawing = false; ctx.beginPath(); });
        
        const clearBtn = $('#clearSignature');
        if (clearBtn) clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    }
    
    async function submitDistribution() {
        if (!selectedEmployeeId) { showToast('Pilih karyawan terlebih dahulu', 'warning'); return; }
        if (selectedItems.length === 0) { showToast('Pilih minimal satu item', 'warning'); return; }
        
        const canvas = $('#signatureCanvas');
        const signatureData = canvas ? canvas.toDataURL() : '';
        if (!signatureData || signatureData === 'data:,') { showToast('Tanda tangan diperlukan', 'warning'); return; }
        
        const note = $('#distributionNote')?.value || '';
        
        // Validasi stok
        for (const selectedItem of selectedItems) {
            const item = items.find(i => i.id === selectedItem.id);
            if (selectedItem.jumlah > Number(item.stok)) {
                showToast(`Stok ${item.nama} tidak mencukupi`, 'danger');
                return;
            }
        }
        
        const submitBtn = $('#submitDistribution');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
        }
        
        try {
            // Update stok tiap item
            for (const selectedItem of selectedItems) {
                const item = items.find(i => i.id === selectedItem.id);
                await updateItemStock(selectedItem.id, Number(item.stok) - selectedItem.jumlah);
            }
            
            // Simpan distribusi
            await addDistribution({
                employeeId: selectedEmployeeId,
                items: selectedItems,
                catatan: note,
                signature: signatureData,
                tanggal: new Date().toISOString().split('T')[0],
                waktu: new Date().toISOString()
            });
            
            showToast('Distribusi berhasil disimpan', 'success');
            
            // Reset form
            selectedDepartment = '';
            employeeSearchTerm = '';
            selectedEmployeeId = '';
            selectedEmployeeName = '';
            selectedCategory = '';
            itemSearchTerm = '';
            selectedItems = [];
            
            // Refresh data dari cache
            items = getItems();
            employees = getEmployees();
            
            render();
        } catch (err) {
            showToast('Gagal menyimpan distribusi: ' + err.message, 'danger');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Simpan Distribusi';
            }
        }
    }
    
    function render() {
        const html = `
            <div id="employeeSection" class="card-item mb-4"></div>
            <div id="itemSection" class="card-item mb-4"></div>
            <div class="card-item mb-4">
                <div class="form-label">Daftar Item yang Diambil *</div>
                <div id="selectedItemsContainer"></div>
            </div>
            <div class="card-item mb-4">
                <div class="form-label">Catatan</div>
                <textarea class="form-control" id="distributionNote" rows="2" placeholder="Catatan pengambilan (opsional)"></textarea>
            </div>
            <div class="card-item mb-4">
                <div class="form-label">Tanda Tangan Penerima *</div>
                <div class="signature-container">
                    <canvas id="signatureCanvas" class="signature-canvas" style="width: 100%; height: 150px; touch-action: none;"></canvas>
                    <div class="p-2 text-end">
                        <button class="btn btn-sm btn-clear-sign" id="clearSignature">
                            <i class="bi bi-eraser"></i> Hapus
                        </button>
                    </div>
                </div>
                <small class="text-muted">Tanda tangan digital sebagai bukti penerimaan</small>
            </div>
            <button class="btn btn-primary w-100 btn-lg" id="submitDistribution">
                <i class="bi bi-check-circle"></i> Simpan Distribusi
            </button>
        `;
        
        container.innerHTML = html;
        renderEmployeeSection();
        renderItemSection();
        renderSelectedItems();
        initSignature();
        
        const submitBtn = $('#submitDistribution');
        if (submitBtn) {
            submitBtn.removeEventListener('click', submitDistribution);
            submitBtn.addEventListener('click', submitDistribution);
        }
    }
    
    render();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}