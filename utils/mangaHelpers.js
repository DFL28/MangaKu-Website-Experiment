const DEFAULT_PAGE_SIZE = 20;

function normalizeTag(value) {
    if (!value) return '';
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function applyMangaFilters(list, filters = {}) {
    if (!Array.isArray(list)) return [];

    const {
        genre = 'all',
        status = 'all',
        type = 'all',
        language = 'all'
    } = filters;

    const normalizedGenre = normalizeTag(genre);
    const normalizedStatus = normalizeTag(status);
    const normalizedType = normalizeTag(type);
    const normalizedLanguage = normalizeTag(language);

    return list.filter(item => {
        if (!item) return false;

        // Fix: Check if item.genres exists and is an array before processing
        if (normalizedGenre && normalizedGenre !== 'all') {
            const tags = Array.isArray(item.genres) ? item.genres.map(normalizeTag) : [];
            // Fix: Use 'includes' instead of exact match for better matching
            if (tags.length > 0 && !tags.some(tag => tag.includes(normalizedGenre))) {
                return false;
            }
        }

        if (normalizedStatus && normalizedStatus !== 'all') {
            const statusValue = normalizeTag(item.status || '');
            if (!statusValue.includes(normalizedStatus)) {
                return false;
            }
        }

        if (normalizedType && normalizedType !== 'all') {
            const typeValue = normalizeTag(item.type || '');
            if (!typeValue.includes(normalizedType)) {
                return false;
            }
        }

        if (normalizedLanguage && normalizedLanguage !== 'all') {
            const itemLanguages = Array.isArray(item.languages)
                ? item.languages.map(normalizeTag)
                : [];
            const primaryLanguage = normalizeTag(item.language || '');

            if (
                !itemLanguages.includes(normalizedLanguage) &&
                primaryLanguage !== normalizedLanguage
            ) {
                return false;
            }
        }

        return true;
    });
}

function safeRating(value) {
    const numeric = parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function extractChapterNumberSafe(value) {
    if (!value) return 0;
    const match = String(value).match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
}

function applyMangaSort(list, sortKey = 'latest') {
    if (!Array.isArray(list)) return [];
    const sortable = [...list];

    switch (sortKey) {
        case 'title':
            sortable.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'popular':
        case 'rating':
            sortable.sort((a, b) => safeRating(b.rating) - safeRating(a.rating));
            break;
        case 'latest':
        default:
            sortable.sort((a, b) => {
                const bChapter = extractChapterNumberSafe(b.latestChapter || b.lastChapter || b.chapter);
                const aChapter = extractChapterNumberSafe(a.latestChapter || a.lastChapter || a.chapter);
                if (bChapter !== aChapter) {
                    return bChapter - aChapter;
                }

                const bDate = new Date(
                    b.updatedAt ||
                    b.lastUpdated ||
                    b.date ||
                    b.publishedAt ||
                    b.savedAt ||
                    0
                ).getTime();
                const aDate = new Date(
                    a.updatedAt ||
                    a.lastUpdated ||
                    a.date ||
                    a.publishedAt ||
                    a.savedAt ||
                    0
                ).getTime();
                return bDate - aDate;
            });
            break;
    }

    return sortable;
}

function calculateTotalPages(list, pageSize = DEFAULT_PAGE_SIZE) {
    if (!Array.isArray(list) || list.length === 0) {
        return 1;
    }
    return Math.max(1, Math.ceil(list.length / pageSize));
}

module.exports = {
    normalizeTag,
    applyMangaFilters,
    applyMangaSort,
    calculateTotalPages,
    DEFAULT_PAGE_SIZE
};
