const fs = require('fs').promises;
const path = require('path');
const {
    applyMangaFilters,
    applyMangaSort,
    calculateTotalPages,
    normalizeTag,
    DEFAULT_PAGE_SIZE
} = require('./mangaHelpers');

const METADATA_DIR = path.join(__dirname, '..', 'cache', 'metadata');
const DETAILS_FILE = path.join(METADATA_DIR, 'metadata_details.json');

const DEFAULT_REFRESH_PAGES = 20; // Increased from 8 to 20 pages
const DEFAULT_REFRESH_LIMIT = 100; // Increased from 60 to 100 per page
const DEFAULT_REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes (increased from 30)
const DEFAULT_STALE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 15)
const MAX_STORE_SIZE = 5000; // Increased from 1000 to 5000 items

function sanitizeGenres(genres) {
    if (!Array.isArray(genres)) return [];
    const seen = new Set();
    const result = [];

    genres.forEach(genre => {
        const trimmed = (genre || '').toString().trim();
        if (!trimmed) return;
        const normalized = normalizeTag(trimmed);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(trimmed);
        }
    });

    return result;
}

function determineLanguage(source, entry) {
    if (!entry) return source === 'mangadex' ? 'en' : 'id';
    if (entry.language) return String(entry.language).toLowerCase();
    if (entry.lang) return String(entry.lang).toLowerCase();
    if (Array.isArray(entry.languages) && entry.languages.length) {
        return String(entry.languages[0]).toLowerCase();
    }
    if (source === 'mangadex') return 'en';
    return 'id';
}

function determineLanguages(source, entry) {
    if (entry && Array.isArray(entry.languages) && entry.languages.length) {
        return entry.languages.map(item => String(item).toLowerCase());
    }

    const primary = determineLanguage(source, entry);
    return [primary];
}

function determineUpdatedAt(entry) {
    if (!entry) return new Date().toISOString();

    const candidates = [
        entry.updatedAt,
        entry.lastUpdated,
        entry.date,
        entry.publishedAt,
        entry.createdAt,
        entry.savedAt,
        entry.uploadedAt
    ].filter(Boolean);

    if (candidates.length === 0) {
        return new Date().toISOString();
    }

    const valid = candidates.find(value => {
        const date = new Date(value);
        return !Number.isNaN(date.getTime());
    });

    return valid || new Date().toISOString();
}

function sanitizeEntry(entry, source) {
    if (!entry) return null;

    const id = entry.id || entry.slug || entry.slugId || entry.mangaId;
    if (!id) return null;

    return {
        id: String(id),
        source,
        title: entry.title || entry.name || 'Unknown',
        cover: entry.cover || entry.coverFull || entry.image || '',
        coverFull: entry.coverFull || entry.cover || '',
        rating: entry.rating || entry.score || '8.0',
        latestChapter: entry.latestChapter || entry.lastChapter || entry.chapter || null,
        status: entry.status || 'Unknown',
        type: entry.type || entry.format || 'Manga',
        genres: sanitizeGenres(entry.genres || entry.tags || []),
        url: entry.url || '',
        description: entry.description || '',
        isNew: Boolean(entry.isNew),
        updatedAt: determineUpdatedAt(entry),
        lastFetched: new Date().toISOString(),
        language: determineLanguage(source, entry),
        languages: determineLanguages(source, entry)
    };
}

function sanitizeDetail(detail, source) {
    if (!detail) return null;
    const id = detail.id || detail.slug || detail.mangaId;
    if (!id) return null;

    return {
        ...detail,
        id: String(id),
        source,
        savedAt: new Date().toISOString()
    };
}

class MetadataStore {
    constructor() {
        this.sources = new Set();
        this.listStore = new Map(); // source -> array of entries
        this.listMeta = new Map(); // source -> { updatedAt, totalItems }
        this.detailStore = new Map(); // `${source}::${id}` -> detail
        this.scrapers = {};
        this.refreshing = new Map();
        this.intervalHandle = null;
        this.initialized = false;
    }

    async ensureDir() {
        await fs.mkdir(METADATA_DIR, { recursive: true });
    }

    registerScrapers(scrapers = {}) {
        this.scrapers = scrapers;
        Object.keys(scrapers).forEach(source => this.sources.add(source));
    }

    async initialize(sources = []) {
        try {
            await this.ensureDir();
            const mergedSources = new Set([
                ...Array.from(this.sources),
                ...sources
            ]);

            for (const source of mergedSources) {
                await this.loadSourceFromDisk(source);
                this.sources.add(source);
            }

            await this.loadDetailsFromDisk();
            this.initialized = true;
        } catch (error) {
            console.error('[MetadataStore] Failed to initialize:', error.message);
        }
    }

    async loadSourceFromDisk(source) {
        try {
            const filepath = path.join(METADATA_DIR, `metadata_${source}.json`);
            const data = await fs.readFile(filepath, 'utf8');
            const parsed = JSON.parse(data);

            const items = Array.isArray(parsed.items) ? parsed.items : [];
            this.listStore.set(source, items);
            this.listMeta.set(source, {
                updatedAt: parsed.updatedAt || 0,
                totalItems: items.length
            });
        } catch {
            this.listStore.set(source, []);
            this.listMeta.set(source, {
                updatedAt: 0,
                totalItems: 0
            });
        }
    }

    async loadDetailsFromDisk() {
        try {
            const data = await fs.readFile(DETAILS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            Object.entries(parsed).forEach(([key, value]) => {
                this.detailStore.set(key, value);
            });
        } catch {
            this.detailStore.clear();
        }
    }

    async saveSourceToDisk(source) {
        const items = this.listStore.get(source) || [];
        const payload = {
            source,
            updatedAt: Date.now(),
            items
        };
        const filepath = path.join(METADATA_DIR, `metadata_${source}.json`);
        await fs.writeFile(filepath, JSON.stringify(payload, null, 2));
    }

    async saveDetailsToDisk() {
        const serialized = {};
        for (const [key, value] of this.detailStore.entries()) {
            serialized[key] = value;
        }
        await fs.writeFile(DETAILS_FILE, JSON.stringify(serialized, null, 2));
    }

    getSourceData(source) {
        return this.listStore.get(source) || [];
    }

    isStale(source, ttl = DEFAULT_STALE_TTL) {
        const meta = this.listMeta.get(source);
        if (!meta || !meta.updatedAt) return true;
        return Date.now() - meta.updatedAt > ttl;
    }

    async upsertList(source, entries = [], options = {}) {
        if (!source || !Array.isArray(entries)) return;

        const sanitized = entries
            .map(entry => sanitizeEntry(entry, source))
            .filter(Boolean);

        if (!sanitized.length) return;

        const existing = this.getSourceData(source);
        const map = new Map(existing.map(item => [item.id, item]));

        sanitized.forEach(item => {
            const previous = map.get(item.id) || {};
            map.set(item.id, {
                ...previous,
                ...item
            });
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => {
            const aTime = new Date(a.lastFetched || a.updatedAt || 0).getTime();
            const bTime = new Date(b.lastFetched || b.updatedAt || 0).getTime();
            return bTime - aTime;
        });

        const limited = merged.slice(0, options.maxSize || MAX_STORE_SIZE);

        this.listStore.set(source, limited);
        this.listMeta.set(source, {
            updatedAt: Date.now(),
            totalItems: limited.length
        });

        await this.saveSourceToDisk(source);
    }

    async ingestCombinedList(entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) return;

        const grouped = new Map();

        entries.forEach(item => {
            if (!item || !item.source) return;
            if (!grouped.has(item.source)) {
                grouped.set(item.source, []);
            }
            grouped.get(item.source).push(item);
        });

        for (const [source, items] of grouped.entries()) {
            await this.upsertList(source, items);
        }
    }

    getStoredList(source = 'all') {
        if (source === 'all') {
            let combined = [];
            for (const src of this.sources) {
                const data = this.getSourceData(src);
                if (data.length) {
                    combined = combined.concat(data.map(item => ({ ...item })));
                }
            }
            return combined;
        }

        const data = this.getSourceData(source);
        return data.map(item => ({ ...item }));
    }

    async getMangaList(params = {}) {
        const {
            source = 'all',
            genre = 'all',
            status = 'all',
            type = 'all',
            language = 'all',
            sort = 'latest',
            page = 1,
            limit = DEFAULT_PAGE_SIZE
        } = params;

        const targetSources = source === 'all'
            ? Array.from(this.sources)
            : [source];

        let combined = [];
        let hasData = false;

        for (const src of targetSources) {
            const data = this.getSourceData(src);
            if (data.length) {
                combined = combined.concat(data);
                hasData = true;
            }

            if (this.isStale(src) && this.scrapers[src]) {
                this.requestRefresh(src).catch(() => {});
            }
        }

        if (!hasData) {
            targetSources.forEach(src => {
                if (this.scrapers[src]) {
                    this.requestRefresh(src).catch(() => {});
                }
            });

            return {
                items: [],
                totalItems: 0,
                totalPages: 1,
                cacheType: 'metadata',
                hasData: false
            };
        }

        const filtered = applyMangaFilters(combined, {
            genre,
            status,
            type,
            language
        });

        const sortedList = applyMangaSort(filtered, sort);
        const totalItems = sortedList.length;
        const totalPages = calculateTotalPages(sortedList, limit);
        const start = Math.max(0, (page - 1) * limit);
        const items = sortedList.slice(start, start + limit);

        return {
            items,
            totalItems,
            totalPages,
            cacheType: 'metadata',
            hasData: items.length > 0
        };
    }

    async getMangaDetail(source, id) {
        if (!source || !id) return null;
        const key = `${source}::${id}`;
        return this.detailStore.get(key) || null;
    }

    async saveMangaDetail(source, detail) {
        const sanitized = sanitizeDetail(detail, source);
        if (!sanitized) return null;

        const key = `${source}::${sanitized.id}`;
        this.detailStore.set(key, sanitized);
        await this.saveDetailsToDisk();
        return sanitized;
    }

    requestRefresh(source, options = {}) {
        if (!source || !this.scrapers[source]) return Promise.resolve();
        if (this.refreshing.has(source)) {
            return this.refreshing.get(source);
        }

        const promise = this.refreshSource(source, options)
            .catch(error => {
                console.error(
                    `[MetadataStore] Refresh ${source} failed:`,
                    error && error.message ? error.message : error
                );
            })
            .finally(() => {
                this.refreshing.delete(source);
            });

        this.refreshing.set(source, promise);
        return promise;
    }

    async refreshSource(source, options = {}) {
        if (!source || !this.scrapers[source]) return;

        const scraper = this.scrapers[source];
        const pages = options.pages || DEFAULT_REFRESH_PAGES;
        const limit = options.limit || DEFAULT_REFRESH_LIMIT;

        const aggregated = [];

        if (source === 'mangadex') {
            const languageTargets = Array.isArray(options.languages) && options.languages.length
                ? options.languages
                : ['en', 'id'];

            for (const langCode of languageTargets) {
                for (let page = 1; page <= pages; page++) {
                    try {
                        const params = {
                            limit,
                            offset: (page - 1) * limit,
                            order: { latestUploadedChapter: 'desc' }
                        };

                        if (langCode && langCode !== 'all') {
                            params.availableTranslatedLanguage = [langCode];
                        }

                        const result = await scraper.getMangaList(params);
                        if (!Array.isArray(result) || result.length === 0) {
                            break;
                        }

                        aggregated.push(...result);

                        if (result.length < limit) {
                            break;
                        }
                    } catch (error) {
                        console.warn(`[MetadataStore] Failed to refresh ${source} (${langCode}) page ${page}:`, error.message);
                        break;
                    }
                }
            }
        } else {
            for (let page = 1; page <= pages; page++) {
                try {
                    const result = await scraper.getMangaList(page);
                    if (!Array.isArray(result) || result.length === 0) {
                        break;
                    }

                    aggregated.push(...result);
                } catch (error) {
                    console.warn(`[MetadataStore] Failed to refresh ${source} page ${page}:`, error.message);
                    break;
                }
            }
        }

        if (aggregated.length) {
            await this.upsertList(source, aggregated, options);
        }
    }

    async refreshAll(options = {}) {
        for (const source of this.sources) {
            await this.requestRefresh(source, options);
        }
    }

    scheduleAutoRefresh(options = {}) {
        const interval = options.interval || DEFAULT_REFRESH_INTERVAL;

        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
        }

        this.intervalHandle = setInterval(() => {
            this.refreshAll(options).catch(error => {
                console.error('[MetadataStore] Auto refresh error:', error.message);
            });
        }, interval);

        // Trigger initial refresh asynchronously
        this.refreshAll(options).catch(error => {
            console.error('[MetadataStore] Initial refresh error:', error.message);
        });
    }
}

const metadataStore = new MetadataStore();

module.exports = {
    metadataStore
};
