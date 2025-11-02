// ===== Kiryuu Scraper =====
// Web scraping untuk kiryuu03.com

const cheerio = require('cheerio');
const { pickImage } = require('../scraperUtils');
const { fetchDirect, withRetry } = require('../utils/httpClient');

const BASE_URL = 'https://kiryuu03.com';

// ===== Get Manga List =====
async function getMangaList(page = 1) {
    try {
        const url = page === 1 ? `${BASE_URL}/manga/` : `${BASE_URL}/manga/?page=${page}`;

        const html = await withRetry(() => fetchDirect(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            }
        }));

        const $ = cheerio.load(html);
        const items = [];

        // Kiryuu uses WordPress block layout
        $('.wp-block-post-template a, .manga-grid a, .manga-card a').each((_, element) => {
            try {
                const $el = $(element);
                const url = $el.attr('href');
                if (!url || !url.includes('/manga/')) return;

                const id = extractIdFromUrl(url);
                const title = $el.find('h3, .title').text().trim() || $el.attr('title') || '';
                if (!title) return;

                const cover = pickImage($el.find('img').first());
                const rating = $el.find('.rating, .score').text().trim() || '8.0';
                const type = $el.find('.type-icon, .badge').text().trim() || 'Manga';

                if (id) {
                    items.push({
                        id,
                        title,
                        cover: normalizeImage(cover),
                        rating,
                        type: formatType(type),
                        source: 'kiryuu',
                        url
                    });
                }
            } catch (err) {
                console.error('[Kiryuu] Error parsing manga item:', err.message);
            }
        });

        return items;
    } catch (error) {
        console.error('[Kiryuu] getMangaList error:', error.message);
        return [];
    }
}

// ===== Get Manga Detail =====
async function getMangaDetail(mangaId) {
    try {
        const url = resolveUrl(mangaId.startsWith('http') ? mangaId : `/manga/${mangaId}/`);

        const html = await withRetry(() => fetchDirect(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }));

        const $ = cheerio.load(html);

        const title = $('.entry-title, .manga-title, h1').first().text().trim();
        const cover = normalizeImage(pickImage($('.manga-cover img, .wp-post-image').first()));
        const rating = $('.rating, .score').first().text().trim() || '8.0';
        const status = $('strong:contains("Status")').parent().text().replace(/Status[\s:]/gi, '').trim() || 'Unknown';
        const type = $('strong:contains("Type")').parent().text().replace(/Type[\s:]/gi, '').trim() || 'Manga';
        const description = $('.description, .synopsis, .entry-content p').first().text().trim();

        // Get genres
        const genres = [];
        $('.genres a, .genre-tag').each((_, el) => {
            const genre = $(el).text().trim();
            if (genre && !genres.includes(genre)) {
                genres.push(genre);
            }
        });

        return {
            id: mangaId,
            title,
            cover,
            rating,
            status,
            type: formatType(type),
            description,
            genres,
            source: 'kiryuu',
            url
        };
    } catch (error) {
        console.error('[Kiryuu] getMangaDetail error:', error.message);
        return null;
    }
}

// ===== Get Chapters =====
async function getChapters(mangaId) {
    try {
        const url = resolveUrl(mangaId.startsWith('http') ? mangaId : `/manga/${mangaId}/`);

        const html = await withRetry(() => fetchDirect(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }));

        const $ = cheerio.load(html);
        const chapters = [];

        // Kiryuu loads chapters via AJAX, but we can get them from static HTML too
        $('.chapter-list a, .chapters a, a[href*="/chapter-"]').each((_, element) => {
            try {
                const $el = $(element);
                const chapterUrl = $el.attr('href');
                if (!chapterUrl || !chapterUrl.includes('/chapter-')) return;

                const chapterId = extractChapterIdFromUrl(chapterUrl);
                const title = $el.text().trim() || `Chapter ${chapterId}`;
                const date = $el.find('.date, time').text().trim() || new Date().toISOString();

                chapters.push({
                    id: chapterId,
                    title,
                    date,
                    url: chapterUrl
                });
            } catch (err) {
                console.error('[Kiryuu] Error parsing chapter:', err.message);
            }
        });

        return chapters.reverse(); // Latest first
    } catch (error) {
        console.error('[Kiryuu] getChapters error:', error.message);
        return [];
    }
}

// ===== Helper Functions =====
function extractIdFromUrl(url) {
    try {
        const match = url.match(/\/manga\/([^\/]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function extractChapterIdFromUrl(url) {
    try {
        const match = url.match(/chapter-([^\/]+)/);
        return match ? match[1].replace(/\.\d+$/, '') : null;
    } catch {
        return null;
    }
}

function resolveUrl(path) {
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}

function normalizeImage(imgUrl) {
    if (!imgUrl) return null;
    if (imgUrl.startsWith('http')) return imgUrl;
    if (imgUrl.startsWith('//')) return 'https:' + imgUrl;
    return `${BASE_URL}${imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl}`;
}

function formatType(type) {
    const typeMap = {
        'manhua': 'Manhua',
        'manhwa': 'Manhwa',
        'manga': 'Manga'
    };
    return typeMap[type.toLowerCase()] || 'Manga';
}

module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters
};
