// ===== Global Variables =====
const API_BASE = window.location.origin;
const ACTIVE_SOURCES = ['mangadex', 'komiku', 'maid', 'bacamanga'];
const THEME_STORAGE_KEY = 'mangaku_theme';
const UPDATES_REFRESH_INTERVAL = 30000;
const DEFAULT_LANGUAGE = 'id';

let updatesAbortController = null;
let updatesRefreshTimer = null;

(function restoreThemePreference() {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
    } catch (error) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

// ===== Reading History Manager (NEW!) =====
window.HistoryManager = window.HistoryManager || {
    STORAGE_KEY: 'mangaku_history',
    MAX_HISTORY: 50, // Simpan max 50 history terbaru

    getAll() {
        try {
            const history = localStorage.getItem(this.STORAGE_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error reading history:', error);
            return [];
        }
    },

    save(history) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('Error saving history:', error);
            return false;
        }
    },

    add(manga, chapterId, chapterNumber) {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            // If logged in, save to server
            this.saveToServer(manga, chapterId, chapterNumber);
        }
        
        // Also save to localStorage for immediate access
        const history = this.getAll();

        // Remove existing entry for this manga
        const filtered = history.filter(h => !(h.mangaId === manga.id && h.source === manga.source));

        // Add new entry at the beginning (most recent)
        filtered.unshift({
            mangaId: manga.id,
            source: manga.source,
            title: manga.title,
            cover: manga.cover,
            lastChapterId: chapterId,
            lastChapterNumber: chapterNumber,
            readAt: new Date().toISOString()
        });

        // Keep only MAX_HISTORY items
        const trimmed = filtered.slice(0, this.MAX_HISTORY);
        return this.save(trimmed);
    },

    async saveToServer(manga, chapterId, chapterNumber) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const chapter = {
                mangaId: manga.id,
                source: manga.source,
                title: manga.title,
                cover: manga.cover,
                lastChapterId: chapterId,
                lastChapterNumber: chapterNumber,
                readAt: new Date().toISOString()
            };

            await fetch('/api/user/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ chapter })
            });
        } catch (error) {
            console.error('Error saving history to server:', error);
        }
    },

    clear() {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            // In a real implementation, you would clear server history too
        }
        
        localStorage.removeItem(this.STORAGE_KEY);
        return true;
    }
};

// ===== Chapter Read Manager =====
window.ChapterReadManager = window.ChapterReadManager || {
    STORAGE_KEY: 'mangaku_read_chapters',

    getAll() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.error('Error reading read chapters:', error);
            return {};
        }
    },

    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving read chapters:', error);
            return false;
        }
    },

    createKey(source, mangaId) {
        return `${source || 'mangadex'}::${mangaId}`;
    },

    markAsRead({ mangaId, source, chapterId }) {
        if (!mangaId || !chapterId) return false;
        const data = this.getAll();
        const key = this.createKey(source, mangaId);
        const list = Array.isArray(data[key]) ? data[key] : [];
        const chapterKey = String(chapterId);

        if (!list.includes(chapterKey)) {
            list.push(chapterKey);
            data[key] = list;
            return this.save(data);
        }
        return true;
    },

    hasRead({ mangaId, source, chapterId }) {
        if (!mangaId || !chapterId) return false;
        const data = this.getAll();
        const key = this.createKey(source, mangaId);
        const list = Array.isArray(data[key]) ? data[key] : [];
        return list.includes(String(chapterId));
    },

    getForManga(mangaId, source) {
        if (!mangaId) return [];
        const data = this.getAll();
        const key = this.createKey(source, mangaId);
        return Array.isArray(data[key]) ? data[key] : [];
    },

    clearManga(mangaId, source) {
        const data = this.getAll();
        const key = this.createKey(source, mangaId);
        if (data[key]) {
            delete data[key];
            return this.save(data);
        }
        return true;
    }
};

// ===== Bookmark Manager (Shared globally) =====
window.BookmarkManager = window.BookmarkManager || {
    STORAGE_KEY: 'mangaku_bookmarks',

    getAll() {
        try {
            const bookmarks = localStorage.getItem(this.STORAGE_KEY);
            return bookmarks ? JSON.parse(bookmarks) : [];
        } catch (error) {
            console.error('Error reading bookmarks:', error);
            return [];
        }
    },

    save(bookmarks) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
            return true;
        } catch (error) {
            console.error('Error saving bookmarks:', error);
            return false;
        }
    },

    isBookmarked(mangaId, source) {
        const bookmarks = this.getAll();
        return bookmarks.some(b => b.id === mangaId && b.source === source);
    },

    add(manga) {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            // If logged in, save to server
            this.saveToServer(manga);
        }
        
        const bookmarks = this.getAll();

        // Check if already bookmarked
        if (this.isBookmarked(manga.id, manga.source)) {
            return false;
        }

        bookmarks.push({
            id: manga.id,
            source: manga.source,
            title: manga.title,
            cover: manga.cover,
            addedAt: new Date().toISOString()
        });

        return this.save(bookmarks);
    },

    async saveToServer(manga) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await fetch('/api/user/bookmarks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ manga })
            });
        } catch (error) {
            console.error('Error saving bookmark to server:', error);
        }
    },

    remove(mangaId, source) {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            // In a real implementation, you would remove from server too
        }
        
        const bookmarks = this.getAll();
        const filtered = bookmarks.filter(b => !(b.id === mangaId && b.source === source));
        return this.save(filtered);
    }
};

// ===== Side Menu Toggle (Hamburger) =====
function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');

    if (sideMenu && overlay) {
        const isOpen = sideMenu.classList.contains('active');

        if (isOpen) {
            // Close menu
            sideMenu.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            // Open menu
            sideMenu.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update auth menu item when opening
            updateAuthMenuItem();
        }
    }
}

// ===== Update Auth Menu Item =====
function updateAuthMenuItem() {
    const sideMenu = document.getElementById('sideMenu');
    if (!sideMenu) return;
    
    const authMenuItem = sideMenu.querySelector('#auth-menu-item');
    if (!authMenuItem) return;
    
    const token = localStorage.getItem('token');
    
    if (token) {
        authMenuItem.innerHTML = `
            <a href="#" onclick="logout(); toggleSideMenu();">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a>
        `;
    } else {
        authMenuItem.innerHTML = `
            <a href="login.html" onclick="toggleSideMenu();">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        `;
    }
}

// ===== Logout Function =====
function logout() {
    localStorage.removeItem('token');
    updateAuthMenuItem();
    
    // Reload page to update UI
    window.location.reload();
}

// ===== Search Functionality =====
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', debounce(async function(e) {
        const searchTerm = e.target.value.trim();

        if (searchTerm.length < 2) {
            hideSearchResults();
            return;
        }

        await searchManga(searchTerm);
    }, 350));

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideSearchResults();
            e.target.blur();
        }
    });
}

async function searchManga(term) {
    try {
        const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];

        // Parallel search: server cache + live scraping
        const searchPromises = [
            // 1. Server cached search
            fetch(`${API_BASE}/api/search?q=${encodeURIComponent(term)}&source=all`)
                .then(res => res.json())
                .then(result => result.success && result.data ? result.data : [])
                .catch(() => []),

            // 2. Live scraping search from each source
            ...sources.map(source =>
                fetch(`${API_BASE}/api/search?q=${encodeURIComponent(term)}&source=${source}`)
                    .then(res => res.json())
                    .then(result => result.success && result.data ? result.data : [])
                    .catch(() => [])
            )
        ];

        const results = await Promise.all(searchPromises);

        // Combine and deduplicate search results
        let combinedResults = [];
        const seenIds = new Set();

        results.forEach(dataArray => {
            if (Array.isArray(dataArray)) {
                dataArray.forEach(manga => {
                    const uniqueKey = `${manga.source}-${manga.id}`;
                    if (!seenIds.has(uniqueKey) && manga.id) {
                        seenIds.add(uniqueKey);
                        combinedResults.push(manga);
                    }
                });
            }
        });

        // Show top 12 results instead of 8 for better coverage
        renderSearchResults(combinedResults.slice(0, 12));
    } catch (error) {
        console.error('Search error:', error);
        renderSearchResults([]);
    }
}

function goToDetail(mangaId, source) {
    if (!mangaId) return;
    const idParam = encodeURIComponent(mangaId);
    const src = source && source !== 'all' ? source : 'mangadex';
    window.location.href = `detail.html?id=${idParam}&source=${encodeURIComponent(src)}`;
}

function showError(message) {
    const mangaGrid = document.getElementById('mangaGrid');
    if (!mangaGrid) return;
    mangaGrid.innerHTML = `
        <div class="manga-empty" style="color: var(--danger-color);">
            ${escapeHtml(message)}
        </div>
    `;
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Baru saja';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Baru saja';
    const now = new Date();
    const diffMs = now - date;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diffMs < minute) return 'Baru saja';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)} menit lalu`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)} jam lalu`;
    if (diffMs < week) return `${Math.floor(diffMs / day)} hari lalu`;
    if (diffMs < day * 30) return `${Math.floor(diffMs / week)} minggu lalu`;

    return date.toLocaleDateString('id-ID');
}

function parseChapterNumber(value) {
    if (value == null) return 0;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

function sortByFreshness(list) {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const bChapter = parseChapterNumber(b.latestChapter || b.lastChapter || b.chapter);
        const aChapter = parseChapterNumber(a.latestChapter || a.lastChapter || a.chapter);
        if (bChapter !== aChapter) {
            return bChapter - aChapter;
        }
        const bDate = new Date(b.updatedAt || b.lastUpdated || b.date || b.publishedAt || 0).getTime();
        const aDate = new Date(a.updatedAt || a.lastUpdated || a.date || a.publishedAt || 0).getTime();
        return bDate - aDate;
    });
}

function formatRating(value) {
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric)) return '8.0';
    return numeric.toFixed(1);
}

function formatType(value) {
    if (!value) return 'Manga';
    return String(value)
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function formatChapterLabel(value) {
    if (!value) return 'Chapter terbaru';
    return `Ch. ${value}`;
}

async function loadUpdates({ silent = false } = {}) {
    const carousel = document.getElementById('updatesCarousel');
    if (!carousel) return;

    if (updatesAbortController) {
        updatesAbortController.abort();
    }
    updatesAbortController = new AbortController();

    if (!silent) {
        carousel.innerHTML = '<div class="updates-empty">Memuat pembaruan...</div>';
    }

    const params = new URLSearchParams();
    params.set('source', 'all');
    params.set('limit', '100');
    params.set('lang', DEFAULT_LANGUAGE);
    params.set('sort', 'latest');
    params.set('_', Date.now().toString());

    try {
        const response = await fetch(`${API_BASE}/api/updates?${params.toString()}`, {
            signal: updatesAbortController.signal
        });
        const result = await response.json();

        if (response.ok && result.success) {
            let data = Array.isArray(result.data) ? result.data : [];

            // Apply type filter if not 'all'
            if (currentTypeFilter && currentTypeFilter !== 'all') {
                data = data.filter(manga => {
                    const type = (manga.type || '').toLowerCase();
                    return type.includes(currentTypeFilter.toLowerCase());
                });
            }

            renderUpdates(data);
        } else {
            carousel.innerHTML = `<div class="updates-empty">${escapeHtml(result.message || 'Tidak ada pembaruan ditemukan.')}</div>`;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }
        console.error('[Updates] Gagal memuat:', error);
        carousel.innerHTML = '<div class="updates-empty">Gagal memuat pembaruan.</div>';
    }
}

function renderUpdates(items) {
    const carousel = document.getElementById('updatesCarousel');
    if (!carousel) return;

    if (!Array.isArray(items) || items.length === 0) {
        carousel.innerHTML = '<div class="updates-empty">Belum ada pembaruan terbaru.</div>';
        return;
    }

    const limited = sortByFreshness(items).slice(0, 16);
    carousel.innerHTML = '';
    limited.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'update-card';
        button.innerHTML = `
            <div class="update-card-cover">
                <img src="${item.cover || item.coverFull || 'https://via.placeholder.com/220x320?text=No+Cover'}" alt="${escapeHtml(item.title || 'Manga')}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/220x320?text=No+Cover';">
                <span class="update-card-badge">${escapeHtml(item.source || 'All')}</span>
                <span class="update-card-chip">${escapeHtml(formatType(item.type || 'Manga'))}</span>
            </div>
            <div class="update-card-body">
                <div class="update-card-title">${escapeHtml(item.title || 'Tanpa Judul')}</div>
                <div class="update-card-meta">
                    <span class="update-card-time"><i class="far fa-clock"></i>${formatRelativeTime(item.updatedAt || item.lastUpdated || item.date)}</span>
                    <span class="update-card-rating"><i class="fas fa-star"></i>${formatRating(item.rating)}</span>
                </div>
            </div>
        `;
        button.addEventListener('click', () => {
            goToDetail(item.id, item.source);
        });
        carousel.appendChild(button);
    });
}

function scheduleUpdatesRefresh() {
    if (updatesRefreshTimer) {
        clearInterval(updatesRefreshTimer);
    }
    if (!document.getElementById('updatesCarousel')) return;
    updatesRefreshTimer = setInterval(() => loadUpdates({ silent: true }), UPDATES_REFRESH_INTERVAL);
}

function initUpdatesControls() {
    const refreshBtn = document.getElementById('refreshUpdatesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadUpdates());
    }
}

function injectThemeToggle() {
    const navWrapper = document.querySelector('.nav-wrapper');
    if (!navWrapper) return;

    let actions = navWrapper.querySelector('.nav-actions');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'nav-actions';
        navWrapper.appendChild(actions);
    }

    const hamburger = navWrapper.querySelector('.hamburger-menu-btn');
    if (hamburger && hamburger.parentElement !== actions) {
        actions.appendChild(hamburger);
    }

    if (!actions.querySelector('#themeToggle')) {
        const button = document.createElement('button');
        button.id = 'themeToggle';
        button.type = 'button';
        button.className = 'theme-toggle';
        button.innerHTML = '<i class="fas fa-moon"></i>';
        actions.insertBefore(button, actions.firstChild);
    }
}

function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeToggleAppearance(current);

    toggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            console.warn('Gagal menyimpan preferensi tema:', error);
        }
        updateThemeToggleAppearance(theme);
    });
}

function updateThemeToggleAppearance(theme) {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    toggle.setAttribute('aria-label', theme === 'light' ? 'Aktifkan mode malam' : 'Aktifkan mode terang');
}

function hideSearchResults() {
    const panel = document.getElementById('searchResults');
    const container = document.getElementById('searchResultsContent');
    if (!panel || !container) return;
    panel.hidden = true;
    container.innerHTML = '<p class="search-empty">Mulai ketik untuk mencari manga.</p>';
}

function registerSearchOverlayDismissal() {
    if (window.__mangakuSearchDismissRegistered) return;
    window.__mangakuSearchDismissRegistered = true;

    document.addEventListener('click', (event) => {
        const panel = document.getElementById('searchResults');
        const input = document.getElementById('searchInput');
        if (!panel || !input || panel.hidden) return;
        if (panel.contains(event.target) || input.contains(event.target)) return;
        hideSearchResults();
    });
}

function initializeHome() {
    injectThemeToggle();
    initThemeToggle();
    hideSearchResults();
    registerSearchOverlayDismissal();

    const isHomePage = Boolean(document.querySelector('.home-toolbar'));

    if (isHomePage) {
        initUpdatesControls();
        initTypeTabs();

        if (document.getElementById('updatesCarousel')) {
            loadUpdates();
            scheduleUpdatesRefresh();
        }

        // Load other comics grid section
        if (document.getElementById('otherComicsGrid')) {
            loadOtherComics();
        }
    }
}

// ===== Load Other Comics Grid with Progressive Lazy Loading =====
let otherComicsCurrentPage = 1;
let otherComicsTotalPages = 1;
let otherComicsAllData = [];
let otherComicsNextScrapePage = 4; // Start from page 4 since we already loaded 1-3
let otherComicsIsLoading = false;
const ITEMS_PER_PAGE = 20;

async function loadOtherComics(page = 1) {
    const grid = document.getElementById('otherComicsGrid');
    const pagination = document.getElementById('otherComicsPagination');
    if (!grid) return;

    try {
        // Initial load: check cache first, then fetch if needed
        if (otherComicsAllData.length === 0) {
            grid.innerHTML = '<div class="updates-loading" style="grid-column: 1/-1;"><i class="fas fa-spinner fa-spin"></i><span>Memuat data...</span></div>';

            const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];
            const allowedGenres = ['isekai', 'fantasy', 'romance', 'ecchi', 'action'];

            // 1. Load from cache first (instant)
            let cachedData = CacheManager.getAllCached('all');
            console.log(`[Other Comics] Loaded ${cachedData.length} from cache`);

            // Filter cached data by genre
            let filteredCache = cachedData.filter(manga => {
                if (!manga.genres || !Array.isArray(manga.genres)) return false;
                const mangaGenres = manga.genres.map(g =>
                    (typeof g === 'string' ? g : g.name || '').toLowerCase()
                );
                return allowedGenres.some(genre =>
                    mangaGenres.some(mg => mg.includes(genre))
                );
            });

            otherComicsAllData = filteredCache;

            // 2. If cache has enough data, use it and fetch more in background
            if (otherComicsAllData.length > 100) {
                // Show cached data immediately
                renderOtherComics(otherComicsAllData.slice(0, ITEMS_PER_PAGE));
                updateOtherComicsPagination();
                if (pagination) pagination.style.display = 'flex';

                // Fetch fresh data in background
                fetchAndCacheOtherComics(sources, allowedGenres);
            } else {
                // Not enough cache, fetch immediately
                await fetchAndCacheOtherComics(sources, allowedGenres, true);
            }

            console.log(`[Other Comics] Initial load: ${otherComicsAllData.length} manga`);
        }

        // Progressive loading: if user reaches page 3 or near end, load more data
        const remainingPages = otherComicsTotalPages - page;
        if (remainingPages <= 2 && !otherComicsIsLoading) {
            loadMoreOtherComics();
        }

        // Calculate pagination
        otherComicsTotalPages = Math.ceil(otherComicsAllData.length / ITEMS_PER_PAGE);
        otherComicsCurrentPage = page;

        // Get data for current page
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = otherComicsAllData.slice(startIndex, endIndex);

        renderOtherComics(pageData);
        updateOtherComicsPagination();

        // Show pagination if more than 1 page
        if (pagination && otherComicsTotalPages > 1) {
            pagination.style.display = 'flex';
        }

    } catch (error) {
        console.error('Error loading other comics:', error);
        grid.innerHTML = '<div class="updates-empty" style="grid-column: 1/-1;">Gagal memuat data</div>';
    }
}

// ===== Fetch and Cache Comics =====
async function fetchAndCacheOtherComics(sources, allowedGenres, waitForCompletion = false) {
    try {
        // Fetch from 3 pages per source with incremental caching
        const fetchAndCache = async (source, page) => {
            try {
                const response = await fetch(`${API_BASE}/api/manga?source=${source}&page=${page}&limit=100&lang=id`);
                const result = await response.json();

                if (result.success && result.data && Array.isArray(result.data)) {
                    // Limit data to prevent cache quota issues
                    const limitedData = result.data.slice(0, 50); // Only cache first 50 items
                    // Cache in batches of 8 items
                    await CacheManager.processMangaBatch(limitedData, source, page);
                    return limitedData;
                }
            } catch (error) {
                console.error(`[FetchCache] Error fetching ${source} page ${page}:`, error);
            }
            return [];
        };

        // Fetch 3 pages from each source
        const fetchPromises = sources.flatMap(source => [
            fetchAndCache(source, 1),
            fetchAndCache(source, 2),
            fetchAndCache(source, 3)
        ]);

        if (waitForCompletion) {
            const results = await Promise.all(fetchPromises);

            // Combine and deduplicate
            const seenIds = new Set(otherComicsAllData.map(m => `${m.source}-${m.id}`));
            let newData = [];

            results.forEach(dataArray => {
                if (Array.isArray(dataArray)) {
                    dataArray.forEach(manga => {
                        const uniqueKey = `${manga.source}-${manga.id}`;
                        if (!seenIds.has(uniqueKey) && manga.id) {
                            // Filter by genre
                            if (manga.genres && Array.isArray(manga.genres)) {
                                const mangaGenres = manga.genres.map(g =>
                                    (typeof g === 'string' ? g : g.name || '').toLowerCase()
                                );
                                if (allowedGenres.some(genre => mangaGenres.some(mg => mg.includes(genre)))) {
                                    newData.push(manga);
                                    seenIds.add(uniqueKey);
                                }
                            }
                        }
                    });
                }
            });

            otherComicsAllData = [...otherComicsAllData, ...newData];
            console.log(`[FetchCache] Added ${newData.length} new manga. Total: ${otherComicsAllData.length}`);
        } else {
            // Background fetching - don't wait
            Promise.all(fetchPromises).then(() => {
                console.log('[FetchCache] Background fetch completed');
            });
        }
    } catch (error) {
        console.error('[FetchCache] Error:', error);
    }
}

// ===== Load More Data Progressively =====
async function loadMoreOtherComics() {
    if (otherComicsIsLoading) return;

    otherComicsIsLoading = true;
    console.log(`[Other Comics] Loading more data from page ${otherComicsNextScrapePage}...`);

    try {
        const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];
        const allowedGenres = ['isekai', 'fantasy', 'romance', 'ecchi', 'action'];

        // Fetch and cache next 2 pages from each source
        const fetchAndCache = async (source, page) => {
            try {
                const response = await fetch(`${API_BASE}/api/manga?source=${source}&page=${page}&limit=100&lang=id`);
                const result = await response.json();

                if (result.success && result.data && Array.isArray(result.data)) {
                    // Limit data to prevent cache quota issues
                    const limitedData = result.data.slice(0, 50); // Only cache first 50 items
                    // Cache incrementally
                    await CacheManager.processMangaBatch(limitedData, source, page);
                    return limitedData;
                }
            } catch (error) {
                console.error(`[LoadMore] Error fetching ${source} page ${page}:`, error);
            }
            return [];
        };

        const fetchPromises = sources.flatMap(source => [
            fetchAndCache(source, otherComicsNextScrapePage),
            fetchAndCache(source, otherComicsNextScrapePage + 1)
        ]);

        const results = await Promise.all(fetchPromises);

        // Combine and deduplicate new data
        const existingIds = new Set(otherComicsAllData.map(m => `${m.source}-${m.id}`));
        let newData = [];

        results.forEach(dataArray => {
            if (Array.isArray(dataArray)) {
                dataArray.forEach(manga => {
                    const uniqueKey = `${manga.source}-${manga.id}`;
                    if (!existingIds.has(uniqueKey) && manga.id) {
                        // Filter by genre
                        if (manga.genres && Array.isArray(manga.genres)) {
                            const mangaGenres = manga.genres.map(g =>
                                (typeof g === 'string' ? g : g.name || '').toLowerCase()
                            );
                            if (allowedGenres.some(genre => mangaGenres.some(mg => mg.includes(genre)))) {
                                newData.push(manga);
                                existingIds.add(uniqueKey);
                            }
                        }
                    }
                });
            }
        });

        // Add new data to existing data
        otherComicsAllData = [...otherComicsAllData, ...newData];
        otherComicsNextScrapePage += 2;

        console.log(`[Other Comics] Added ${newData.length} new manga. Total: ${otherComicsAllData.length}`);

        // Update pagination to show new pages
        otherComicsTotalPages = Math.ceil(otherComicsAllData.length / ITEMS_PER_PAGE);
        updateOtherComicsPagination();

    } catch (error) {
        console.error('[Other Comics] Error loading more data:', error);
    } finally {
        otherComicsIsLoading = false;
    }
}

function updateOtherComicsPagination() {
    const pageNumbers = document.getElementById('otherComicsPageNumbers');
    const prevBtn = document.getElementById('otherComicsPrevBtn');
    const nextBtn = document.getElementById('otherComicsNextBtn');

    if (!pageNumbers) return;

    // Update button states
    if (prevBtn) prevBtn.disabled = otherComicsCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = otherComicsCurrentPage === otherComicsTotalPages;

    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, otherComicsCurrentPage - 2);
    let endPage = Math.min(otherComicsTotalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // First page
    if (startPage > 1) {
        pageNumbers.innerHTML += `<button class="page-number" onclick="goToOtherComicsPage(1)">1</button>`;
        if (startPage > 2) {
            pageNumbers.innerHTML += '<span class="page-ellipsis">...</span>';
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === otherComicsCurrentPage ? ' active' : '';
        pageNumbers.innerHTML += `<button class="page-number${activeClass}" onclick="goToOtherComicsPage(${i})">${i}</button>`;
    }

    // Last page
    if (endPage < otherComicsTotalPages) {
        if (endPage < otherComicsTotalPages - 1) {
            pageNumbers.innerHTML += '<span class="page-ellipsis">...</span>';
        }
        pageNumbers.innerHTML += `<button class="page-number" onclick="goToOtherComicsPage(${otherComicsTotalPages})">${otherComicsTotalPages}</button>`;
    }
}

function goToOtherComicsPage(page) {
    if (page < 1 || page > otherComicsTotalPages) return;
    loadOtherComics(page);
    window.scrollTo({ top: document.getElementById('otherComicsSection').offsetTop - 100, behavior: 'smooth' });
}

function previousOtherComicsPage() {
    if (otherComicsCurrentPage > 1) {
        goToOtherComicsPage(otherComicsCurrentPage - 1);
    }
}

function nextOtherComicsPage() {
    // Auto-load more pages when reaching near the end
    const remainingPages = otherComicsTotalPages - otherComicsCurrentPage;
    if (remainingPages <= 2 && !otherComicsIsLoading) {
        console.log('[Pagination] Auto-loading more data...');
        loadMoreOtherComics();
    }

    if (otherComicsCurrentPage < otherComicsTotalPages) {
        goToOtherComicsPage(otherComicsCurrentPage + 1);
    }
}

// ===== Auto-load More on Scroll =====
let isCheckingScroll = false;

function checkScrollPosition() {
    if (isCheckingScroll) return;

    const pagination = document.getElementById('otherComicsPagination');
    if (!pagination || pagination.style.display === 'none') return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const scrollPercentage = (scrollPosition / pageHeight) * 100;

    // When user scrolls past 80% of page, load more
    if (scrollPercentage > 80) {
        isCheckingScroll = true;

        // Load more data if not at the end
        const remainingPages = otherComicsTotalPages - otherComicsCurrentPage;
        if (remainingPages <= 2 && !otherComicsIsLoading) {
            console.log('[Auto-scroll] Triggering progressive load...');
            loadMoreOtherComics().finally(() => {
                isCheckingScroll = false;
            });
        } else {
            isCheckingScroll = false;
        }
    }
}

// Add scroll listener for auto-loading
if (typeof window !== 'undefined') {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkScrollPosition, 200);
    });
}

function renderOtherComics(data) {
    const grid = document.getElementById('otherComicsGrid');
    if (!grid) return;

    if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = '<div class="updates-empty" style="grid-column: 1/-1;">Tidak ada manga ditemukan</div>';
        return;
    }

    grid.innerHTML = data.map(manga => {
        const genres = Array.isArray(manga.genres) ? manga.genres.slice(0, 3).map(g =>
            typeof g === 'string' ? g : (g.name || '')
        ) : [];

        return `
            <div class="manga-card" onclick="goToDetail('${escapeHtml(manga.id)}', '${escapeHtml(manga.source || 'mangadex')}')">
                <div class="manga-card-cover">
                    <img src="${manga.cover || manga.coverFull || 'https://via.placeholder.com/300x420?text=No+Cover'}"
                         alt="${escapeHtml(manga.title || 'Manga')}"
                         loading="lazy"
                         onerror="this.onerror=null;this.src='https://via.placeholder.com/300x420?text=No+Cover';">
                    <div class="manga-card-overlay">
                        <span class="manga-card-source">${escapeHtml(manga.source || 'All')}</span>
                        <span class="manga-card-chapter">${manga.latestChapter || manga.lastChapter ? `Ch. ${escapeHtml(manga.latestChapter || manga.lastChapter)}` : 'Terbaru'}</span>
                    </div>
                    ${manga.isNew ? '<span class="manga-card-badge">NEW</span>' : ''}
                </div>
                <div class="manga-card-body">
                    <h3 class="manga-card-title">${escapeHtml(manga.title || 'Tanpa Judul')}</h3>
                    <div class="manga-card-meta">
                        <span><i class="fas fa-star"></i> ${formatRating(manga.rating)}</span>
                        <span>${escapeHtml(formatType(manga.type || 'Manga'))}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Type Tab Functionality =====
let currentTypeFilter = 'manga';

function initTypeTabs() {
    const typeTabs = document.querySelectorAll('.type-tab');
    const indicator = document.getElementById('typeTabIndicator');

    if (!typeTabs.length) return;

    // Set initial active tab and indicator
    updateTabIndicator();

    // Add click handlers
    typeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const type = this.getAttribute('data-type');

            // Remove active class from all tabs
            typeTabs.forEach(t => t.classList.remove('active'));

            // Add active to clicked tab
            this.classList.add('active');

            // Update filter
            currentTypeFilter = type;

            // Update indicator position
            updateTabIndicator();

            // Reload updates with filter
            loadUpdates();
        });
    });
}

function updateTabIndicator() {
    const activeTab = document.querySelector('.type-tab.active');
    const indicator = document.getElementById('typeTabIndicator');

    if (!activeTab || !indicator) return;

    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = activeTab.parentElement.getBoundingClientRect();

    indicator.style.left = (tabRect.left - containerRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
}

function debounce(func, wait = 300) {
    let timeout;
    return function debounced(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Search Results Rendering =====
function renderSearchResults(results) {
    const panel = document.getElementById('searchResults');
    const container = document.getElementById('searchResultsContent');

    if (!panel || !container) return;

    if (!Array.isArray(results) || results.length === 0) {
        container.innerHTML = '<p class="search-empty">Tidak ada hasil ditemukan.</p>';
        panel.hidden = false;
        return;
    }

    container.innerHTML = results.map(manga => `
        <div class="search-result-item" onclick="goToDetail('${escapeHtml(manga.id)}', '${escapeHtml(manga.source || 'mangadex')}')">
            <img src="${manga.cover || manga.coverFull || 'https://via.placeholder.com/50x70?text=No+Cover'}"
                 alt="${escapeHtml(manga.title)}"
                 class="search-result-cover"
                 onerror="this.onerror=null;this.src='https://via.placeholder.com/50x70?text=No+Cover';">
            <div class="search-result-info">
                <div class="search-result-title">${escapeHtml(manga.title)}</div>
                <div class="search-result-meta">
                    <span class="search-result-source">${escapeHtml(manga.source || 'All')}</span>
                    ${manga.latestChapter ? `<span class="search-result-chapter">Ch. ${escapeHtml(manga.latestChapter)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    panel.hidden = false;
}

// ===== Show Popular Comics Section =====
function showPopular() {
    window.location.href = 'popular.html';
}

// ===== Show Latest Comics Section =====
function showLatest() {
    window.location.href = 'latest.html';
}

// ===== Handle Search Input =====
function handleSearch(event) {
    const term = event.target.value.trim();

    if (term.length < 2) {
        hideSearchResults();
        return;
    }

    if (event.key === 'Enter') {
        performSearch();
        return;
    }

    // Trigger search with debounce
    debounce(async () => {
        await searchManga(term);
    }, 350)();
}

// ===== Perform Search =====
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const term = searchInput.value.trim();
    if (term.length < 2) return;

    searchManga(term);
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page-specific functionality
    if (document.querySelector('.home-toolbar')) {
        initializeHome();
    }

    // Mobile search button functionality - works on all pages
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchBoxCenter = document.querySelector('.search-box-center');

    if (mobileSearchBtn && searchBoxCenter) {
        mobileSearchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            searchBoxCenter.classList.toggle('active');
            if (searchBoxCenter.classList.contains('active') && searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });
    }
    
    // Close search when clicking outside
    document.addEventListener('click', function(event) {
        const isMobileSearchBtn = mobileSearchBtn && mobileSearchBtn.contains(event.target);
        const isSearchBox = searchBoxCenter && searchBoxCenter.contains(event.target);

        if (!isMobileSearchBtn && !isSearchBox && searchBoxCenter) {
            searchBoxCenter.classList.remove('active');
        }

        if (searchResults && !searchResults.contains(event.target) && !isSearchBox) {
            searchResults.setAttribute('hidden', '');
        }
    });
});
