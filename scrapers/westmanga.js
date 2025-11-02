// ===== WestManga Scraper (DISABLED due to connection issues) =====
// This scraper is currently disabled due to 403/404 errors on the source websites

// Mock functions that return empty results to prevent errors
async function getMangaList(page = 1) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return [];
}

async function getMangaDetail(mangaId) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return null;
}

async function getChapters(mangaId) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return [];
}

async function getChapterPages(chapterId) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return [];
}

async function searchManga(query) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return [];
}

async function getPopularManga(limit = 20) {
    console.log('[WestManga] Scraper disabled due to connection issues');
    return [];
}

module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    getChapterPages,
    searchManga,
    getPopularManga
};

