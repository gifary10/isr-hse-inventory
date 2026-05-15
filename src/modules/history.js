import { getDistributions, getStockOpnameHistory, getItems, getEmployees } from '../services.js';
import { formatDate, formatNumber } from '../utils/helpers.js';
import { $, delegate } from '../utils/dom.js';
import { showItemDetailModal, showDistributionDetailModal } from '../components.js';

export function renderHistory(container) {
    let activeTab = 'distribution';
    let distributions = getDistributions();
    let opnameHistory = getStockOpnameHistory();
    const items = getItems();
    const employees = getEmployees();
    let searchTerm = '';
    
    function renderDistributionList() {
        let filtered = [...distributions];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(d => {
                const employee = employees.find(e => e.id === d.employeeId);
                const employeeName = employee?.nama?.toLowerCase() || '';
                const itemNames = d.items?.map(i => {
                    const item = items.find(it => it.id === i.id);
                    return item?.nama?.toLowerCase() || '';
                }).join(' ') || '';
                return employeeName.includes(term) || itemNames.includes(term);
            });
        }
        
        if (filtered.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <p>Tidak ada histori distribusi</p>
                </div>
            `;
        }
        
        return filtered.slice(0, 50).map(dist => {
            const employee = employees.find(e => e.id === dist.employeeId);
            const totalItems = dist.items?.reduce((sum, i) => sum + i.jumlah, 0) || 0;
            
            return `
                <div class="card-item clickable" data-id="${dist.id}" data-type="distribution">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${escapeHtml(employee?.nama || 'Karyawan tidak ditemukan')}</div>
                            <div class="text-small text-muted">${escapeHtml(employee?.departemen || '-')}</div>
                            <div class="mt-1">
                                ${dist.items?.slice(0, 2).map(i => {
                                    const item = items.find(it => it.id === i.id);
                                    return `<span class="badge bg-light me-1">${escapeHtml(item?.nama)}: ${i.jumlah}</span>`;
                                }).join('')}
                                ${dist.items?.length > 2 ? `<span class="badge bg-light">+${dist.items.length - 2} lagi</span>` : ''}
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="badge bg-success">${totalItems} item</div>
                            <div class="text-small text-muted mt-1">${formatDate(dist.tanggal)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderOpnameList() {
        let filtered = [...opnameHistory];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(h => {
                const item = items.find(i => i.id === h.itemId);
                return item?.nama?.toLowerCase().includes(term) || h.catatan?.toLowerCase().includes(term);
            });
        }
        
        if (filtered.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-clipboard-check"></i>
                    <p>Tidak ada histori opname</p>
                </div>
            `;
        }
        
        return filtered.slice(0, 50).map(h => {
            const item = items.find(i => i.id === h.itemId);
            const selisih = h.stokBaru - h.stokLama;
            
            return `
                <div class="card-item clickable" data-id="${h.id}" data-type="opname">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${escapeHtml(item?.nama || 'Item tidak ditemukan')}</div>
                            <div class="text-small">
                                <span class="${selisih >= 0 ? 'text-success' : 'text-danger'}">
                                    ${selisih >= 0 ? '+' : ''}${formatNumber(selisih)}
                                </span>
                                <span class="text-muted mx-1">→</span>
                                <span class="fw-bold">${formatNumber(h.stokBaru)}</span>
                            </div>
                            ${h.catatan ? `<div class="text-small text-muted mt-1">${escapeHtml(h.catatan)}</div>` : ''}
                        </div>
                        <div class="text-end">
                            <div class="text-small text-muted">${formatDate(h.tanggal)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function render() {
        const html = `
            <div class="mb-3">
                <div class="d-flex gap-2 mb-3">
                    <button class="btn ${activeTab === 'distribution' ? 'btn-primary' : 'btn-outline-secondary'} flex-fill" id="tabDistribution">
                        <i class="bi bi-gift-fill"></i> Distribusi
                    </button>
                    <button class="btn ${activeTab === 'opname' ? 'btn-primary' : 'btn-outline-secondary'} flex-fill" id="tabOpname">
                        <i class="bi bi-clipboard-check"></i> Opname
                    </button>
                </div>
                <div class="search-box mb-3">
                    <i class="bi bi-search"></i>
                    <input type="text" class="form-control" id="searchHistory" placeholder="Cari...">
                </div>
            </div>
            <div id="historyList">
                ${activeTab === 'distribution' ? renderDistributionList() : renderOpnameList()}
            </div>
        `;
        
        container.innerHTML = html;
        
        const tabDistribution = $('#tabDistribution');
        const tabOpname = $('#tabOpname');
        const searchInput = $('#searchHistory');
        
        if (tabDistribution) {
            tabDistribution.addEventListener('click', () => {
                activeTab = 'distribution';
                render();
            });
        }
        
        if (tabOpname) {
            tabOpname.addEventListener('click', () => {
                activeTab = 'opname';
                render();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                const historyList = $('#historyList');
                if (historyList) {
                    historyList.innerHTML = activeTab === 'distribution' ? renderDistributionList() : renderOpnameList();
                    bindClickEvents();
                }
            });
        }
        
        bindClickEvents();
    }
    
    function bindClickEvents() {
        delegate(container, '.card-item', 'click', (e, el) => {
            const id = el.dataset.id;
            const type = el.dataset.type;
            
            if (type === 'distribution') {
                const distribution = distributions.find(d => d.id === id);
                if (distribution) {
                    showDistributionDetailModal(distribution);
                }
            } else if (type === 'opname') {
                const opname = opnameHistory.find(o => o.id === id);
                if (opname) {
                    showItemDetailModal(opname.itemId);
                }
            }
        });
    }
    
    render();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}