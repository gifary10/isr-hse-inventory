import { apiService } from './services.js';
import { $, renderContent, formatDate, formatNumber, showToast } from './dom.js';
import { escapeHtml } from './helpers.js';

let activeTab = 'distribution';

export async function renderHistory() {
    renderContent(`
        <div class="history-container">
            <div class="d-flex gap-2 mb-3">
                <button class="btn ${activeTab === 'distribution' ? 'btn-primary' : 'btn-outline-secondary'}" id="distribusiTab">
                    <i class="bi bi-truck"></i> Distribusi
                </button>
                <button class="btn ${activeTab === 'opname' ? 'btn-primary' : 'btn-outline-secondary'}" id="opnameTab">
                    <i class="bi bi-clipboard-check"></i> Opname
                </button>
            </div>
            
            <div id="historyList">
                <div class="text-center py-4">
                    <div class="spinner-border text-accent"></div>
                </div>
            </div>
            
            <div class="text-center mt-3">
                <button class="btn btn-sm btn-outline-secondary" id="exportHistoryBtn">
                    <i class="bi bi-download"></i> Export History
                </button>
            </div>
        </div>
    `);
    
    await loadHistory();
    attachHistoryEvents();
}

async function loadHistory() {
    try {
        let data = [];
        let title = '';
        
        if (activeTab === 'distribution') {
            data = await apiService.getDistributionHistory();
            title = 'Riwayat Distribusi';
        } else {
            data = await apiService.getStockHistory();
            title = 'Riwayat Stok Opname';
        }
        
        renderHistoryList(data, title);
    } catch (error) {
        showToast('Gagal memuat riwayat', 'error');
    }
}

function renderSignatureCell(signature) {
    if (!signature) {
        return `<small class="text-muted">-</small>`;
    }

    if (signature.startsWith('http://') || signature.startsWith('https://')) {
        return `
            <a href="${escapeHtml(signature)}" target="_blank" rel="noopener noreferrer"
               class="btn btn-sm btn-outline-primary py-0 px-2"
               title="Lihat tanda tangan">
                <i class="bi bi-pen"></i> Lihat TTD
            </a>
        `;
    }

    if (signature.startsWith('data:image/')) {
        return `<img src="${signature}" alt="Tanda Tangan" style="max-height:40px; max-width:100px; border:1px solid #dee2e6; border-radius:4px;">`;
    }

    return `<small class="text-muted">-</small>`;
}

function renderHistoryList(data, title) {
    const container = $('#historyList');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-clock-history"></i>
                <h5>Belum ada riwayat</h5>
                <p>Data akan muncul setelah Anda melakukan opname atau distribusi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <h6 class="text-muted mb-2"><i class="bi bi-calendar"></i> ${title}</h6>
        ${data.map(record => {
            if (activeTab === 'distribution') {
                return `
                    <div class="card-item">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span class="badge-status badge-success">
                                    <i class="bi bi-check-circle"></i> Selesai
                                </span>
                                <span class="badge bg-light ms-2">${formatDate(record.timestamp, 'date')}</span>
                            </div>
                            <small class="text-muted">${formatDate(record.timestamp, 'time')}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div>
                                <div class="fw-semibold">${escapeHtml(record.employee_name)}</div>
                                <small class="text-muted">${escapeHtml(record.department)} | ${escapeHtml(record.position)}</small>
                            </div>
                            <div class="text-end">
                                <div class="text-accent fw-bold">${formatNumber(record.quantity)}</div>
                                <small class="text-muted">${escapeHtml(record.item_name)}</small>
                            </div>
                        </div>
                        <hr class="my-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-person"></i> ${escapeHtml(record.distributor || 'Admin')}
                            </small>
                            <div>
                                ${renderSignatureCell(record.signature)}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="card-item">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span class="badge-status ${record.new_stock !== record.old_stock ? 'badge-warning' : 'badge-info'}">
                                    <i class="bi bi-pencil"></i> ${record.new_stock !== record.old_stock ? 'Diubah' : 'Tidak Berubah'}
                                </span>
                                <span class="badge bg-light ms-2">${formatDate(record.timestamp, 'date')}</span>
                            </div>
                            <small class="text-muted">${formatDate(record.timestamp, 'time')}</small>
                        </div>
                        <div class="fw-semibold mb-2">${escapeHtml(record.item_name)}</div>
                        <div class="d-flex justify-content-between">
                            <div>
                                <small class="text-muted">Stok Lama</small>
                                <div class="text-danger">${formatNumber(record.old_stock)}</div>
                            </div>
                            <i class="bi bi-arrow-right-short fs-4 text-muted"></i>
                            <div class="text-end">
                                <small class="text-muted">Stok Baru</small>
                                <div class="text-success">${formatNumber(record.new_stock)}</div>
                            </div>
                        </div>
                        ${record.notes ? `<hr class="my-2"><small class="text-muted"><i class="bi bi-chat"></i> ${escapeHtml(record.notes)}</small>` : ''}
                    </div>
                `;
            }
        }).join('')}
    `;
}

function attachHistoryEvents() {
    const distribusiTab = $('#distribusiTab');
    const opnameTab = $('#opnameTab');
    const exportBtn = $('#exportHistoryBtn');
    
    if (distribusiTab) {
        distribusiTab.addEventListener('click', async () => {
            activeTab = 'distribution';
            await renderHistory();
        });
    }
    
    if (opnameTab) {
        opnameTab.addEventListener('click', async () => {
            activeTab = 'opname';
            await renderHistory();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            let data;
            if (activeTab === 'distribution') {
                data = await apiService.getDistributionHistory();
                // Hapus kolom signature agar tidak mengganggu Excel (opsional)
                data = data.map(d => {
                    const { signature, ...rest } = d;
                    return rest;
                });
            } else {
                data = await apiService.getStockHistory();
            }
            
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `History_${activeTab}`);
            XLSX.writeFile(wb, `ISR_History_${activeTab}_${new Date().toISOString().slice(0,19)}.xlsx`);
            
            showToast('History berhasil diexport!', 'success');
        });
    }
}