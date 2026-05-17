import { CONFIG } from './config.js';
import { API_URL } from './config.js';
import { cache } from './cache.js';
import { showToast } from './dom.js';

// JSONP untuk operasi READ
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = '__jsonp_' + Date.now() + '_' + Math.round(Math.random() * 1e6);
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Request timeout (30s)'));
        }, 30000);
        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }
        window[callbackName] = function(data) {
            cleanup();
            resolve(data);
        };
        const script = document.createElement('script');
        script.src = `${url}&callback=${callbackName}`;
        script.onerror = () => {
            cleanup();
            reject(new Error('Script load error — periksa URL Apps Script di config.js'));
        };
        document.head.appendChild(script);
    });
}

// POST fetch untuk operasi WRITE
async function postRequest(endpoint, payload) {
    const formData = new FormData();
    formData.append('action', endpoint);
    formData.append('payload', JSON.stringify(payload));
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        let result;
        try { result = JSON.parse(text); } catch(e) { throw new Error('Respons tidak valid dari server'); }
        if (!result.success) throw new Error(result.error || 'Request gagal');
        return result;
    } catch (error) {
        console.error(`POST Error [${endpoint}]:`, error);
        showToast(`Gagal: ${error.message}`, 'danger');
        throw error;
    }
}

class ApiService {
    constructor() {
        this.isLoading = false;
    }

    async request(endpoint, data) {
        let url = `${API_URL}?action=${endpoint}`;
        if (data) url += `&payload=${encodeURIComponent(JSON.stringify(data))}`;
        try {
            const result = await jsonpRequest(url);
            if (!result.success) throw new Error(result.error || 'Request failed');
            return result;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            showToast(`Gagal: ${error.message}`, 'danger');
            throw error;
        }
    }

    // ---- READ operations dengan cache frontend (memory + localStorage) ----
    async getItems() {
        // Coba dari memory cache dulu
        let items = cache.get('items');
        if (items) return items;
        
        // Coba dari localStorage (persistent)
        const stored = localStorage.getItem('isr_items');
        const storedTime = localStorage.getItem('isr_items_time');
        if (stored && storedTime && (Date.now() - parseInt(storedTime)) < CONFIG.CACHE_TTL.ITEMS) {
            items = JSON.parse(stored);
            cache.set('items', items, CONFIG.CACHE_TTL.ITEMS);
            return items;
        }
        
        // Fetch dari server
        const result = await this.request('getItems');
        items = result.data || [];
        cache.set('items', items, CONFIG.CACHE_TTL.ITEMS);
        localStorage.setItem('isr_items', JSON.stringify(items));
        localStorage.setItem('isr_items_time', Date.now().toString());
        return items;
    }

    async getStockHistory() {
        const cached = cache.get('stock_history');
        if (cached) return cached;
        const result = await this.request('getStockHistory');
        const data = result.data || [];
        cache.set('stock_history', data, CONFIG.CACHE_TTL.HISTORY);
        return data;
    }

    async getDistributionHistory() {
        const cached = cache.get('distribution_history');
        if (cached) return cached;
        const result = await this.request('getDistributionHistory');
        const data = result.data || [];
        cache.set('distribution_history', data, CONFIG.CACHE_TTL.HISTORY);
        return data;
    }

    async searchEmployees(query) {
        const cacheKey = `employees_${query || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;
        const result = await this.request('searchEmployees', { query });
        const data = result.data || [];
        cache.set(cacheKey, data, CONFIG.CACHE_TTL.EMPLOYEES);
        return data;
    }

    async getDashboardStats() {
        let stats = cache.get('dashboard_stats');
        if (stats) return stats;
        const result = await this.request('getDashboardStats');
        stats = result.data || result;
        cache.set('dashboard_stats', stats, CONFIG.CACHE_TTL.DASHBOARD);
        return stats;
    }

    // ---- WRITE operations (hapus cache frontend & localStorage) ----
    async saveStockOpname(data) {
        showToast('Menyimpan data opname...', 'info');
        const result = await postRequest('saveStockOpname', data);
        if (result.success) {
            showToast('Data opname berhasil disimpan!', 'success');
            this.clearCache();
        }
        return result;
    }

    async saveDistribution(data) {
        showToast('Menyimpan data distribusi...', 'info');
        const result = await postRequest('saveDistribution', data);
        if (result.success) {
            showToast('Data distribusi berhasil disimpan!', 'success');
            this.clearCache();
        }
        return result;
    }

    async addItem(itemData) {
        showToast('Menyimpan item...', 'info');
        const result = await postRequest('addItem', itemData);
        if (result.success) {
            showToast('Item berhasil ditambahkan!', 'success');
            this.clearCache();
        }
        return result;
    }

    async updateItem(itemData) {
        showToast('Mengupdate item...', 'info');
        const result = await postRequest('updateItem', itemData);
        if (result.success) {
            showToast('Item berhasil diupdate!', 'success');
            this.clearCache();
        }
        return result;
    }

    async deleteItem(itemId) {
        showToast('Menghapus item...', 'info');
        const result = await postRequest('deleteItem', { id: itemId });
        if (result.success) {
            showToast('Item berhasil dihapus!', 'success');
            this.clearCache();
        }
        return result;
    }

    async uploadSignature(data) {
        try {
            const formData = new FormData();
            formData.append('action', 'uploadSignature');
            formData.append('payload', JSON.stringify(data));
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                redirect: 'follow'
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const text = await response.text();
            let result;
            try { result = JSON.parse(text); } catch(e) { throw new Error('Response tidak valid: ' + text.slice(0, 120)); }
            if (!result.success) throw new Error(result.error || 'Upload gagal');
            return result;
        } catch (error) {
            console.error('API Error [uploadSignature]:', error);
            showToast('Gagal upload signature: ' + error.message, 'error');
            throw error;
        }
    }

    clearCache() {
        cache.clear();
        // Hapus localStorage items (opsional, biarkan agar tetap ada sampai expired)
        localStorage.removeItem('isr_items');
        localStorage.removeItem('isr_items_time');
        // Hapus juga employees cache
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('isr_employees_')) localStorage.removeItem(key);
        });
    }
}

export const apiService = new ApiService();