// ===== Jikan API Scraper =====
// MyAnimeList unofficial API v4

const { fetchDirect } = require('../utils/httpClient');

const BASE_URL = 'https://api.jikan.moe/v4';

// Rate limiting: 3 requests per second, 60 per minute
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // ms between requests

async function rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}

// ===== Get Top Manga =====
async function getMangaList(page = 1) {
    try {
        await rateLimit();

        const response = await fetchDirect(`${BASE_URL}/top/manga?page=${page}&limit=25`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.data || !Array.isArray(response.data)) {
            console.warn('[Jikan] No data received');
            return [];
        }

        return response.data.map(manga => ({
            id: String(manga.mal_id),
            title: manga.title || manga.title_english || 'Unknown',
            altTitle: manga.title_japanese || manga.title_synonyms?.[0] || '',
            cover: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || null,
            coverFull: manga.images?.jpg?.large_image_url || null,
            rating: manga.score ? String(manga.score) : '8.0',
            latestChapter: manga.chapters ? String(manga.chapters) : 'N/A',
            status: manga.status || 'Unknown',
            type: manga.type || 'Manga',
            genres: manga.genres?.map(g => g.name) || [],
            description: manga.synopsis || '',
            source: 'jikan',
            url: manga.url,
            members: manga.members,
            favorites: manga.favorites,
            rank: manga.rank
        }));
    } catch (error) {
        console.error('[Jikan] getMangaList error:', error.message);
        return [];
    }
}

// ===== Search Manga =====
async function searchManga(query, page = 1) {
    try {
        await rateLimit();

        const response = await fetchDirect(`${BASE_URL}/manga?q=${encodeURIComponent(query)}&page=${page}&limit=20`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.data || !Array.isArray(response.data)) {
            return [];
        }

        return response.data.map(manga => ({
            id: String(manga.mal_id),
            title: manga.title || manga.title_english || 'Unknown',
            altTitle: manga.title_japanese || '',
            cover: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || null,
            rating: manga.score ? String(manga.score) : '8.0',
            type: manga.type || 'Manga',
            source: 'jikan',
            url: manga.url
        }));
    } catch (error) {
        console.error('[Jikan] searchManga error:', error.message);
        return [];
    }
}

// ===== Get Manga Detail =====
async function getMangaDetail(mangaId) {
    try {
        await rateLimit();

        const response = await fetchDirect(`${BASE_URL}/manga/${mangaId}/full`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const manga = response.data;
        if (!manga) return null;

        return {
            id: String(manga.mal_id),
            title: manga.title || 'Unknown',
            altTitle: manga.title_japanese || manga.title_synonyms?.[0] || '',
            cover: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || null,
            coverFull: manga.images?.jpg?.large_image_url || null,
            rating: manga.score ? String(manga.score) : '8.0',
            status: manga.status || 'Unknown',
            type: manga.type || 'Manga',
            author: manga.authors?.map(a => a.name).join(', ') || 'Unknown',
            genres: manga.genres?.map(g => g.name) || [],
            themes: manga.themes?.map(t => t.name) || [],
            description: manga.synopsis || 'No description available',
            chapters: manga.chapters,
            volumes: manga.volumes,
            source: 'jikan',
            url: manga.url,
            members: manga.members,
            favorites: manga.favorites,
            rank: manga.rank,
            popularity: manga.popularity
        };
    } catch (error) {
        console.error('[Jikan] getMangaDetail error:', error.message);
        return null;
    }
}

// ===== Get Popular Manga =====
async function getPopularManga(page = 1) {
    try {
        await rateLimit();

        const response = await fetchDirect(`${BASE_URL}/manga?order_by=members&sort=desc&page=${page}&limit=25`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.data) return [];

        return response.data.map(manga => ({
            id: String(manga.mal_id),
            title: manga.title || 'Unknown',
            cover: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || null,
            rating: manga.score ? String(manga.score) : '8.0',
            type: manga.type || 'Manga',
            source: 'jikan',
            url: manga.url,
            members: manga.members
        }));
    } catch (error) {
        console.error('[Jikan] getPopularManga error:', error.message);
        return [];
    }
}

// Note: Jikan doesn't provide chapter lists as it's based on MyAnimeList data
// Chapters would need to be scraped from actual manga reading sites
async function getChapters(mangaId) {
    console.warn('[Jikan] Chapter lists not available from MyAnimeList API');
    return [];
}

module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    searchManga,
    getPopularManga
};
