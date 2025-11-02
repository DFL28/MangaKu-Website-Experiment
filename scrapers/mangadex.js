// ===== MangaDex API Scraper (No ScraperAPI needed) =====
const { URLSearchParams } = require('url');
const { fetchDirect, withRetry } = require('../utils/httpClient');

const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE_URL = 'https://uploads.mangadex.org/covers';

// ===== Get Manga List =====
async function getMangaList(options = {}) {
    try {
        const {
            limit = 20,
            offset = 0,
            order = { latestUploadedChapter: 'desc' },
            contentRating = ['safe', 'suggestive', 'erotica'],
            status = [],
            availableTranslatedLanguage = ['en']
        } = options;

        const query = buildMangaListQuery({
            limit,
            offset,
            order,
            contentRating,
            status,
            availableTranslatedLanguage
        });

        const response = await withRetry(() => fetchDirect(`${BASE_URL}/manga?${query}`, {
            headers: { Accept: 'application/json' }
        }));

        const mangaList = response.data.map(formatMangaListItem);
        return mangaList;
    } catch (error) {
        console.error('MangaDex getMangaList error:', error.message);
        return [];
    }
}

// ===== Get Manga Detail =====
async function getMangaDetail(mangaId) {
    try {
        const detailQuery = new URLSearchParams();
        detailQuery.append('includes[]', 'cover_art');
        detailQuery.append('includes[]', 'author');
        detailQuery.append('includes[]', 'artist');

        const response = await withRetry(() => fetchDirect(`${BASE_URL}/manga/${mangaId}?${detailQuery.toString()}`, {
            headers: { Accept: 'application/json' }
        }));

        return formatMangaDetail(response.data);
    } catch (error) {
        console.error('MangaDex getMangaDetail error:', error.message);
        return null;
    }
}

// ===== Get Chapters =====
async function getChapters(mangaId, options = {}) {
    try {
        const {
            limit = 100,
            offset = 0,
            translatedLanguage = ['en'],
            order = { chapter: 'desc' }
        } = options;

        const chapterQuery = buildChapterQuery({
            mangaId,
            limit,
            offset,
            translatedLanguage,
            order
        });

        const response = await withRetry(() => fetchDirect(`${BASE_URL}/chapter?${chapterQuery}`, {
            headers: { Accept: 'application/json' }
        }));

        return response.data.map(formatChapter);
    } catch (error) {
        console.error('MangaDex getChapters error:', error.message);
        return [];
    }
}

// ===== Get Chapter Pages =====
async function getChapterPages(chapterId) {
    try {
        // Get chapter data first to get hash
        const chapterResponse = await withRetry(() => fetchDirect(`${BASE_URL}/at-home/server/${chapterId}`, {
            headers: { Accept: 'application/json' }
        }));

        const { baseUrl, chapter } = chapterResponse;
        const { hash, data } = chapter;

        return data.map((page, index) => ({
            page: index + 1,
            url: `${baseUrl}/data/${hash}/${page}`,
            highQuality: `${baseUrl}/data/${hash}/${page}`,
            lowQuality: `${baseUrl}/data-saver/${hash}/${page}`
        }));
    } catch (error) {
        console.error('MangaDex getChapterPages error:', error.message);
        return [];
    }
}

// ===== Search Manga =====
async function searchManga(query, options = {}) {
    try {
        const {
            limit = 20,
            offset = 0,
            order = { relevance: 'desc' }
        } = options;

        const searchQuery = buildMangaListQuery({
            title: query,
            limit,
            offset,
            order,
            contentRating: ['safe', 'suggestive', 'erotica']
        });

        const response = await withRetry(() => fetchDirect(`${BASE_URL}/manga?${searchQuery}`, {
            headers: { Accept: 'application/json' }
        }));

        return response.data.map(formatMangaListItem);
    } catch (error) {
        console.error('MangaDex searchManga error:', error.message);
        return [];
    }
}

// ===== Get Popular Manga =====
async function getPopularManga(limit = 20) {
    return await getMangaList({
        limit,
        order: { rating: 'desc' }
    });
}

// ===== Get Latest Updates =====
async function getLatestUpdates(limit = 20) {
    return await getMangaList({
        limit,
        order: { latestUploadedChapter: 'desc' }
    });
}

// ===== Formatting Functions =====

// Helper function to convert language code to manga type
function getTypeFromLanguage(langCode) {
    if (!langCode) return 'Manga';
    const lang = langCode.toLowerCase();
    if (lang === 'ja' || lang === 'jp') return 'Manga';
    if (lang === 'ko' || lang === 'kr') return 'Manhwa';
    if (lang === 'zh' || lang === 'zh-hk' || lang === 'zh-ro') return 'Manhua';
    return 'Manga'; // Default
}

function formatMangaListItem(manga) {
    const attributes = manga.attributes;
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    
    // Replace optional chaining with compatible syntax
    let coverId = 'default.jpg';
    if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
        coverId = coverArt.attributes.fileName;
    }

    const originalLang = attributes.originalLanguage || 'ja';

    return {
        id: manga.id,
        title: attributes.title.en || attributes.title['ja-ro'] || Object.values(attributes.title)[0],
        altTitle: (attributes.altTitles.find(t => t.id) || {}).id || '',
        cover: `https://uploads.mangadex.org/covers/${manga.id}/${coverId}.256.jpg`,
        coverFull: `https://uploads.mangadex.org/covers/${manga.id}/${coverId}`,
        url: `https://mangadex.org/title/${manga.id}`,
        rating: calculateRating(attributes.contentRating),
        status: formatStatus(attributes.status),
        type: getTypeFromLanguage(originalLang),
        language: originalLang.toLowerCase(),
        languages: Array.isArray(attributes.availableTranslatedLanguages)
            ? attributes.availableTranslatedLanguages.map(lang => String(lang).toLowerCase())
            : [],
        latestChapter: attributes.lastChapter || 'N/A',
        genres: attributes.tags
            .filter(tag => tag.attributes.group === 'genre')
            .map(tag => tag.attributes.name.en)
            .slice(0, 5),
        isNew: isRecent(attributes.createdAt),
        source: 'mangadex',
        description: attributes.description.en || Object.values(attributes.description)[0] || ''
    };
}

function formatMangaDetail(manga) {
    const attributes = manga.attributes;
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    
    // Replace optional chaining with compatible syntax
    let coverId = 'default.jpg';
    if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
        coverId = coverArt.attributes.fileName;
    }
    
    const author = manga.relationships.find(rel => rel.type === 'author');
    const artist = manga.relationships.find(rel => rel.type === 'artist');
    const originalLang = attributes.originalLanguage || 'ja';

    return {
        id: manga.id,
        title: attributes.title.en || attributes.title['ja-ro'] || Object.values(attributes.title)[0],
        altTitle: (attributes.altTitles.find(t => t.id) || {}).id || '',
        cover: `https://uploads.mangadex.org/covers/${manga.id}/${coverId}`,
        url: `https://mangadex.org/title/${manga.id}`,
        rating: calculateRating(attributes.contentRating),
        status: formatStatus(attributes.status),
        type: getTypeFromLanguage(originalLang),
        language: originalLang.toLowerCase(),
        languages: Array.isArray(attributes.availableTranslatedLanguages)
            ? attributes.availableTranslatedLanguages.map(lang => String(lang).toLowerCase())
            : [],

        // Replace optional chaining with compatible syntax
        author: (author && author.attributes && author.attributes.name) ? author.attributes.name : 'Unknown',
        artist: (artist && artist.attributes && artist.attributes.name) ? artist.attributes.name : 'Unknown',

        genres: attributes.tags
            .filter(tag => tag.attributes.group === 'genre')
            .map(tag => tag.attributes.name.en),
        themes: attributes.tags
            .filter(tag => tag.attributes.group === 'theme')
            .map(tag => tag.attributes.name.en),
        description: attributes.description.en || Object.values(attributes.description)[0] || '',
        year: new Date(attributes.createdAt).getFullYear(),
        source: 'mangadex',
        originalLanguage: originalLang,
        publicationDemographic: attributes.publicationDemographic,
        lastChapter: attributes.lastChapter,
        lastVolume: attributes.lastVolume
    };
}

function formatChapter(chapter) {
    const attributes = chapter.attributes;
    const scanlationGroup = chapter.relationships.find(rel => rel.type === 'scanlation_group');

    return {
        id: chapter.id,
        title: attributes.title || `Chapter ${attributes.chapter || 'N/A'}`,
        number: parseFloat(attributes.chapter) || 0,
        volume: attributes.volume || null,
        pages: attributes.pages,
        translatedLanguage: attributes.translatedLanguage,
        date: new Date(attributes.publishAt).toISOString(),
        
        // Replace optional chaining with compatible syntax
        scanlationGroup: (scanlationGroup && scanlationGroup.attributes && scanlationGroup.attributes.name) 
            ? scanlationGroup.attributes.name : 'Unknown',
            
        url: `https://mangadex.org/chapter/${chapter.id}`,
        isNew: isRecent(attributes.publishAt, 7) // New if less than 7 days old
    };
}

// ===== Helper Functions =====

function calculateRating(contentRating) {
    // Convert content rating to numeric score
    const ratings = {
        'safe': 9.0,
        'suggestive': 8.5,
        'erotica': 8.0,
        'pornographic': 7.5
    };
    return (ratings[contentRating] || 8.0).toFixed(1);
}

function formatStatus(status) {
    const statusMap = {
        'ongoing': 'Ongoing',
        'completed': 'Completed',
        'hiatus': 'Hiatus',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Unknown';
}

function isRecent(dateString, daysThreshold = 30) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold;
}

function buildMangaListQuery(options = {}) {
    const {
        limit = 20,
        offset = 0,
        order = { latestUploadedChapter: 'desc' },
        contentRating = ['safe', 'suggestive', 'erotica'],
        status = [],
        availableTranslatedLanguage = ['en'],
        title = null
    } = options;

    const query = new URLSearchParams();
    query.set('limit', String(limit));
    query.set('offset', String(offset));
    query.set('hasAvailableChapters', 'true');
    query.append('includes[]', 'cover_art');

    if (title) {
        query.set('title', title);
    }

    if (order && typeof order === 'object') {
        Object.entries(order).forEach(([key, value]) => {
            if (value) {
                query.set(`order[${key}]`, String(value));
            }
        });
    }

    const addArray = (key, values, { allowAll = false } = {}) => {
        if (!Array.isArray(values)) return;
        values
            .map(val => String(val || '').trim())
            .filter(val => {
                if (!val) return false;
                if (!allowAll && val.toLowerCase() === 'all') return false;
                return true;
            })
            .forEach(val => query.append(`${key}[]`, val));
    };

    addArray('contentRating', contentRating);
    addArray('status', status);
    addArray('availableTranslatedLanguage', availableTranslatedLanguage, { allowAll: false });

    return query.toString();
}

function buildChapterQuery(options = {}) {
    const {
        mangaId,
        limit = 100,
        offset = 0,
        translatedLanguage = ['en'],
        order = { chapter: 'desc' }
    } = options;

    const query = new URLSearchParams();
    if (mangaId) {
        query.append('manga', mangaId);
    }
    query.set('limit', String(limit));
    query.set('offset', String(offset));
    query.append('includes[]', 'scanlation_group');

    if (order && typeof order === 'object') {
        Object.entries(order).forEach(([key, value]) => {
            if (value) {
                query.set(`order[${key}]`, String(value));
            }
        });
    }

    if (Array.isArray(translatedLanguage)) {
        translatedLanguage
            .map(val => String(val || '').trim())
            .filter(Boolean)
            .forEach(val => query.append('translatedLanguage[]', val));
    }

    return query.toString();
}

// ===== Export =====
module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    getChapterPages,
    searchManga,
    getPopularManga,
    getLatestUpdates
};
