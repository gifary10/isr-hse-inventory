import { CONFIG } from './config.js';
import { API_URL } from './config.js';
import { cache } from './cache.js';
import { showToast } from './dom.js';

function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        // Nama callback unik agar tidak tabrakan jika ada request paralel
        const callbackName = '__jsonp_' + Date.now() + '_' + Math.round(Math.random() * 1e6);

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Request timeout'));
        }, 15000);

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

class ApiService {
    constructor() {
        this.isLoading = false;
    }

    async request(endpoint, data) {
        let url = `${API_URL}?action=${endpoint}`;

        if (data) {
            url += `&payload=${encodeURIComponent(JSON.stringify(data))}`;
        }

        try {
            const result = await jsonpRequest(url);

            if (!result.success) {
                throw new Error(result.error || 'Request failed');
            }

            return result;

        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            showToast(`Gagal: ${error.message}`, 'danger');
            throw error;
        }
    }

    async getItems() {
        const cached = cache.get('items');
        if (cached) return cached;

        const result = await this.request('getItems');
        const items = result.data || [];
        cache.set('items', items, CONFIG.CACHE_TTL);
        return items;
    }

    async saveStockOpname(data) {
        showToast('Menyimpan data opname...', 'info');
        const result = await this.request('saveStockOpname', data);
        if (result.success) {
            showToast('Data opname berhasil disimpan!', 'success');
            cache.delete('items');
            cache.delete('dashboard_stats');
        }
        return result;
    }

    async saveDistribution(data) {
        showToast('Menyimpan data distribusi...', 'info');
        const result = await this.request('saveDistribution', data);
        if (result.success) {
            showToast('Data distribusi berhasil disimpan!', 'success');
            cache.delete('items');
            cache.delete('dashboard_stats');
        }
        return result;
    }

    async getStockHistory() {
        const result = await this.request('getStockHistory');
        return result.data || [];
    }

    async getDistributionHistory() {
        const result = await this.request('getDistributionHistory');
        return result.data || [];
    }

    async searchEmployees(query) {
        const result = await this.request('searchEmployees', { query });
        return result.data || [];
    }

    async getDashboardStats() {
        const cached = cache.get('dashboard_stats');
        if (cached) return cached;

        const result = await this.request('getDashboardStats');
        const stats = result.data || result;
        cache.set('dashboard_stats', stats, CONFIG.CACHE_TTL);
        return stats;
    }

    async addItem(itemData) {
        showToast('Menyimpan item...', 'info');
        const result = await this.request('addItem', itemData);
        if (result.success) {
            showToast('Item berhasil ditambahkan!', 'success');
            cache.delete('items');
            cache.delete('dashboard_stats');
        }
        return result;
    }

    async updateItem(itemData) {
        showToast('Mengupdate item...', 'info');
        const result = await this.request('updateItem', itemData);
        if (result.success) {
            showToast('Item berhasil diupdate!', 'success');
            cache.delete('items');
            cache.delete('dashboard_stats');
        }
        return result;
    }

    async deleteItem(itemId) {
        showToast('Menghapus item...', 'info');
        const result = await this.request('deleteItem', { id: itemId });
        if (result.success) {
            showToast('Item berhasil dihapus!', 'success');
            cache.delete('items');
            cache.delete('dashboard_stats');
        }
        return result;
    }
}

export const apiService = new ApiService();