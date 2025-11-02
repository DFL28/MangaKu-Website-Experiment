// ===== Manga API Server with Real Scraping =====
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const CSRF = require('csrf');

// Import scrapers
const mangadex = require('./scrapers/mangadex');
const komiku = require('./scrapers/komiku');
const maid = require('./scrapers/maid-direct'); // Using direct scraper
const bacamanga = require('./scrapers/bacamanga');
const kiryuu = require('./scrapers/kiryuu'); // Kiryuu scraper
const jikan = require('./scrapers/jikan'); // Jikan API (MyAnimeList)
const { metadataStore } = require('./utils/metadataStore');
const { applyMangaFilters, applyMangaSort, calculateTotalPages, DEFAULT_PAGE_SIZE } = require('./utils/mangaHelpers');

const SCRAPERS = {
    mangadex,
    komiku,
    maid,
    bacamanga,
    kiryuu,
    jikan
    // westmanga is disabled due to connection issues
};

// Update the SCRAPER_SOURCES to ensure all scrapers are included
const SCRAPER_SOURCES = Object.keys(SCRAPERS);
const DISABLED_SOURCES = new Set(['westmanga']);

metadataStore.registerScrapers(SCRAPERS);
metadataStore.initialize(SCRAPER_SOURCES).then(async () => {
    console.log('[MetadataStore] Initialized successfully');

    // Start aggressive initial refresh to collect hundreds of manga
    console.log('[MetadataStore] Starting aggressive data collection...');
    await metadataStore.refreshAll({
        pages: 20,  // 20 pages per source
        limit: 100  // 100 items per page
    });
    console.log('[MetadataStore] Initial data collection complete');

    // Schedule auto-refresh every hour
    metadataStore.scheduleAutoRefresh({
        pages: 10,  // Lighter refresh (10 pages)
        limit: 100,
        interval: 60 * 60 * 1000 // Every hour
    });
    console.log('[MetadataStore] Auto-refresh scheduled (every 60 minutes)');
}).catch(error => {
    console.error('[MetadataStore] Initialization error:', error.message);
});

// Import utilities
const {
    mangaListCache,
    mangaDetailCache,
    chapterListCache,
    chapterPagesCache,
    searchCache
} = require('./utils/cache');

// Import file cache utility
const { saveToFileCache, loadFromFileCache, hasValidFileCache, clearFileCache, getFileCacheStats } = require('./utils/fileCache');

const {
    mangadexLimiter,
    komikuLimiter,
    maidLimiter,
    bacamangaLimiter,
    globalLimiter
} = require('./utils/rateLimiter');

// Import proxy manager
const { proxyManager } = require('./utils/proxyManager');

// Import ProxyScrape client
const { initProxyScrape } = require('./utils/proxyScrapeClient');

const jwt = require('jsonwebtoken');

const app = express();
const csrf = new CSRF();

// In-memory store for CSRF tokens (in production, use Redis)
const csrfTokens = new Map();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 untuk public, localhost untuk lokal
const PUBLIC_IP = process.env.PUBLIC_IP || '47.236.90.253';
const JWT_SECRET = 'your_jwt_secret'; // In a real app, use an environment variable

// In-memory user store (replace with a database in a real app)
const users = [];

// Initialize with admin user (hashed password)
(async () => {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    users.push({ 
        username: 'admin', 
        password: hashedPassword, 
        role: 'admin' 
    });
    console.log('[Auth] Admin user initialized with hashed password');
})();

// Simple in-memory store for login attempts (in production, use Redis)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// In-memory store for active sessions (in production, use Redis)
const activeSessions = new Map();

// ===== Security Middleware =====
app.use((req, res, next) => {
    // Prevent XSS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    
    // Hide Express server information
    res.setHeader('X-Powered-By', 'MangaKu Server');
    
    next();
});

// Update active sessions on each request
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                activeSessions.set(decoded.username, {
                    lastActive: Date.now(),
                    role: decoded.role
                });
            } catch (err) {
                // Invalid token, ignore
            }
        }
    }
    next();
});

// Middleware
app.use(cors());
app.use(compression()); // Enable gzip compression for faster response
app.use(express.json());

// Disable cache for JavaScript files
app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

app.use(express.static('.')); // Serve static files

// ===== Helper Functions =====

function getSourceScraper(source) {
    return SCRAPERS[source] || null;
}

function isSourceDisabled(source) {
    if (!source) return false;
    return DISABLED_SOURCES.has(source);
}

function getSourceLimiter(source) {
    const limiters = {
        mangadex: mangadexLimiter,
        komiku: komikuLimiter,
        maid: maidLimiter,
        bacamanga: bacamangaLimiter
    };
    return limiters[source] || globalLimiter;
}

async function applyRateLimit(source) {
    const limiter = getSourceLimiter(source);
    await limiter.limit(source);
    await globalLimiter.limit('global');
}

// ===== Auth Routes =====

// Register
app.post('/register', express.json(), validateCSRF, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = { username, password: hashedPassword, role: 'user' };
    users.push(user);

    res.status(201).json({ message: 'User registered successfully' });
});

// Login
app.post('/login', express.json(), validateCSRF, async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const attemptKey = `${clientIP}-${username}`;
    
    // Check if account is locked
    const attempts = loginAttempts.get(attemptKey);
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_TIME) {
            const minutesLeft = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
            return res.status(429).json({ 
                message: `Account locked. Try again in ${minutesLeft} minutes.` 
            });
        } else {
            // Reset attempts after lockout period
            loginAttempts.delete(attemptKey);
        }
    }

    const user = users.find(u => u.username === username);
    
    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
        // Record failed attempt
        const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
        currentAttempts.count++;
        currentAttempts.lastAttempt = Date.now();
        loginAttempts.set(attemptKey, currentAttempts);
        
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset attempts on successful login
    loginAttempts.delete(attemptKey);

    // Include role in the token payload
    const token = jwt.sign({ 
        username: user.username, 
        role: user.role 
    }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
        token,
        role: user.role
    });
});

// ===== Middleware to verify token =====
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to authenticate token' });
        }

        req.username = decoded.username;
        req.role = decoded.role;
        next();
    });
}

// ===== Middleware to verify admin role =====
function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to authenticate token' });
        }

        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        req.username = decoded.username;
        req.role = decoded.role;
        next();
    });
}

// ===== Middleware to validate CSRF token =====
function validateCSRF(req, res, next) {
    const tokenId = req.headers['x-csrf-token-id'];
    const token = req.headers['x-csrf-token'];
    
    if (!tokenId || !token) {
        return res.status(403).json({ 
            success: false, 
            message: 'CSRF token required' 
        });
    }
    
    const secret = csrfTokens.get(tokenId);
    if (!secret) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid CSRF token' 
        });
    }
    
    if (!csrf.verify(secret, token)) {
        return res.status(403).json({ 
            success: false, 
            message: 'CSRF token verification failed' 
        });
    }
    
    // Remove used token to prevent reuse
    csrfTokens.delete(tokenId);
    
    next();
}

// In-memory data stores
const bookmarks = {};
const history = {};

// ===== User Data Routes =====

// Get bookmarks
app.get('/api/user/bookmarks', verifyToken, (req, res) => {
    const userBookmarks = bookmarks[req.username] || [];
    res.json({ success: true, data: userBookmarks });
});

// Add bookmark
app.post('/api/user/bookmarks', express.json(), verifyToken, (req, res) => {
    const { manga } = req.body;
    if (!bookmarks[req.username]) {
        bookmarks[req.username] = [];
    }
    bookmarks[req.username].push(manga);
    res.json({ success: true, message: 'Bookmark added' });
});

// Get history
app.get('/api/user/history', verifyToken, (req, res) => {
    const userHistory = history[req.username] || [];
    res.json({ success: true, data: userHistory });
});

// Add to history
app.post('/api/user/history', express.json(), verifyToken, (req, res) => {
    const { chapter } = req.body;
    if (!history[req.username]) {
        history[req.username] = [];
    }
    history[req.username].push(chapter);
    res.json({ success: true, message: 'History added' });
});

// ===== API Routes =====

// Get manga list
app.get('/api/manga', async (req, res) => {
    try {
        const { source = 'mangadex', genre = 'all', sort = 'latest', page = 1, lang = 'all', status = 'all', type = 'all' } = req.query;
        const limit = DEFAULT_PAGE_SIZE;
        
        // Add logging for debugging
        console.log('[API] Manga list request:', { source, genre, sort, page, lang, status, type });

        if (isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        const metadataResult = await metadataStore.getMangaList({
            source,
            genre,
            status,
            type,
            language: lang,
            sort,
            page: parseInt(page),
            limit
        });

        if (metadataResult.hasData) {
            console.log('[API] Returning metadata cache result');
            return res.json({
                success: true,
                data: metadataResult.items,
                page: parseInt(page),
                totalPages: metadataResult.totalPages,
                cached: true,
                cacheType: 'metadata'
            });
        }

        // Check file cache first
        const fileCacheKey = `manga_list_${source}_${genre}_${sort}_${page}_${lang}_${status}_${type}`;
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            console.log('[API] Returning file cache result');
            return res.json({
                success: true,
                data: fileCached,
                page: parseInt(page),
                totalPages: calculateTotalPages(fileCached),
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cacheKey = `manga_list_${source}_${genre}_${sort}_${page}_${lang}_${status}_${type}`;
        const cached = mangaListCache.get(cacheKey);
        if (cached) {
            console.log('[API] Returning memory cache result');
            return res.json({
                success: true,
                data: cached,
                page: parseInt(page),
                totalPages: calculateTotalPages(cached),
                cached: true,
                cacheType: 'memory'
            });
        }

        let mangaList = [];

        // Prepare options for MangaDex with language filter
        const options = { page: parseInt(page) };
        if (source === 'mangadex' && lang !== 'all') {
            options.availableTranslatedLanguage = [lang]; // Filter by language for MangaDex
            options.offset = (parseInt(page) - 1) * limit;
            options.limit = limit;
        }

        if (source === 'all') {
            // Combine results from all sources with timeout
            const sources = SCRAPER_SOURCES;

            // Create timeout promise helper
            const withTimeout = (promise, ms) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), ms)
                    )
                ]);
            };

            const results = await Promise.allSettled(
                sources.map(async (src) => {
                    try {
                        // Skip rate limit for faster response
                        // await applyRateLimit(src);
                        const scraper = getSourceScraper(src);
                        if (scraper && scraper.getMangaList) {
                            // Add 5 second timeout per scraper
                            return await withTimeout(
                                src === 'mangadex'
                                    ? scraper.getMangaList(options)
                                    : scraper.getMangaList(parseInt(page)),
                                5000
                            );
                        }
                        return [];
                    } catch (error) {
                        console.warn(`Scraper ${src} failed:`, error.message);
                        return [];
                    }
                })
            );

            mangaList = results
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => r.value);
        } else {
            // Single source
            await applyRateLimit(source);
            const scraper = getSourceScraper(source);

            if (scraper && scraper.getMangaList) {
                if (source === 'mangadex') {
                    mangaList = await scraper.getMangaList(options);
                } else {
                    mangaList = await scraper.getMangaList(parseInt(page));
                }
            }
        }

        if (Array.isArray(mangaList) && mangaList.length) {
            const seenEntries = new Set();
            mangaList = mangaList.filter(item => {
                if (!item || !item.id) return false;
                const itemSource = item.source || source;
                const key = `${itemSource}::${item.id}`;
                if (seenEntries.has(key)) return false;
                seenEntries.add(key);
                return true;
            });
        }

        if (Array.isArray(mangaList) && mangaList.length) {
            if (source === 'all') {
                await metadataStore.ingestCombinedList(mangaList);
            } else {
                await metadataStore.upsertList(source, mangaList);
            }
        }

        const filteredList = applyMangaFilters(mangaList, {
            genre,
            status,
            type,
            language: lang
        });
        
        console.log('[API] Filtered list length:', filteredList.length);
        
        const sortedList = applyMangaSort(filteredList, sort);
        const startIndex = Math.max(0, (parseInt(page) - 1) * limit);
        const pagedList = sortedList.slice(startIndex, startIndex + limit);
        const computedTotalPages = calculateTotalPages(sortedList, limit);

        // Cache the result in both memory and file (perpanjang durasi untuk hemat scraping)
        mangaListCache.set(cacheKey, pagedList);
        await saveToFileCache(fileCacheKey, pagedList, 3600000); // 1 jam

        res.json({
            success: true,
            data: pagedList,
            page: parseInt(page),
            totalPages: computedTotalPages
        });
    } catch (error) {
        console.error('Error in /api/manga:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get latest updates
app.get('/api/updates', async (req, res) => {
    try {
        const {
            source = 'all',
            limit = 12,
            lang = 'all',
            status = 'all',
            type = 'all',
            sort = 'popular'
        } = req.query;

        if (source !== 'all' && isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 4), 48);

        const metadataResult = await metadataStore.getMangaList({
            source,
            status,
            type,
            language: lang,
            sort,
            page: 1,
            limit: parsedLimit
        });

        const items = Array.isArray(metadataResult.items)
            ? metadataResult.items.slice(0, parsedLimit)
            : [];

        res.json({
            success: true,
            data: items,
            totalItems: metadataResult.totalItems || items.length,
            cacheType: metadataResult.cacheType || 'metadata'
        });
    } catch (error) {
        console.error('Error in /api/updates:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch latest updates'
        });
    }
});

// Get manga detail
app.get('/api/manga/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { source = 'mangadex' } = req.query;

        if (isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        const metadataDetail = await metadataStore.getMangaDetail(source, id);
        if (metadataDetail) {
            return res.json({
                success: true,
                data: metadataDetail,
                cached: true,
                cacheType: 'metadata'
            });
        }

        // Check file cache first
        const fileCacheKey = `manga_detail_${source}_${id}`;
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            return res.json({
                success: true,
                data: fileCached,
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cacheKey = `manga_detail_${source}_${id}`;
        const cached = mangaDetailCache.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
                cacheType: 'memory'
            });
        }

        await applyRateLimit(source);
        const scraper = getSourceScraper(source);

        if (!scraper || !scraper.getMangaDetail) {
            return res.status(404).json({
                success: false,
                message: 'Source not found or not supported'
            });
        }

        const mangaDetail = await scraper.getMangaDetail(id);

        if (!mangaDetail) {
            const fallbackList = metadataStore.getStoredList(source);
            const fallbackEntry = Array.isArray(fallbackList)
                ? fallbackList.find(item => item && item.id === id)
                : null;

            if (fallbackEntry) {
                const fallbackDetail = {
                    ...fallbackEntry,
                    fallback: true,
                    cacheType: 'metadata-fallback'
                };

                await metadataStore.saveMangaDetail(source, fallbackDetail);
                mangaDetailCache.set(cacheKey, fallbackDetail);
                await saveToFileCache(fileCacheKey, fallbackDetail, 1800000); // 30 menit

                return res.json({
                    success: true,
                    data: fallbackDetail,
                    cached: true,
                    cacheType: 'metadata-fallback',
                    message: 'Detail served from cached metadata; live scrape unavailable'
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Manga not found'
            });
        }

        await metadataStore.saveMangaDetail(source, mangaDetail);

        // Cache the result in both memory and file (detail jarang berubah, cache lebih lama)
        mangaDetailCache.set(cacheKey, mangaDetail);
        await saveToFileCache(fileCacheKey, mangaDetail, 7200000); // 2 jam

        res.json({
            success: true,
            data: mangaDetail
        });
    } catch (error) {
        console.error('Error in /api/manga/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get chapter list
app.get('/api/manga/:id/chapters', async (req, res) => {
    try {
        const { id } = req.params;
        const { source = 'mangadex' } = req.query;

        if (isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        // Check file cache first
        const fileCacheKey = `chapters_${source}_${id}`;
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            return res.json({
                success: true,
                data: fileCached,
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cacheKey = `chapters_${source}_${id}`;
        const cached = chapterListCache.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
                cacheType: 'memory'
            });
        }

        await applyRateLimit(source);
        const scraper = getSourceScraper(source);

        if (!scraper || !scraper.getChapters) {
            return res.status(404).json({
                success: false,
                message: 'Source not found or not supported'
            });
        }

        const chapters = await scraper.getChapters(id);

        // Cache the result in both memory and file (chapter list cache lebih lama)
        chapterListCache.set(cacheKey, chapters);
        await saveToFileCache(fileCacheKey, chapters, 3600000); // 1 jam

        res.json({
            success: true,
            data: chapters
        });
    } catch (error) {
        console.error('Error in /api/manga/:id/chapters:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get chapter pages
app.get('/api/manga/:mangaId/chapter/:chapterId', async (req, res) => {
    try {
        const { mangaId, chapterId } = req.params;
        const { source = 'mangadex' } = req.query;

        if (isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        // Check file cache first
        const fileCacheKey = `pages_${source}_${mangaId}_${chapterId}`;
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            return res.json({
                success: true,
                data: fileCached,
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cacheKey = `pages_${source}_${mangaId}_${chapterId}`;
        const cached = chapterPagesCache.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
                cacheType: 'memory'
            });
        }

        await applyRateLimit(source);
        const scraper = getSourceScraper(source);

        if (!scraper || !scraper.getChapterPages) {
            return res.status(404).json({
                success: false,
                message: 'Source not found or not supported'
            });
        }

        const pages = await scraper.getChapterPages(chapterId);

        // Cache the result in both memory and file (pages sangat jarang berubah, cache paling lama)
        chapterPagesCache.set(cacheKey, pages);
        await saveToFileCache(fileCacheKey, pages, 86400000); // 24 jam

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error in /api/manga/:mangaId/chapter/:chapterId:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Search manga
app.get('/api/search', async (req, res) => {
    try {
        const { q, source = 'all' } = req.query;

        if (source !== 'all' && isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const normalizedQuery = q.trim().toLowerCase();
        const searchLimit = 100; // Increased from 40 to 100
        const fileCacheKey = `search_${source}_${q}`;
        const cacheKey = `search_${source}_${q}`;
        const searchSources = source === 'all' ? SCRAPER_SOURCES : [source];
        const metadataMatches = [];
        const seen = new Set();

        for (const src of searchSources) {
            const storedItems = metadataStore.getStoredList(src);
            if (!storedItems.length) {
                metadataStore.requestRefresh(src).catch(() => {});
                continue;
            }

            storedItems.forEach(item => {
                if (!item) return;
                const key = `${src}::${item.id}`;
                if (seen.has(key)) return;

                const title = String(item.title || '').toLowerCase();
                const alt = String(item.altTitle || '').toLowerCase();
                const description = String(item.description || '').toLowerCase();

                if (
                    title.includes(normalizedQuery) ||
                    alt.includes(normalizedQuery) ||
                    description.includes(normalizedQuery)
                ) {
                    seen.add(key);
                    metadataMatches.push(item);
                }
            });
        }

        if (metadataMatches.length) {
            const sortedMatches = applyMangaSort(metadataMatches, 'latest');
            const limited = sortedMatches.slice(0, searchLimit);

            searchCache.set(cacheKey, limited);
            await saveToFileCache(fileCacheKey, limited, 900000); // 15 menit

            return res.json({
                success: true,
                data: limited,
                cached: true,
                cacheType: 'metadata'
            });
        }

        // Check file cache
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            return res.json({
                success: true,
                data: fileCached,
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
                cacheType: 'memory'
            });
        }

        let results = [];

        if (source === 'all') {
            const sources = SCRAPER_SOURCES;

            const withTimeout = (promise, ms) => Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), ms)
                )
            ]);

            const responses = await Promise.allSettled(
                sources.map(async (src) => {
                    try {
                        const scraper = getSourceScraper(src);
                        if (scraper && scraper.searchManga) {
                            const data = await withTimeout(scraper.searchManga(q), 5000);
                            if (Array.isArray(data)) {
                                return data.map(item => ({ ...item, source: item.source || src }));
                            }
                        }
                        return [];
                    } catch (error) {
                        console.warn(`Search ${src} failed:`, error.message);
                        return [];
                    }
                })
            );

            results = responses
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => r.value);
        } else {
            await applyRateLimit(source);
            const scraper = getSourceScraper(source);

            if (!scraper || !scraper.searchManga) {
                return res.status(404).json({
                    success: false,
                    message: 'Source not found or not supported'
                });
            }

            const data = await scraper.searchManga(q);
            results = Array.isArray(data)
                ? data.map(item => ({ ...item, source: item.source || source }))
                : [];
        }

        if (results.length) {
            if (source === 'all') {
                await metadataStore.ingestCombinedList(results);
            } else {
                await metadataStore.upsertList(source, results);
            }

            searchCache.set(cacheKey, results);
            await saveToFileCache(fileCacheKey, results, 900000); // 15 menit
        }

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in /api/search:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get popular manga
app.get('/api/popular', async (req, res) => {
    try {
        const { source = 'mangadex', limit = 20 } = req.query;

        if (isSourceDisabled(source)) {
            return res.status(410).json({
                success: false,
                message: `Source "${source}" is temporarily disabled`
            });
        }

        // Check file cache first
        const fileCacheKey = `popular_${source}_${limit}`;
        const fileCached = await loadFromFileCache(fileCacheKey);
        if (fileCached) {
            return res.json({
                success: true,
                data: fileCached,
                cached: true,
                cacheType: 'file'
            });
        }

        // Check memory cache
        const cacheKey = `popular_${source}_${limit}`;
        const cached = mangaListCache.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
                cacheType: 'memory'
            });
        }

        await applyRateLimit(source);
        const scraper = getSourceScraper(source);

        if (!scraper || !scraper.getPopularManga) {
            return res.status(404).json({
                success: false,
                message: 'Source not found or not supported'
            });
        }

        const popular = await scraper.getPopularManga(parseInt(limit));

        // Cache the result in both memory and file (popular jarang berubah)
        mangaListCache.set(cacheKey, popular);
        await saveToFileCache(fileCacheKey, popular, 3600000); // 1 jam

        res.json({
            success: true,
            data: popular
        });
    } catch (error) {
        console.error('Error in /api/popular:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Cache stats endpoint
app.get('/api/cache/stats', async (req, res) => {
    try {
        const fileCacheStats = await getFileCacheStats();
        
        res.json({
            success: true,
            data: {
                memory: {
                    mangaList: mangaListCache.stats(),
                    mangaDetail: mangaDetailCache.stats(),
                    chapterList: chapterListCache.stats(),
                    chapterPages: chapterPagesCache.stats(),
                    search: searchCache.stats()
                },
                file: fileCacheStats
            }
        });
    } catch (error) {
        console.error('Error in /api/cache/stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Clear cache endpoint
app.post('/api/cache/clear', verifyAdmin, async (req, res) => {
    try {
        mangaListCache.clear();
        mangaDetailCache.clear();
        chapterListCache.clear();
        chapterPagesCache.clear();
        searchCache.clear();
        
        // Clear file cache
        await clearFileCache();

        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        console.error('Error in /api/cache/clear:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// CSRF token generation
app.get('/api/csrf-token', (req, res) => {
    const secret = csrf.secretSync();
    const token = csrf.create(secret);
    
    // Store the secret for validation
    const tokenId = Date.now().toString();
    csrfTokens.set(tokenId, secret);
    
    // Clean up old tokens (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, timestamp] of csrfTokens.entries()) {
        if (timestamp < oneHourAgo) {
            csrfTokens.delete(id);
        }
    }
    
    res.json({
        success: true,
        tokenId: tokenId,
        token: token
    });
});

// CSRF token generation
app.get('/api/csrf-token', (req, res) => {
    const secret = csrf.secretSync();
    const token = csrf.create(secret);
    
    // Store the secret for validation
    const tokenId = Date.now().toString();
    csrfTokens.set(tokenId, secret);
    
    // Clean up old tokens (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, timestamp] of csrfTokens.entries()) {
        if (timestamp < oneHourAgo) {
            csrfTokens.delete(id);
        }
    }
    
    res.json({
        success: true,
        tokenId: tokenId,
        token: token
    });
});

// ===== Admin Dashboard Endpoints =====

// Get server stats
app.get('/api/admin/stats', verifyAdmin, (req, res) => {
    try {
        const stats = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting server stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Restart server
app.post('/api/admin/restart', verifyAdmin, (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Server restart initiated'
        });
        
        // Schedule restart after response
        setTimeout(() => {
            // If running with PM2, send SIGUSR2 signal for graceful restart
            if (process.env.NODE_ENV === 'production') {
                process.kill(process.pid, 'SIGUSR2');
            } else {
                // For development, just exit and let process manager restart
                process.exit(0);
            }
        }, 1000);
    } catch (error) {
        console.error('Error restarting server:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', verifyAdmin, (req, res) => {
    try {
        // Return users without passwords
        const safeUsers = users.map(user => ({
            username: user.username,
            role: user.role
        }));
        
        res.json({
            success: true,
            data: safeUsers
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add new user (admin only)
app.post('/api/admin/users', express.json(), verifyAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }

        // Hash the password before storing
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = { username, password: hashedPassword, role: role || 'user' };
        users.push(user);

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete user (admin only)
app.delete('/api/admin/users/:username', verifyAdmin, (req, res) => {
    try {
        const { username } = req.params;
        
        // Prevent deleting the last admin
        const adminCount = users.filter(u => u.role === 'admin').length;
        const userToDelete = users.find(u => u.username === username);
        
        if (userToDelete && userToDelete.role === 'admin' && adminCount <= 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete the last admin user' 
            });
        }
        
        const index = users.findIndex(u => u.username === username);
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        users.splice(index, 1);
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Change admin password (admin only)
app.post('/api/admin/change-password', express.json(), verifyAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminUser = users.find(u => u.username === req.username);
        
        if (!adminUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Admin user not found' 
            });
        }
        
        // Verify current password
        if (!(await bcrypt.compare(currentPassword, adminUser.password))) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        adminUser.password = hashedPassword;
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Change user password (admin only)
app.post('/api/admin/user-password', express.json(), verifyAdmin, async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const targetUser = users.find(u => u.username === username);
        
        if (!targetUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        targetUser.password = hashedPassword;
        
        res.json({ 
            success: true, 
            message: 'User password changed successfully' 
        });
    } catch (error) {
        console.error('Error changing user password:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get active users count
app.get('/api/admin/active-users', verifyAdmin, (req, res) => {
    try {
        // Clean up expired sessions (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        for (const [username, session] of activeSessions.entries()) {
            if (session.lastActive < oneHourAgo) {
                activeSessions.delete(username);
            }
        }
        
        res.json({
            success: true,
            data: {
                count: activeSessions.size
            }
        });
    } catch (error) {
        console.error('Error getting active users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add a special endpoint to reset admin password (only accessible from localhost)
app.post('/api/admin/reset-admin-password', express.json(), (req, res) => {
    try {
        // Security check: only allow from localhost
        const clientIP = req.ip || req.connection.remoteAddress;
        const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';
        
        if (!isLocalhost) {
            return res.status(403).json({
                success: false,
                message: 'This endpoint is only accessible from localhost for security reasons'
            });
        }
        
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }
        
        // Find admin user
        const adminUser = users.find(u => u.role === 'admin');
        
        if (!adminUser) {
            // Create admin user if not exists
            const saltRounds = 12;
            bcrypt.hash(newPassword, saltRounds).then(hashedPassword => {
                users.push({ 
                    username: 'admin', 
                    password: hashedPassword, 
                    role: 'admin' 
                });
                
                console.log('[Auth] Admin user created with new password');
                res.json({
                    success: true,
                    message: 'Admin user created with new password'
                });
            }).catch(error => {
                throw error;
            });
        } else {
            // Reset admin password
            const saltRounds = 12;
            bcrypt.hash(newPassword, saltRounds).then(hashedPassword => {
                adminUser.password = hashedPassword;
                
                console.log('[Auth] Admin password reset successfully');
                res.json({
                    success: true,
                    message: 'Admin password reset successfully'
                });
            }).catch(error => {
                throw error;
            });
        }
    } catch (error) {
        console.error('Error resetting admin password:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===== Proxy Management Endpoints =====

// Get proxy stats
app.get('/api/proxy/stats', verifyAdmin, (req, res) => {
    try {
        const stats = proxyManager.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting proxy stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add proxy
app.post('/api/proxy/add', express.json(), verifyAdmin, (req, res) => {
    try {
        const { proxy } = req.body;

        if (!proxy) {
            return res.status(400).json({
                success: false,
                message: 'Proxy URL is required'
            });
        }

        const added = proxyManager.addProxy(proxy);

        if (added) {
            res.json({
                success: true,
                message: 'Proxy added successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Proxy already exists'
            });
        }
    } catch (error) {
        console.error('Error adding proxy:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Remove proxy
app.post('/api/proxy/remove', express.json(), verifyAdmin, (req, res) => {
    try {
        const { proxy } = req.body;

        if (!proxy) {
            return res.status(400).json({
                success: false,
                message: 'Proxy URL is required'
            });
        }

        const removed = proxyManager.removeProxy(proxy);

        if (removed) {
            res.json({
                success: true,
                message: 'Proxy removed successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Proxy not found'
            });
        }
    } catch (error) {
        console.error('Error removing proxy:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Reset failed proxies
app.post('/api/proxy/reset', verifyAdmin, (req, res) => {
    try {
        proxyManager.resetFailedProices();
        res.json({
            success: true,
            message: 'All failed proxies have been reset'
        });
    } catch (error) {
        console.error('Error resetting proxies:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===== Start Server =====
app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? PUBLIC_IP : 'localhost';
    metadataStore.scheduleAutoRefresh({ pages: 8, limit: 60, languages: ['en', 'id'], interval: 300000 });
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Manga API Server running!`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📚 Website: http://${displayHost}:${PORT}`);
    console.log(`🔗 API: http://${displayHost}:${PORT}/api/`);
    console.log(`💻 Mode: ${HOST === '0.0.0.0' ? 'PUBLIC (accessible from anywhere)' : 'LOCAL (localhost only)'}`);
    console.log(`${'='.repeat(50)}\n`);
    console.log(`Available sources:`);
    console.log(`  - MangaDex (API)`);
    console.log(`  - Komiku (Scraping)`);
    console.log(`  - Maid.my.id (Scraping)`);
    console.log(`  - BacaManga (Scraping)`);
    console.log(`  - Kiryuu (Scraping)`);
    console.log(`  - Jikan/MyAnimeList (API)`);
    console.log(`\n${'='.repeat(50)}\n`);

    // Initialize ProxyScrape auto-fetch
    const proxyScrapeClient = initProxyScrape();
    if (proxyScrapeClient) {
        console.log('🔄 Initializing ProxyScrape auto-fetch...');

        // Fetch proxies setiap 1 jam dengan preset "fast"
        const presets = require('./utils/proxyScrapeClient').ProxyScrapeClient.getPresets();
        proxyScrapeClient.startAutoFetch(presets.fast, 3600000); // 1 jam

        console.log('✅ ProxyScrape auto-fetch started');
    }

    console.log(`\n${'='.repeat(50)}\n`);
});

module.exports = app;