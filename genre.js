// ===== Global Variables with Progressive Lazy Loading =====
let currentPage = 1;
let totalPages = 10;
let currentSource = 'all';
let currentGenre = [];
let currentSort = 'latest';
let currentLanguage = 'id';
let currentStatus = 'all';
let currentType = 'all';
let mangaData = [];
let allFetchedData = []; // Store all fetched data before filtering
let nextScrapePage = 4; // Start from page 4
let isLoadingMore = false;

const SOURCE_OPTIONS = [
    { value: 'all', label: 'Semua Sumber' },
    { value: 'mangadex', label: 'MangaDex' },
    { value: 'komiku', label: 'Komiku' },
    { value: 'maid', label: 'Maid' },
    { value: 'bacamanga', label: 'BacaManga' }
];
const GENRE_OPTIONS = [
    { value: 'all', label: 'Semua Genre' },
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'drama', label: 'Drama' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'romance', label: 'Romance' },
    { value: 'school-life', label: 'School Life' },
    { value: 'slice-of-life', label: 'Slice of Life' },
    { value: 'sports', label: 'Sports' },
    { value: 'supernatural', label: 'Supernatural' },
    { value: 'martial-arts', label: 'Martial Arts' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'sci-fi', label: 'Sci-Fi' },
    { value: 'horror', label: 'Horor' },
    { value: 'mecha', label: 'Mecha' },
    { value: 'isekai', label: 'Isekai' },
    { value: 'seinen', label: 'Seinen' },
    { value: 'shoujo', label: 'Shoujo' },
    { value: 'shounen', label: 'Shounen' },
    { value: 'ecchi', label: 'Ecchi' },
    { value: 'smut', label: 'Smut' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'historical', label: 'Historical' }
];
const STATUS_OPTIONS = [
    { value: 'all', label: 'Semua Status' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'cancelled', label: 'Cancelled' }
];
const TYPE_OPTIONS = [
    { value: 'all', label: 'Semua Jenis' },
    { value: 'manga', label: 'Manga' },
    { value: 'manhwa', label: 'Manhwa' },
    { value: 'manhua', label: 'Manhua' },
    { value: 'doujin', label: 'Doujin' },
    { value: 'webtoon', label: 'Webtoon' },
    { value: 'light-novel', label: 'Light Novel' },
    { value: 'comic', label: 'Comic' }
];

function populateSelectOptions(selectId, options, selectedValue) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '';

    options.forEach(option => {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        if (Array.isArray(selectedValue) && selectedValue.includes(option.value)) {
            element.selected = true;
        }
        select.appendChild(element);
    });

    if (!Array.isArray(selectedValue)) {
        const hasSelected = options.some(option => option.value === selectedValue);
        const fallback = options.length > 0 ? options[0].value : 'all';
        select.value = hasSelected ? selectedValue : fallback;
    }
}

function populateGenreCheckboxes() {
    const container = document.getElementById('genreCheckboxes');
    if (!container) return;

    container.innerHTML = '';

    GENRE_OPTIONS.forEach((genre, index) => {
        // Skip 'all' option since we want individual genres
        if (genre.value === 'all') return;

        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = genre.value;
        checkbox.id = `genre-${genre.value}`;
        checkbox.onchange = filterManga;
        
        // Check if this genre is currently selected
        if (currentGenre.includes(genre.value)) {
            checkbox.checked = true;
        }
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(genre.label));
        container.appendChild(label);
    });
}

function populateFilterOptions() {
    populateSelectOptions('sourceFilter', SOURCE_OPTIONS, currentSource);
    populateSelectOptions('statusFilter', STATUS_OPTIONS, currentStatus);
    populateSelectOptions('typeFilter', TYPE_OPTIONS, currentType);
    populateGenreCheckboxes();
}

function filterManga() {
    currentSource = document.getElementById('sourceFilter').value;
    
    // Get selected genres from checkboxes
    currentGenre = [];
    const checkboxes = document.querySelectorAll('#genreCheckboxes input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            currentGenre.push(checkbox.value);
        }
    });
    
    currentStatus = document.getElementById('statusFilter').value;
    currentType = document.getElementById('typeFilter').value;
    currentSort = document.getElementById('sortFilter').value;
    currentPage = 1;
    loadMangaList();
}

async function loadMangaList() {
    const grid = document.getElementById('mangaGrid');
    const loading = document.getElementById('loading');
    const pagination = document.getElementById('pagination');

    if (loading) loading.style.display = 'block';
    if (grid) grid.innerHTML = '';
    if (pagination) pagination.style.display = 'none';

    try {
        // Fetch manga data from both server cache and live scraping
        const sources = currentSource === 'all'
            ? ['mangadex', 'komiku', 'maid', 'bacamanga']
            : [currentSource];

        // Parallel fetch: server cache + live scraping from each source
        const fetchPromises = [
            // 1. Server cached data
            fetch(`${API_BASE}/api/updates?source=${currentSource}&limit=2000&lang=id&sort=${currentSort}`)
                .then(res => res.json())
                .then(result => result.success && result.data ? result.data : [])
                .catch(() => []),

            // 2. Live scraping from sources - multiple pages
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

        // Combine and deduplicate data
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

        if (combinedData.length > 0) {
            allFetchedData = combinedData; // Store for progressive loading
            console.log(`[Genre] Initial load: ${allFetchedData.length} manga`);

            // Apply client-side filtering
            let filtered = applyFilters(allFetchedData);

            // Progressive loading: if user reaches near end, load more data
            const remainingPages = totalPages - currentPage;
            if (remainingPages <= 2 && !isLoadingMore) {
                loadMoreGenreData();
            }

            // Calculate pagination
            const itemsPerPage = 20;
            totalPages = Math.ceil(filtered.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            mangaData = filtered.slice(startIndex, endIndex);

            displayMangaGrid(mangaData);
            updatePagination();
            if (pagination && totalPages > 1) pagination.style.display = 'flex';
        } else {
            showError('Gagal memuat manga.');
        }
    } catch (error) {
        console.error('Error loading manga:', error);
        showError('Terjadi kesalahan saat memuat manga.');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// Helper function to apply all filters
function applyFilters(data) {
    let filtered = data;

    // Filter by selected genres
    if (currentGenre.length > 0) {
        filtered = filtered.filter(manga => {
            if (!manga.genres || !Array.isArray(manga.genres)) return false;

            const mangaGenres = manga.genres.map(g =>
                (typeof g === 'string' ? g : g.name || '').toLowerCase()
            );

            // Check if manga has ALL selected genres
            return currentGenre.every(genre =>
                mangaGenres.some(mg => mg.includes(genre))
            );
        });
    }

    // Filter by status
    if (currentStatus !== 'all') {
        filtered = filtered.filter(manga =>
            (manga.status || '').toLowerCase() === currentStatus.toLowerCase()
        );
    }

    // Filter by type
    if (currentType !== 'all') {
        filtered = filtered.filter(manga =>
            (manga.type || '').toLowerCase().includes(currentType.toLowerCase())
        );
    }

    return filtered;
}

// Load more data progressively
async function loadMoreGenreData() {
    if (isLoadingMore) return;

    isLoadingMore = true;
    console.log(`[Genre] Loading more data from page ${nextScrapePage}...`);

    try {
        const sources = currentSource === 'all'
            ? ['mangadex', 'komiku', 'maid', 'bacamanga']
            : [currentSource];

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
        const existingIds = new Set(allFetchedData.map(m => `${m.source}-${m.id}`));
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

        allFetchedData = [...allFetchedData, ...newData];
        nextScrapePage += 2;

        console.log(`[Genre] Added ${newData.length} new manga. Total: ${allFetchedData.length}`);

        // Re-apply filters and update pagination
        const filtered = applyFilters(allFetchedData);
        const itemsPerPage = 20;
        totalPages = Math.ceil(filtered.length / itemsPerPage);
        updatePagination();

    } catch (error) {
        console.error('[Genre] Error loading more data:', error);
    } finally {
        isLoadingMore = false;
    }
}

function displayMangaGrid(data) {
    const grid = document.getElementById('mangaGrid');
    if (!grid) return;

    if (!data || data.length === 0) {
        grid.innerHTML = `<div class="manga-empty">Tidak ada manga ditemukan.</div>`;
        return;
    }

    // Use the same card structure as other pages
    grid.innerHTML = data.map(manga => createMangaCard(manga)).join('');
}

// Use the same manga card structure as other pages
function createMangaCard(manga) {
    const id = manga.id || '';
    const source = manga.source || 'mangadex';
    const title = manga.title || 'Tanpa Judul';
    const cover = manga.cover || manga.coverFull || 'https://via.placeholder.com/300x420?text=No+Cover';
    const latestChapter = manga.latestChapter || manga.lastChapter || manga.chapter || '';
    const rating = formatRating(manga.rating);
    const typeLabel = formatType(manga.type || 'Manga');
    const updated = formatRelativeTime(manga.updatedAt || manga.lastUpdated || manga.date);
    const genres = Array.isArray(manga.genres) ? manga.genres.slice(0, 3) : [];
    const badge = manga.isNew ? '<span class="manga-card-badge">NEW</span>' : '';

    return `
        <article class="manga-card" data-manga-card data-id="${escapeHtml(id)}" data-source="${escapeHtml(source)}">
            <div class="manga-card-cover">
                <img src="${cover}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x420?text=No+Cover';">
                <div class="manga-card-overlay">
                    <span class="manga-card-source">${escapeHtml(source)}</span>
                    <span class="manga-card-chapter">${latestChapter ? `Ch. ${escapeHtml(latestChapter)}` : 'Chapter terbaru'}</span>
                </div>
                ${badge}
            </div>
            <div class="manga-card-body">
                <h3 class="manga-card-title">${escapeHtml(title)}</h3>
                <div class="manga-card-meta">
                    <span><i class="fas fa-star"></i> ${rating}</span>
                    <span>${escapeHtml(typeLabel)}</span>
                    <span><i class="far fa-clock"></i> ${updated}</span>
                </div>
                ${genres.length ? `<div class="manga-card-genres">${genres.map(tag => `<span class="manga-card-genre">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </div>
        </article>
    `;
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

function updatePagination() {
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!pageNumbers || !prevBtn || !nextBtn) return;

    pageNumbers.innerHTML = '';
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.type = 'button';
        pageBtn.className = 'page-number' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = String(i);
        pageBtn.addEventListener('click', () => goToPage(i));
        pageNumbers.appendChild(pageBtn);
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function goToPage(page) {
    currentPage = page;
    loadMangaList();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadMangaList();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadMangaList();
    }
}

function showError(message) {
    const grid = document.getElementById('mangaGrid');
    if (grid) {
        grid.innerHTML = `<div class="manga-empty" style="color: var(--danger-color);">${message}</div>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function goToDetail(mangaId, source) {
    if (!mangaId) return;
    const idParam = encodeURIComponent(mangaId);
    const src = source && source !== 'all' ? source : 'mangadex';
    window.location.href = `detail.html?id=${idParam}&source=${encodeURIComponent(src)}`;
}

// Add click event to manga cards
document.addEventListener('DOMContentLoaded', () => {
    populateFilterOptions();
    loadMangaList();

    // Add pagination button event listeners
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', prevPage);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', nextPage);
    }

    // Add event delegation for manga card clicks
    document.getElementById('mangaGrid').addEventListener('click', function(e) {
        const card = e.target.closest('[data-manga-card]');
        if (card) {
            const mangaId = card.dataset.id;
            const source = card.dataset.source;
            goToDetail(mangaId, source);
        }
    });
});