import { getEmployees, saveEmployee, deleteEmployee } from '../services.js';
import { showToast } from '../utils/helpers.js';
import { $, delegate } from '../utils/dom.js';
import { showEmployeeModal, showConfirmDialog } from '../components.js';

export function renderEmployees(container) {
    let employees = getEmployees();
    let searchTerm = '';
    
    function renderList() {
        let filtered = [...employees];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                e.nama.toLowerCase().includes(term) || 
                e.departemen.toLowerCase().includes(term) ||
                e.jabatan.toLowerCase().includes(term)
            );
        }
        
        if (filtered.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi bi-people"></i>
                    <h5>Tidak ada karyawan</h5>
                    <p>Tekan tombol + untuk menambah karyawan</p>
                </div>
            `;
        }
        
        return filtered.map(emp => `
            <div class="card-item clickable" data-id="${emp.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${escapeHtml(emp.nama)}</div>
                        <div class="text-small text-muted">
                            <i class="bi bi-building"></i> ${escapeHtml(emp.departemen)} • 
                            <i class="bi bi-briefcase-fill"></i> ${escapeHtml(emp.jabatan)}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger delete-employee" data-id="${emp.id}">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function render() {
        const html = `
            <div class="mb-3">
                <div class="search-box">
                    <i class="bi bi-search"></i>
                    <input type="text" class="form-control" id="searchEmployee" placeholder="Cari karyawan...">
                </div>
            </div>
            <div id="employeesList">
                ${renderList()}
            </div>
        `;
        
        container.innerHTML = html;
        
        const searchInput = $('#searchEmployee');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value;
                const employeesList = $('#employeesList');
                if (employeesList) employeesList.innerHTML = renderList();
                bindDeleteEvents();
                bindCardEvents();
            });
        }
        
        bindDeleteEvents();
        bindCardEvents();
    }
    
    function bindDeleteEvents() {
        delegate(container, '.delete-employee', 'click', async (e, el) => {
            e.stopPropagation();
            const id = el.dataset.id;
            const employee = employees.find(e => e.id === id);
            if (await showConfirmDialog(`Hapus karyawan "${employee?.nama}"?`, 'Data histori akan tetap tersimpan')) {
                el.disabled = true;
                el.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                try {
                    await deleteEmployee(id);
                    employees = getEmployees();
                    render();
                    showToast('Karyawan berhasil dihapus', 'success');
                } catch (err) {
                    showToast('Gagal menghapus: ' + err.message, 'danger');
                    el.disabled = false;
                    el.innerHTML = '<i class="bi bi-trash3"></i>';
                }
            }
        });
    }
    
    function bindCardEvents() {
        delegate(container, '.card-item', 'click', (e, el) => {
            const id = el.dataset.id;
            if (id && !e.target.closest('.delete-employee')) {
                showEmployeeModal(id);
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