// ===== Optimized In-Memory Cache with LRU =====
// Hemat RAM dengan membatasi size cache

class Cache {
    constructor(ttl = 300000, maxSize = 50) { // Default 5 minutes, max 50 items
        this.cache = new Map();
        this.ttl = ttl;
        this.maxSize = maxSize;
        this.accessOrder = []; // Track access order for LRU
    }

    set(key, value, customTtl = null) {
        const ttl = customTtl || this.ttl;
        const expiry = Date.now() + ttl;

        // Jika sudah penuh, hapus item paling lama diakses (LRU)
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const oldestKey = this.accessOrder.shift();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            value,
            expiry
        });

        // Update access order
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex !== -1) {
            this.accessOrder.splice(existingIndex, 1);
        }
        this.accessOrder.push(key);
    }

    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            const index = this.accessOrder.indexOf(key);
            if (index !== -1) {
                this.accessOrder.splice(index, 1);
            }
            return null;
        }

        // Update access order (move to end = most recently used)
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex !== -1) {
            this.accessOrder.splice(existingIndex, 1);
        }
        this.accessOrder.push(key);

        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    // Clean expired items
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                const index = this.accessOrder.indexOf(key);
                if (index !== -1) {
                    this.accessOrder.splice(index, 1);
                }
            }
        }
    }

    // Get cache stats
    stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys()),
            memoryUsage: `~${Math.round(this.cache.size * 10 / 1024)} KB` // Rough estimate
        };
    }
}

// Create cache instances with different TTLs and size limits
// Increased cache duration for faster response (trade RAM for speed)
const mangaListCache = new Cache(3600000, 50); // 1 hour, max 50 items (was 30 min)
const mangaDetailCache = new Cache(7200000, 100); // 2 hours, max 100 items (was 1 hour)
const chapterListCache = new Cache(3600000, 80); // 1 hour, max 80 items (was 30 min)
const chapterPagesCache = new Cache(86400000, 100); // 24 hours, max 100 items (was 2 hours)
const searchCache = new Cache(1800000, 50); // 30 minutes, max 50 items (was 10 min)

// Auto cleanup every 15 minutes (hemat CPU)
setInterval(() => {
    mangaListCache.cleanup();
    mangaDetailCache.cleanup();
    chapterListCache.cleanup();
    chapterPagesCache.cleanup();
    searchCache.cleanup();
    console.log('✅ Cache cleanup completed');
}, 900000);

module.exports = {
    Cache,
    mangaListCache,
    mangaDetailCache,
    chapterListCache,
    chapterPagesCache,
    searchCache
};
