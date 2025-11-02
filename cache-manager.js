// ===== Incremental Cache Manager =====
// Manages manga data cache with efficient incremental storage

const CacheManager = {
    CACHE_PREFIX: 'manga_cache_',
    CACHE_INDEX_KEY: 'manga_cache_index',
    CACHE_BATCH_SIZE: 8, // Reduced from 15 to 8 to avoid quota issues
    CACHE_TTL: 12 * 60 * 60 * 1000, // Reduced from 24 to 12 hours

    // Initialize cache index
    initIndex() {
        const index = this.getIndex();
        if (!index) {
            this.saveIndex({
                batches: [],
                totalItems: 0,
                lastUpdated: Date.now()
            });
        }
        return this.getIndex();
    },

    // Get cache index
    getIndex() {
        try {
            const data = localStorage.getItem(this.CACHE_INDEX_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[CacheManager] Error reading index:', error);
            return null;
        }
    },

    // Save cache index
    saveIndex(index) {
        try {
            localStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
        } catch (error) {
            console.error('[CacheManager] Error saving index:', error);
        }
    },

    // Generate batch key
    getBatchKey(batchId) {
        return `${this.CACHE_PREFIX}batch_${batchId}`;
    },

    // Save manga batch to cache
    saveBatch(mangaList, source, page) {
        if (!Array.isArray(mangaList) || mangaList.length === 0) return;

        // Limit batch size to prevent quota issues
        const limitedMangaList = mangaList.slice(0, this.CACHE_BATCH_SIZE);
        
        const index = this.initIndex();
        const batchId = `${source}_p${page}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const batchKey = this.getBatchKey(batchId);

        try {
            // Store batch data
            const batchData = {
                id: batchId,
                source,
                page,
                items: limitedMangaList,
                timestamp: Date.now(),
                count: limitedMangaList.length
            };

            localStorage.setItem(batchKey, JSON.stringify(batchData));

            // Update index
            index.batches.push({
                id: batchId,
                key: batchKey,
                source,
                page,
                count: limitedMangaList.length,
                timestamp: Date.now()
            });
            index.totalItems += limitedMangaList.length;
            index.lastUpdated = Date.now();

            this.saveIndex(index);

            console.log(`[CacheManager] Saved batch ${batchId}: ${limitedMangaList.length} items`);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('[CacheManager] Storage quota exceeded, cleaning old cache...');
                this.cleanOldCache();
                // Retry once after cleaning
                try {
                    localStorage.setItem(batchKey, JSON.stringify({
                        id: batchId,
                        source,
                        page,
                        items: limitedMangaList,
                        timestamp: Date.now(),
                        count: limitedMangaList.length
                    }));
                    return true;
                } catch (retryError) {
                    console.error('[CacheManager] Failed to save batch after cleanup:', retryError);
                }
            }
            console.error('[CacheManager] Error saving batch:', error);
            return false;
        }
    },

    // Get all cached manga
    getAllCached(source = null, maxAge = null) {
        const index = this.getIndex();
        if (!index) return [];

        const now = Date.now();
        const maxAgeMs = maxAge || this.CACHE_TTL;
        let allManga = [];
        const seenIds = new Set();

        // Filter batches by source and age
        let validBatches = index.batches.filter(batch => {
            const isValid = (now - batch.timestamp) < maxAgeMs;
            const matchesSource = !source || batch.source === source || source === 'all';
            return isValid && matchesSource;
        });

        // Limit to most recent batches to avoid loading too much data
        validBatches = validBatches
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50); // Only load the 50 most recent batches

        // Load manga from valid batches
        for (const batchInfo of validBatches) {
            try {
                const batchData = localStorage.getItem(batchInfo.key);
                if (!batchData) continue;

                const batch = JSON.parse(batchData);
                if (Array.isArray(batch.items)) {
                    batch.items.forEach(manga => {
                        const uniqueKey = `${manga.source}-${manga.id}`;
                        if (manga.id && !seenIds.has(uniqueKey)) {
                            seenIds.add(uniqueKey);
                            allManga.push(manga);
                        }
                    });
                }
            } catch (error) {
                console.error(`[CacheManager] Error reading batch ${batchInfo.id}:`, error);
                // Remove corrupted batch
                try {
                    localStorage.removeItem(batchInfo.key);
                } catch (removeError) {
                    console.error(`[CacheManager] Error removing corrupted batch ${batchInfo.id}:`, removeError);
                }
            }
        }

        console.log(`[CacheManager] Loaded ${allManga.length} cached manga`);
        return allManga;
    },

    // Clean old cache entries
    cleanOldCache() {
        const index = this.getIndex();
        if (!index) return;

        const now = Date.now();
        let cleaned = 0;

        // Remove expired batches
        const validBatches = index.batches.filter(batch => {
            const isExpired = (now - batch.timestamp) > this.CACHE_TTL;
            if (isExpired) {
                try {
                    localStorage.removeItem(batch.key);
                    cleaned++;
                    return false;
                } catch (error) {
                    console.error(`[CacheManager] Error removing batch ${batch.id}:`, error);
                }
            }
            return true;
        });

        // If we still have too many batches, remove oldest ones
        const MAX_BATCHES = 100;
        if (validBatches.length > MAX_BATCHES) {
            // Sort by timestamp (oldest first)
            validBatches.sort((a, b) => a.timestamp - b.timestamp);
            // Remove oldest batches
            const batchesToRemove = validBatches.length - MAX_BATCHES;
            for (let i = 0; i < batchesToRemove; i++) {
                try {
                    localStorage.removeItem(validBatches[i].key);
                    cleaned++;
                } catch (error) {
                    console.error(`[CacheManager] Error removing old batch ${validBatches[i].id}:`, error);
                }
            }
            // Keep only the newest batches
            const remainingBatches = validBatches.slice(batchesToRemove);
            index.batches = remainingBatches;
        } else {
            index.batches = validBatches;
        }

        index.totalItems = index.batches.reduce((sum, b) => sum + (b.count || 0), 0);
        this.saveIndex(index);

        console.log(`[CacheManager] Cleaned ${cleaned} expired/old batches`);
        return cleaned;
    },

    // Clear all cache
    clearAll() {
        const index = this.getIndex();
        if (!index) return;

        let cleared = 0;
        for (const batch of index.batches) {
            try {
                localStorage.removeItem(batch.key);
                cleared++;
            } catch (error) {
                console.error(`[CacheManager] Error clearing batch ${batch.id}:`, error);
            }
        }

        localStorage.removeItem(this.CACHE_INDEX_KEY);
        console.log(`[CacheManager] Cleared ${cleared} batches`);
        return cleared;
    },

    // Get cache statistics
    getStats() {
        const index = this.getIndex();
        if (!index) return null;

        const now = Date.now();
        const validBatches = index.batches.filter(b => (now - b.timestamp) < this.CACHE_TTL);

        return {
            totalBatches: index.batches.length,
            validBatches: validBatches.length,
            totalItems: index.totalItems,
            lastUpdated: new Date(index.lastUpdated).toLocaleString(),
            sources: [...new Set(index.batches.map(b => b.source))],
            oldestBatch: index.batches.length > 0 ?
                new Date(Math.min(...index.batches.map(b => b.timestamp))).toLocaleString() : 'N/A',
            newestBatch: index.batches.length > 0 ?
                new Date(Math.max(...index.batches.map(b => b.timestamp))).toLocaleString() : 'N/A'
        };
    },

    // Process and cache manga in batches
    async processMangaBatch(mangaArray, source, page) {
        if (!Array.isArray(mangaArray) || mangaArray.length === 0) return;

        // Split into small batches of 8 items to avoid quota issues
        const batches = [];
        for (let i = 0; i < mangaArray.length; i += this.CACHE_BATCH_SIZE) {
            batches.push(mangaArray.slice(i, i + this.CACHE_BATCH_SIZE));
        }

        // Save each batch
        for (let i = 0; i < batches.length; i++) {
            this.saveBatch(batches[i], source, `${page}_${i + 1}`);
        }

        console.log(`[CacheManager] Processed ${mangaArray.length} manga into ${batches.length} batches`);
    }
};

// Auto-clean expired cache on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        CacheManager.cleanOldCache();
        const stats = CacheManager.getStats();
        if (stats) {
            console.log('[CacheManager] Cache stats:', stats);
        }
    });
}

// Expose globally
window.CacheManager = CacheManager;

// ===== Chapter Cache Manager =====
// Manages chapter data cache for individual manga
const ChapterCacheManager = {
    CACHE_PREFIX: 'chapter_cache_',
    CACHE_INDEX_KEY: 'chapter_cache_index',
    CACHE_TTL: 3 * 60 * 60 * 1000, // Reduced from 6 to 3 hours

    // Generate cache key for manga chapters
    getChapterKey(mangaId, source) {
        return `${this.CACHE_PREFIX}${source}_${mangaId}`;
    },

    // Save chapters for a specific manga
    saveChapters(mangaId, source, chapters) {
        if (!Array.isArray(chapters) || chapters.length === 0) return false;

        // Limit chapters to prevent quota issues
        const limitedChapters = chapters.slice(0, 100); // Limit to 100 chapters per manga
        
        const key = this.getChapterKey(mangaId, source);

        try {
            const cacheData = {
                mangaId,
                source,
                chapters: limitedChapters,
                timestamp: Date.now(),
                count: limitedChapters.length
            };

            localStorage.setItem(key, JSON.stringify(cacheData));
            this.updateIndex(mangaId, source, key, limitedChapters.length);

            console.log(`[ChapterCache] Saved ${limitedChapters.length} chapters for ${source}:${mangaId}`);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('[ChapterCache] Storage quota exceeded, cleaning old cache...');
                this.cleanOldCache();
                // Retry once
                try {
                    localStorage.setItem(key, JSON.stringify({
                        mangaId,
                        source,
                        chapters: limitedChapters,
                        timestamp: Date.now(),
                        count: limitedChapters.length
                    }));
                    return true;
                } catch (retryError) {
                    console.error('[ChapterCache] Failed after cleanup:', retryError);
                }
            }
            console.error('[ChapterCache] Error saving chapters:', error);
            return false;
        }
    },

    // Get cached chapters for a manga from all sources
    getChapters(mangaId, maxAge = null) {
        const now = Date.now();
        const maxAgeMs = maxAge || this.CACHE_TTL;
        const allChapters = [];
        const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];

        for (const source of sources) {
            const key = this.getChapterKey(mangaId, source);
            try {
                const data = localStorage.getItem(key);
                if (!data) continue;

                const cached = JSON.parse(data);
                const age = now - cached.timestamp;

                if (age < maxAgeMs && Array.isArray(cached.chapters)) {
                    // Add source info to each chapter if not present
                    const chaptersWithSource = cached.chapters.map(ch => ({
                        ...ch,
                        source: ch.source || source
                    }));
                    allChapters.push(...chaptersWithSource);
                }
            } catch (error) {
                console.error(`[ChapterCache] Error reading ${key}:`, error);
                // Remove corrupted cache
                try {
                    localStorage.removeItem(key);
                } catch (removeError) {
                    console.error(`[ChapterCache] Error removing corrupted cache ${key}:`, removeError);
                }
            }
        }

        console.log(`[ChapterCache] Loaded ${allChapters.length} cached chapters for ${mangaId}`);
        return allChapters;
    },

    // Update index
    updateIndex(mangaId, source, key, count) {
        try {
            const indexData = localStorage.getItem(this.CACHE_INDEX_KEY);
            const index = indexData ? JSON.parse(indexData) : { entries: [] };

            // Remove old entry if exists
            index.entries = index.entries.filter(e => e.key !== key);

            // Add new entry
            index.entries.push({
                key,
                mangaId,
                source,
                count,
                timestamp: Date.now()
            });

            localStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
        } catch (error) {
            console.error('[ChapterCache] Error updating index:', error);
        }
    },

    // Clean old cache
    cleanOldCache() {
        try {
            const indexData = localStorage.getItem(this.CACHE_INDEX_KEY);
            if (!indexData) return 0;

            const index = JSON.parse(indexData);
            const now = Date.now();
            let cleaned = 0;

            // Limit to most recent entries to prevent excessive storage
            const MAX_ENTRIES = 50;
            if (index.entries.length > MAX_ENTRIES) {
                // Sort by timestamp (oldest first)
                index.entries.sort((a, b) => a.timestamp - b.timestamp);
                // Remove oldest entries
                const entriesToRemove = index.entries.length - MAX_ENTRIES;
                for (let i = 0; i < entriesToRemove; i++) {
                    try {
                        localStorage.removeItem(index.entries[i].key);
                        cleaned++;
                    } catch (error) {
                        console.error(`[ChapterCache] Error removing old entry ${index.entries[i].key}:`, error);
                    }
                }
                // Keep only the newest entries
                index.entries = index.entries.slice(entriesToRemove);
            }

            // Remove expired entries
            const validEntries = index.entries.filter(entry => {
                const isExpired = (now - entry.timestamp) > this.CACHE_TTL;
                if (isExpired) {
                    try {
                        localStorage.removeItem(entry.key);
                        cleaned++;
                        return false;
                    } catch (error) {
                        console.error(`[ChapterCache] Error removing ${entry.key}:`, error);
                    }
                }
                return true;
            });

            index.entries = validEntries;
            localStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));

            console.log(`[ChapterCache] Cleaned ${cleaned} expired/old entries`);
            return cleaned;
        } catch (error) {
            console.error('[ChapterCache] Error cleaning cache:', error);
            return 0;
        }
    },

    // Clear all chapter cache
    clearAll() {
        try {
            const indexData = localStorage.getItem(this.CACHE_INDEX_KEY);
            if (!indexData) return 0;

            const index = JSON.parse(indexData);
            let cleared = 0;

            for (const entry of index.entries) {
                try {
                    localStorage.removeItem(entry.key);
                    cleared++;
                } catch (error) {
                    console.error(`[ChapterCache] Error clearing ${entry.key}:`, error);
                }
            }

            localStorage.removeItem(this.CACHE_INDEX_KEY);
            console.log(`[ChapterCache] Cleared ${cleared} entries`);
            return cleared;
        } catch (error) {
            console.error('[ChapterCache] Error clearing all:', error);
            return 0;
        }
    }
};

// Auto-clean on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        ChapterCacheManager.cleanOldCache();
    });
}

// Expose globally
window.ChapterCacheManager = ChapterCacheManager;