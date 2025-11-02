// Popular Page Script with Progressive Lazy Loading
// API_BASE is already declared in script.js
let currentPage = 1;
const itemsPerPage = 20;
let totalPages = 1;
let allData = [];
let nextScrapePage = 4; // Start from page 4
let isLoadingMore = false;

// Load popular comics
async function loadPopularComics(page = 1) {
    const grid = document.getElementById('popularGrid');
    const pagination = document.getElementById('pagination');

    if (!grid) return;

    // Show loading
    grid.innerHTML = `
        <div class="updates-loading" style="grid-column: 1/-1;">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Memuat komik popular...</span>
        </div>
    `;

    try {
        // Fetch from both server cache and live scraping in parallel
        const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];

        const fetchPromises = [
            // 1. Server cached data
            fetch(`${API_BASE}/api/updates?source=all&limit=2000&lang=id&sort=popular`)
                .then(res => res.json())
                .then(result => result.success && result.data ? result.data : [])
                .catch(() => []),

            // 2. Live scraping from each source - multiple pages
            ...sources.flatMap(source => [
                fetch(`${API_BASE}/api/manga?source=${source}&page=1&limit=100&lang=id`)
                    .then(res => res.json())
                    .then(result => result.success && result.data ? result.data : [])
                    .catch(() => []),
                fetch(`${API_BASE}/api/manga?source=${source}&page=2&limit=100&lang=id`)
                    .then(res => res.json())
                    .then(result => result.success && result.data ? result.data : [])
                    .catch(() => []),
                fetch(`${API_BASE}/api/manga?source=${source}&page=3&limit=100&lang=id`)
                    .then(res => res.json())
                    .then(result => result.success && result.data ? result.data : [])
                    .catch(() => [])
            ])
        ];

        const results = await Promise.all(fetchPromises);

        // Combine and deduplicate
        let combinedData = [];
        const seenIds = new Set();

        results.forEach(dataArray => {
            if (Array.isArray(dataArray)) {
                dataArray.forEach(manga => {
                    const uniqueKey = `${manga.source}-${manga.id}`;
                    if (!seenIds.has(uniqueKey) && manga.id) {
                        seenIds.add(uniqueKey);
                        combinedData.push(manga);
                    }
                });
            }
        });

        allData = combinedData;
        console.log(`[Popular] Initial load: ${allData.length} manga`);

        if (allData.length === 0) {
            grid.innerHTML = `
                <div class="updates-empty" style="grid-column: 1/-1;">
                    Tidak ada komik popular saat ini
                </div>
            `;
            pagination.style.display = 'none';
            return;
        }

        // Progressive loading: if user reaches near end, load more data
        const remainingPages = totalPages - page;
        if (remainingPages <= 2 && !isLoadingMore) {
            loadMorePopularData();
        }

        // Calculate pagination
        totalPages = Math.ceil(allData.length / itemsPerPage);
        currentPage = page;

        // Get data for current page
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = allData.slice(startIndex, endIndex);

        // Render cards
        renderComicsGrid(pageData);

        // Show and update pagination
        pagination.style.display = 'flex';
        updatePagination();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading popular comics:', error);
        grid.innerHTML = `
            <div class="updates-empty" style="grid-column: 1/-1; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle"></i>
                Gagal memuat data. <button onclick="loadPopularComics(${page})" style="margin-left: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Coba Lagi</button>
            </div>
        `;
        pagination.style.display = 'none';
    }
}

// Render comics grid - using manga-card for grid layout (like screenshot)
function renderComicsGrid(data) {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;

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
                        <span><i class="far fa-clock"></i> ${formatRelativeTime(manga.updatedAt || manga.lastUpdated || manga.date)}</span>
                    </div>
                    ${genres.length > 0 ? `<div class="manga-card-genres">${genres.map(g => `<span class="manga-card-genre">${escapeHtml(g)}</span>`).join('')}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions
function formatType(value) {
    if (!value) return 'Manga';
    return String(value)
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRating(value) {
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric)) return '8.0';
    return numeric.toFixed(1);
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

// Load more data progressively
async function loadMorePopularData() {
    if (isLoadingMore) return;

    isLoadingMore = true;
    console.log(`[Popular] Loading more data from page ${nextScrapePage}...`);

    try {
        const sources = ['mangadex', 'komiku', 'maid', 'bacamanga'];

        // Fetch next 2 pages from each source
        const fetchPromises = sources.flatMap(source => [
            fetch(`${API_BASE}/api/manga?source=${source}&page=${nextScrapePage}&limit=100&lang=id`)
                .then(res => res.json())
                .then(result => result.success && result.data ? result.data : [])
                .catch(() => []),
            fetch(`${API_BASE}/api/manga?source=${source}&page=${nextScrapePage + 1}&limit=100&lang=id`)
                .then(res => res.json())
                .then(result => result.success && result.data ? result.data : [])
                .catch(() => [])
        ]);

        const results = await Promise.all(fetchPromises);

        // Deduplicate and add new data
        const existingIds = new Set(allData.map(m => `${m.source}-${m.id}`));
        let newData = [];

        results.forEach(dataArray => {
            if (Array.isArray(dataArray)) {
                dataArray.forEach(manga => {
                    const uniqueKey = `${manga.source}-${manga.id}`;
                    if (!existingIds.has(uniqueKey) && manga.id) {
                        newData.push(manga);
                        existingIds.add(uniqueKey);
                    }
                });
            }
        });

        allData = [...allData, ...newData];
        nextScrapePage += 2;

        console.log(`[Popular] Added ${newData.length} new manga. Total: ${allData.length}`);

        // Update pagination
        totalPages = Math.ceil(allData.length / itemsPerPage);
        updatePagination();

    } catch (error) {
        console.error('[Popular] Error loading more data:', error);
    } finally {
        isLoadingMore = false;
    }
}

// Update pagination UI
function updatePagination() {
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!pageNumbers) return;

    // Update button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Generate page numbers
    let pagesHTML = '';
    const maxVisible = 5; // Show max 5 page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // First page
    if (startPage > 1) {
        pagesHTML += `<button class="page-number" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            pagesHTML += `<span class="page-ellipsis">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        pagesHTML += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagesHTML += `<span class="page-ellipsis">...</span>`;
        }
        pagesHTML += `<button class="page-number" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    pageNumbers.innerHTML = pagesHTML;
}

// Navigation functions
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    loadPopularComics(page);
}

function prevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Load on page load
// Note: escapeHtml and goToDetail functions are available from script.js
document.addEventListener('DOMContentLoaded', function() {
    loadPopularComics(1);
});
