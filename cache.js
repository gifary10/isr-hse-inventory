class CacheManager {
    constructor() {
        this.cache = new Map();
    }

    get(key) {
        var item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    set(key, value, ttl) {
        this.cache.set(key, {
            value: value,
            expiry: Date.now() + ttl
        });
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        return this.cache.has(key);
    }
}

export var cache = new CacheManager();