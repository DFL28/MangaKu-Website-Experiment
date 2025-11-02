// ===== Global Variables =====
const API_BASE = window.location.origin;
let currentMangaId = null;
let currentSource = 'mangadex';
let mangaDetails = null;
let chapters = [];
let isChapterAscending = false;
let filteredChapters = [];
let availableChapterLanguages = [];

const ChapterLanguagePreference = {
    STORAGE_KEY: 'mangaku_preferred_chapter_lang',
    get() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'id';
        } catch (error) {
            console.warn('Failed to read chapter language preference:', error);
            return 'id';
        }
    },
    set(lang) {
        try {
            localStorage.setItem(this.STORAGE_KEY, lang);
        } catch (error) {
            console.warn('Failed to save chapter language preference:', error);
        }
    }
};

let chapterLanguage = ChapterLanguagePreference.get();
const LANGUAGE_LABELS = {
    id: 'Indonesia',
    en: 'Inggris',
    ms: 'Melayu',
    jp: 'Jepang',
    all: 'Semua'
};

// ===== Bookmark Manager =====
const BookmarkManager = {
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

    remove(mangaId, source) {
        const bookmarks = this.getAll();
        const filtered = bookmarks.filter(b => !(b.id === mangaId && b.source === source));
        return this.save(filtered);
    }
};

// ===== Get URL Parameters =====
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ===== Load Manga Details from API =====
async function loadMangaDetail() {
    currentMangaId = getUrlParameter('id');
    currentSource = getUrlParameter('source') || 'mangadex';

    if (!currentMangaId) {
        window.location.href = 'index.html';
        return;
    }

    const loading = document.getElementById('chapterLoading');
    if (loading) loading.classList.add('active');

    console.log('🔄 Loading manga detail:', currentMangaId, 'from', currentSource);

    try {
        // Add timeout protection
        const timeout = (ms) => new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), ms)
        );

        // Load manga detail and chapters in parallel with 30s timeout
        console.log('📡 Fetching detail and chapters...');
        const [detailResponse, chaptersResponse] = await Promise.race([
            Promise.all([
                fetch(`${API_BASE}/api/manga/${currentMangaId}?source=${currentSource}`),
                fetch(`${API_BASE}/api/manga/${currentMangaId}/chapters?source=${currentSource}`)
            ]),
            timeout(30000)
        ]);

        console.log('📥 Received responses');
        const detailResult = await detailResponse.json();
        const chaptersResult = await chaptersResponse.json();

        console.log('📦 Detail:', detailResult.success ? 'OK' : 'FAIL');
        console.log('📦 Chapters:', chaptersResult.success ? `${(chaptersResult.data && chaptersResult.data.length) || 0} chapters` : 'FAIL');

        if (detailResult.success && detailResult.data) {
            mangaDetails = detailResult.data;
            displayMangaDetail(mangaDetails);
        } else {
            showError('Manga tidak ditemukan');
            return;
        }

        if (chaptersResult.success) {
            chapters = chaptersResult.data || [];
            initializeChapterLanguageControls();
            applyChapterLanguageFilter();
        }

        loadRelatedManga();

    } catch (error) {
        console.error('Load manga detail error:', error);
        showError('Terjadi kesalahan saat memuat detail manga');
    } finally {
        if (loading) loading.classList.remove('active');
    }
}

// ===== Display Manga Detail =====
function displayMangaDetail(manga) {
    // Update page title
    document.title = `${manga.title} - MangaKu`;

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = manga.title;

    // Update cover
    const cover = document.getElementById('mangaCover');
    if (cover) {
        cover.src = manga.cover || manga.coverFull || 'https://via.placeholder.com/400x600?text=No+Cover';
        cover.alt = manga.title;
        cover.onerror = function() {
            this.src = 'https://via.placeholder.com/400x600?text=No+Cover';
        };
    }

    // Update title
    const title = document.getElementById('mangaTitle');
    if (title) title.textContent = manga.title;

    const altTitle = document.getElementById('mangaAltTitle');
    if (altTitle && manga.altTitle) {
        altTitle.textContent = manga.altTitle;
    }

    // Update rating
    const rating = document.getElementById('mangaRating');
    if (rating) {
        rating.innerHTML = `<i class="fas fa-star"></i><span>${manga.rating || '8.0'}</span>`;
    }

    // Update stats
    const status = document.getElementById('mangaStatus');
    if (status) status.textContent = manga.status || 'Unknown';

    const author = document.getElementById('mangaAuthor');
    if (author) author.textContent = manga.author || 'Unknown';

    const views = document.getElementById('mangaViews');
    if (views) views.textContent = formatNumber(manga.views || 0);

    // Update genres
    const genresContainer = document.getElementById('mangaGenres');
    if (genresContainer && manga.genres) {
        genresContainer.innerHTML = manga.genres
            .map(genre => `<span class="genre-tag">${escapeHtml(genre)}</span>`)
            .join('');
    }

    // Update description
    const description = document.getElementById('mangaDescription');
    if (description) {
        description.innerHTML = `<p>${escapeHtml(manga.description || 'Tidak ada deskripsi')}</p>`;
    }

    // Update bookmark button state
    updateBookmarkButton();
}

// ===== Update Bookmark Button =====
function updateBookmarkButton() {
    const bookmarkBtn = document.querySelector('.btn-secondary[onclick="toggleBookmark()"]');
    if (!bookmarkBtn || !mangaDetails) return;

    const isBookmarked = BookmarkManager.isBookmarked(currentMangaId, currentSource);
    const icon = bookmarkBtn.querySelector('i');

    if (isBookmarked) {
        icon.className = 'fas fa-bookmark';
        bookmarkBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)';
        bookmarkBtn.title = 'Hapus dari bookmark';
    } else {
        icon.className = 'far fa-bookmark';
        bookmarkBtn.style.background = '';
        bookmarkBtn.title = 'Tambah ke bookmark';
    }
}

// ===== Display Chapter List =====
function displayChapterList(chapterList) {
    const container = document.getElementById('chapterList');
    if (!container) return;

    container.innerHTML = '';

    if (!chapterList || chapterList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fas fa-book-open" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Tidak ada chapter tersedia</p>
            </div>
        `;
        return;
    }

    chapterList.forEach(chapter => {
        const item = createChapterItem(chapter);
        container.appendChild(item);
    });
}

// ===== Chapter Language Helpers =====
function initializeChapterLanguageControls() {
    if (!Array.isArray(chapters)) {
        availableChapterLanguages = ['id', 'all'];
    } else {
        const detected = chapters
            .map(getChapterLanguage)
            .filter(Boolean);
        const unique = Array.from(new Set(detected));
        if (!unique.includes('id')) unique.unshift('id');
        availableChapterLanguages = Array.from(new Set(unique));
        if (!availableChapterLanguages.includes('all')) {
            availableChapterLanguages.push('all');
        }
    }

    if (!availableChapterLanguages.includes(chapterLanguage)) {
        chapterLanguage = availableChapterLanguages.includes('id')
            ? 'id'
            : availableChapterLanguages[0] || 'all';
        ChapterLanguagePreference.set(chapterLanguage);
    }

    renderChapterLanguageMenu();
    updateChapterLanguageLabel();
}

function renderChapterLanguageMenu() {
    const menu = document.getElementById('chapterSettingsMenu');
    if (!menu) return;

    menu.innerHTML = '';

    availableChapterLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.lang = lang;
        if (lang === chapterLanguage) {
            button.classList.add('active');
        }

        button.innerHTML = `
            <span>${escapeHtml(getLanguageLabel(lang))}</span>
            <span class="count">${countChaptersByLanguage(lang)}</span>
        `;

        button.addEventListener('click', () => setChapterLanguage(lang));
        menu.appendChild(button);
    });
}

function countChaptersByLanguage(lang) {
    if (!Array.isArray(chapters)) return 0;
    if (lang === 'all') return chapters.length;
    return chapters.filter(chapter => getChapterLanguage(chapter) === lang).length;
}

function setChapterLanguage(lang) {
    if (chapterLanguage === lang) {
        toggleChapterSettings(true);
        return;
    }

    chapterLanguage = lang;
    ChapterLanguagePreference.set(lang);
    updateChapterLanguageLabel();
    renderChapterLanguageMenu();
    applyChapterLanguageFilter();
    toggleChapterSettings(true);
}

function toggleChapterSettings(forceClose = false) {
    const menu = document.getElementById('chapterSettingsMenu');
    const button = document.getElementById('chapterSettingsBtn');
    if (!menu || !button) return;

    const shouldOpen = forceClose ? false : !menu.classList.contains('active');
    menu.classList.toggle('active', shouldOpen);
    button.classList.toggle('active', shouldOpen);
}

function updateChapterLanguageLabel() {
    const label = document.getElementById('chapterLanguageLabel');
    if (label) {
        label.textContent = getLanguageLabel(chapterLanguage);
    }
}

function updateChapterLanguageNotice(message, warn = false) {
    const notice = document.getElementById('chapterLanguageNotice');
    if (!notice) return;

    if (!message) {
        notice.textContent = '';
        notice.classList.remove('warning');
        notice.style.display = 'none';
        return;
    }

    notice.textContent = message;
    notice.classList.toggle('warning', warn);
    notice.style.display = 'block';
}

function getChapterLanguage(chapter) {
    if (!chapter || typeof chapter !== 'object') return 'id';
    return (
        chapter.translatedLanguage ||
        chapter.language ||
        chapter.lang ||
        chapter.locale ||
        'id'
    );
}

function getLanguageLabel(code) {
    if (!code) return '???';
    return LANGUAGE_LABELS[code] || (code.toUpperCase && code.toUpperCase()) || '???';
}

function applyChapterLanguageFilter() {
    if (!Array.isArray(chapters) || chapters.length === 0) {
        filteredChapters = [];
        displayChapterList([]);
        updateChapterLanguageNotice('');
        return;
    }

    let notice = '';
    let warn = false;
    let toDisplay = [];

    if (chapterLanguage === 'all') {
        toDisplay = chapters.slice();
        notice = 'Menampilkan semua subtitle.';
    } else {
        const filtered = chapters.filter(
            chapter => getChapterLanguage(chapter) === chapterLanguage
        );

        if (filtered.length > 0) {
            toDisplay = filtered;
            notice = `Menampilkan subtitle ${getLanguageLabel(chapterLanguage)}.`;
        } else {
            toDisplay = chapters.slice();
            notice = `Tidak ada chapter dengan subtitle ${getLanguageLabel(chapterLanguage)}. Menampilkan semua subtitle.`;
            warn = true;
        }
    }

    filteredChapters = toDisplay;
    displayChapterList(toDisplay);
    updateChapterLanguageNotice(notice, warn);
}

// ===== Create Chapter Item =====
function createChapterItem(chapter) {
    const item = document.createElement('div');
    item.className = 'chapter-item';
    item.onclick = () => readChapter(chapter.id);

    const isNew = chapter.isNew ? '<span class="chapter-new">NEW</span>' : '';
    const views = chapter.views ? `${formatNumber(chapter.views)} views` : '';
    const langCode = getChapterLanguage(chapter);
    const languageBadge =
        langCode && langCode !== 'id'
            ? `<span class="chapter-lang-badge">${escapeHtml(getLanguageLabel(langCode))}</span>`
            : '';

    item.innerHTML = `
        <div class="chapter-info">
            <div class="chapter-title">${escapeHtml(chapter.title)}</div>
            <div class="chapter-meta">
                ${languageBadge}
                ${views ? `<span>${views}</span>` : ''}
                ${isNew}
            </div>
        </div>
        <div class="chapter-date">
            <i class="far fa-clock"></i>
            ${formatDate(chapter.date)}
        </div>
    `;

    return item;
}

// ===== Chapter Functions =====
function toggleChapterSort() {
    isChapterAscending = !isChapterAscending;
    chapters.reverse();
    applyChapterLanguageFilter();
}

function readChapter(chapterId) {
    window.location.href = `reader.html?manga=${currentMangaId}&chapter=${chapterId}&source=${currentSource}`;
}

function readFirstChapter() {
    const sourceList = (filteredChapters.length ? filteredChapters : chapters);
    if (sourceList.length > 0) {
        readChapter(sourceList[0].id);
    } else {
        alert('Belum ada chapter tersedia');
    }
}

// ===== Chapter Search =====
const chapterSearch = document.getElementById('chapterSearch');
if (chapterSearch) {
    chapterSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            applyChapterLanguageFilter();
            return;
        }

        const sourceList = filteredChapters.length ? filteredChapters : chapters;
        const filtered = sourceList.filter(chapter =>
            chapter.title.toLowerCase().includes(searchTerm)
        );
        displayChapterList(filtered);
    });
}

document.addEventListener('click', (event) => {
    const menu = document.getElementById('chapterSettingsMenu');
    const button = document.getElementById('chapterSettingsBtn');
    if (!menu || !button) return;
    if (!menu.classList.contains('active')) return;

    if (!menu.contains(event.target) && !button.contains(event.target)) {
        toggleChapterSettings(true);
    }
});

// ===== Action Functions =====
function toggleBookmark() {
    if (!mangaDetails) {
        showNotification('Tunggu detail manga selesai dimuat!');
        return;
    }

    const isBookmarked = BookmarkManager.isBookmarked(currentMangaId, currentSource);

    if (isBookmarked) {
        // Remove bookmark
        if (BookmarkManager.remove(currentMangaId, currentSource)) {
            showNotification('Dihapus dari bookmark!');
            updateBookmarkButton();
        } else {
            showNotification('Gagal menghapus bookmark!');
        }
    } else {
        // Add bookmark
        const bookmarkData = {
            id: currentMangaId,
            source: currentSource,
            title: mangaDetails.title,
            cover: mangaDetails.cover || mangaDetails.coverFull
        };

        if (BookmarkManager.add(bookmarkData)) {
            showNotification('Ditambahkan ke bookmark!');
            updateBookmarkButton();
        } else {
            showNotification('Gagal menambahkan bookmark!');
        }
    }
}

function shareContent() {
    const url = window.location.href;
    const title = mangaDetails.title;

    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Baca ${title} di MangaKu`,
            url: url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('Link disalin ke clipboard!');
}

function showNotification(message) {
    // Simple notification - can be enhanced
    alert(message);
}

// ===== Load Related Manga =====
async function loadRelatedManga() {
    const container = document.getElementById('relatedManga');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/manga?source=${currentSource}&limit=6`);
        const result = await response.json();

        if (result.success && result.data) {
            container.innerHTML = '';

            result.data.slice(0, 6).forEach(manga => {
                const card = createRelatedMangaCard(manga);
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Load related manga error:', error);
    }
}

function createRelatedMangaCard(manga) {
    const card = document.createElement('div');
    card.className = 'manga-card';
    card.onclick = () => {
        window.location.href = `detail.html?id=${manga.id}&source=${manga.source}`;
    };

    card.innerHTML = `
        <div class="manga-cover">
            <img src="${manga.cover || manga.coverFull || 'https://via.placeholder.com/300x420?text=No+Cover'}"
                 alt="${escapeHtml(manga.title)}"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x420?text=No+Cover'">
            <div class="manga-rating">
                <i class="fas fa-star"></i>
                ${manga.rating || '8.0'}
            </div>
        </div>
        <div class="manga-info">
            <h3 class="manga-title">${escapeHtml(manga.title)}</h3>
            <div class="manga-meta">
                <span class="manga-source">${manga.source}</span>
                <span class="manga-chapter">Ch. ${manga.latestChapter || 'N/A'}</span>
            </div>
        </div>
    `;

    return card;
}

// ===== Utility Functions =====
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hari ini';
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari lalu`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;

        return date.toLocaleDateString('id-ID');
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const detailContainer = document.querySelector('.manga-detail');
    if (detailContainer) {
        detailContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--danger-color);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>${message}</p>
                <button onclick="window.location.href='index.html'" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Kembali ke Beranda
                </button>
            </div>
        `;
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    loadMangaDetail();
});
