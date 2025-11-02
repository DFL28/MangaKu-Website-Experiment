// ===== Komiku Scraper (Optimized with ScraperAPI) =====
// Web scraping untuk Komiku.id menggunakan ScraperAPI dengan proxy rotation

const cheerio = require('cheerio');
const { pickImage } = require('../scraperUtils');
const { fetchWithScraperAPI, fetchDirect, batchProcess, withRetry } = require('../utils/httpClient');

const BASE_URL = 'https://komiku.id';
const API_BASE = `${BASE_URL}/wp-json/wp/v2`;

// ===== Get Manga List =====
async function getMangaList(page = 1) {
    try {
        const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;

        const html = await withRetry(() =>
            fetchWithScraperAPI(url, {
                premium: true,
                country_code: 'id'
            })
        );

        const $ = cheerio.load(html);
        const items = new Map();

        const cardSelectors = [
            '#Terbaru article.ls4',
            '#Rekomendasi_Komik article.ls2',
            '.ls4w article.ls4',
            '.listupd .animepost'
        ];

        $(cardSelectors.join(',')).each((_, element) => {
            try {
                const $el = $(element);
                const $link = $el.find('a').first();
                if (!$link.length) return;

                const url = resolveUrl($link.attr('href'));
                const id = extractIdFromUrl(url);
                const title = ($link.attr('title') || $el.find('h3, h4').first().text() || $link.text()).trim();
                if (!id || !title) return;

                const cover = normalizeImage(pickImage($el.find('img').first()));

                const latestChapterText = $el.find('.ls24, .ls2l, .lsch a, .adds .lsch a').first().text().trim();
                const latestChapter = extractChapterNumber(latestChapterText);

                const type =
                    $el.find('.type, .typeflag').first().text().trim() ||
                    (latestChapterText.includes('Ch') ? 'Manga' : 'Komik');

                const ratingText =
                    $el.find('.loveviews, .numscore, .rating').first().text().trim() ||
                    $el.find('.ls4s').first().text().trim();
                const rating = ratingText ? ratingText.replace(/[^\d.]/g, '') || '8.0' : '8.0';

                if (!items.has(id)) {
                    items.set(id, {
                        id,
                        title,
                        cover,
                        rating,
                        latestChapter,
                        type: type || 'Manga',
                        status: 'Unknown',
                        source: 'komiku',
                        url
                    });
                }
            } catch (err) {
                console.error('Error parsing manga item in getMangaList (komiku):', err);
            }
        });

        return Array.from(items.values());
    } catch (error) {
        console.error('Komiku getMangaList error:', error.message);
        return [];
    }
}

// ===== Get Manga Detail =====
async function getMangaDetail(mangaId) {
    try {
        const url = resolveUrl(mangaId.startsWith('http') ? mangaId : `/manga/${mangaId}/`);

        const html = await withRetry(() =>
            fetchWithScraperAPI(url, {
                premium: true,
                country_code: 'id'
                // Removed render: true to reduce loading time
            })
        );

        const $ = cheerio.load(html);

        const title = decodeHtml(
            $('#Judul h1 span, #Judul h1, .judul h1, .entry-title, h1.title')
                .first()
                .text()
        );
        const altTitle = $('.j2, .alternative, .alter').first().text().replace(/Alternative[\s:]/gi, '').trim();

        const cover = normalizeImage(
            pickImage($('.ims img, .thumb img, img.attachment-post-thumbnail, .flexbox3-thumb img').first())
        );

        const rating = $('.nilaiskor, .rating .num, [itemprop="ratingValue"]').first().text().trim() || '8.0';

        // Get status
        let status = '';
        $('.inftable tr, .spe span, .tsinfo .imptdt').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Status')) {
                status = $(el).find('td').last().text().trim() ||
                        $(el).text().replace(/Status[\s:]/gi, '').trim();
            }
        });

        // Get type
        let type = '';
        $('.inftable tr, .spe span, .tsinfo .imptdt').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Jenis') || text.includes('Type')) {
                type = $(el).find('td').last().text().trim() ||
                      $(el).text().replace(/Jenis[\s:]/gi, '').replace(/Type[\s:]/gi, '').trim();
            }
        });

        // Get author
        let author = '';
        $('.inftable tr, .spe span, .tsinfo .imptdt').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Pengarang') || text.includes('Author')) {
                author = $(el).find('td').last().text().trim() ||
                        $(el).text().replace(/Pengarang[\s:]/gi, '').replace(/Author[\s:]/gi, '').trim();
            }
        });

        const description = $(
            '.desc p, .entry-content p, .sinopsis p, #sinopsis p, #Sinopsis p'
        )
            .first()
            .text()
            .trim() ||
            $('.desc, .entry-content, .sinopsis, #sinopsis, #Sinopsis')
                .first()
                .text()
                .trim();

        // Get genres
        const genres = [];
        $('.genre a, .genre-info a, .mgen a, .seriesgenre a, .genres a').each((_, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });

        if (!title) {
            console.error("Could not find title for mangaId:", mangaId);
            return null;
        }

        return {
            id: mangaId,
            title,
            altTitle,
            cover,
            rating,
            status: formatStatus(status),
            type: type || 'Manga',
            author: author || 'Unknown',
            artist: author || 'Unknown',
            genres,
            description: description || 'Tidak ada deskripsi',
            source: 'komiku',
            url
        };
    } catch (error) {
        console.error('Komiku getMangaDetail error:', error.message);
        return null;
    }
}

// ===== Get Chapters (Parallel Async) =====
async function getChapters(mangaId) {
    try {
        const url = mangaId.startsWith('http') ? mangaId : `${BASE_URL}/manga/${mangaId}/`;

        const html = await withRetry(() =>
            fetchWithScraperAPI(url, {
                premium: true,
                country_code: 'id'
                // Removed render: true to reduce loading time
            })
        );

        const $ = cheerio.load(html);
        const chapters = [];

        const tableRows = $('#Daftar_Chapter tbody tr');
        tableRows.each((_, row) => {
            try {
                const $row = $(row);
                const $link = $row.find('td.judulseries a').first();
                if (!$link.length) return;

                const title = $link.find('span').text().trim() || $link.text().trim();
                const chapterUrl = resolveUrl($link.attr('href') || '');
                const chapterId = extractChapterIdFromUrl(chapterUrl);
                const number = extractChapterNumber(title);

                const dateText = $row.find('.tanggalseries').text().trim();

                if (chapterId && title) {
                    chapters.push({
                        id: chapterId,
                        title,
                        number,
                        date: formatDate(dateText),
                        url: chapterUrl,
                        isNew: isNewChapter(dateText)
                    });
                }
            } catch (err) {
                console.error('Error parsing chapter table row in getChapters (komiku):', err);
            }
        });

        if (chapters.length === 0) {
            $('#chapter .lchx a, #daftar-chapter .chapter a, .cl ul li a, #chapterlist li a').each((_, element) => {
                try {
                    const $el = $(element);
                    const title = $el.find('.lch, .chapternum').text().trim() || $el.text().trim();
                    const chapterUrl = resolveUrl($el.attr('href') || '');
                    const chapterId = extractChapterIdFromUrl(chapterUrl);
                    const number = extractChapterNumber(title);

                    const dateEl = $el.closest('li, .lchx').find('.date, .chapterdate, time');
                    const date = dateEl.text().trim() || dateEl.attr('datetime') || new Date().toISOString();

                    if (chapterId && title) {
                        chapters.push({
                            id: chapterId,
                            title,
                            number,
                            date: formatDate(date),
                            url: chapterUrl,
                            isNew: isNewChapter(date)
                        });
                    }
                } catch (err) {
                    console.error('Error parsing chapter item in getChapters (komiku):', err);
                }
            });
        }

        // Sort chapters by number in descending order (newest first)
        chapters.sort((a, b) => b.number - a.number);

        return chapters;
    } catch (error) {
        console.error('Komiku getChapters error:', error.message);
        return [];
    }
}

// ===== Get Chapter Pages =====
async function getChapterPages(chapterId) {
    try {
        const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}/${chapterId}/`;

        const html = await withRetry(() =>
            fetchWithScraperAPI(url, {
                premium: true,
                country_code: 'id',
                render: true // Enable JavaScript rendering for dynamic images
            })
        );

        const $ = cheerio.load(html);
        const pages = [];

        $('#Baca_Komik img, .main-reading-area img, #readerarea img, .reader-area img, .fs img, img.klazy')
            .each((i, element) => {
                try {
                    const $img = $(element);
                    const src = pickImage($img);
                    if (!src) return;

                    const normalized = normalizeImage(src);
                    if (!normalized || normalized.includes('loading') || normalized.includes('lazy')) return;

                    pages.push({
                        page: pages.length + 1,
                        url: normalized,
                        highQuality: normalized,
                        lowQuality: normalized
                    });
                } catch (err) {
                    console.error('Error parsing page image in getChapterPages (komiku):', err);
                }
            });

        return pages;
    } catch (error) {
        console.error('Komiku getChapterPages error:', error.message);
        return [];
    }
}

// ===== Search Manga =====
async function searchManga(query) {
    try {
        const params = new URLSearchParams({
            search: query,
            per_page: '10',
            orderby: 'relevance',
            _embed: '1'
        });

        const data = await withRetry(() =>
            fetchDirect(`${API_BASE}/manga?${params.toString()}`, {
                headers: { Accept: 'application/json' }
            })
        );

        return (Array.isArray(data) ? data : []).map(mapWpMangaItem);
    } catch (error) {
        console.error('Komiku searchManga error:', error.message);
        return [];
    }
}

// ===== Get Popular Manga =====
async function getPopularManga(limit = 20) {
    try {
        // Komiku homepage usually shows popular manga
        const list = await getMangaList(1);
        return list.slice(0, limit);
    } catch (error) {
        console.error('Komiku getPopularManga error:', error.message);
        return [];
    }
}

// ===== Helper Functions =====

function resolveUrl(url = '') {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function normalizeImage(src = '') {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    if (src.startsWith('//')) return `https:${src}`;
    return `${BASE_URL}${src.startsWith('/') ? src : `/${src}`}`;
}

function decodeHtml(text = '') {
    if (!text) return '';
    const $ = cheerio.load(`<span>${text}</span>`);
    return $('span').text().trim();
}

function mapWpMangaItem(item = {}) {
    // Replace optional chaining with compatible syntax
    let title = '';
    if (item.title && item.title.rendered) {
        title = decodeHtml(item.title.rendered);
    } else if (item.title) {
        title = decodeHtml(item.title);
    }
    
    let cover = '';
    if (item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0]) {
        const coverMedia = item._embedded['wp:featuredmedia'][0];
        if (coverMedia.source_url) {
            cover = normalizeImage(coverMedia.source_url);
        } else if (coverMedia.media_details && coverMedia.media_details.sizes && coverMedia.media_details.sizes.medium && coverMedia.media_details.sizes.medium.source_url) {
            cover = normalizeImage(coverMedia.media_details.sizes.medium.source_url);
        } else if (coverMedia.media_details && coverMedia.media_details.sizes && coverMedia.media_details.sizes.thumbnail && coverMedia.media_details.sizes.thumbnail.source_url) {
            cover = normalizeImage(coverMedia.media_details.sizes.thumbnail.source_url);
        }
    }

    const link = resolveUrl(item.link || `${BASE_URL}/manga/${item.slug || ''}/`);

    return {
        id: item.slug || String(item.id || ''),
        title: title || item.slug || 'Unknown',
        cover,
        rating: '8.0',
        latestChapter: null,
        type: Array.isArray(item.tipe) && item.tipe.length ? item.tipe[0] : 'Manga',
        status: 'Unknown',
        source: 'komiku',
        url: link
    };
}

function extractIdFromUrl(url) {
    if (!url) return '';
    // Extract slug from URL like https://komiku.id/manga/manga-slug/
    const match = url.match(/\/manga\/([^\/]+)/i) || url.match(/\/([^\/]+)\/?$/);
    return match ? match[1].replace(/\/$/, '') : '';
}

function extractChapterIdFromUrl(url) {
    if (!url) return '';
    // Extract chapter slug from URL
    const parts = url
        .split('/')
        .filter(
            p =>
                p &&
                p !== 'https:' &&
                p !== 'http:' &&
                p !== 'komiku.id' &&
                p !== 'www.komiku.id' &&
                p !== 'secure.komikid.org' &&
                p !== 'komikid.org'
        );
    return parts[parts.length - 1] || url;
}

function extractChapterNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('ongoing') || statusLower.includes('berlanjut')) return 'Ongoing';
    if (statusLower.includes('completed') || statusLower.includes('tamat') || statusLower.includes('selesai')) return 'Completed';
    if (statusLower.includes('hiatus')) return 'Hiatus';
    return status;
}

function formatDate(dateStr) {
    try {
        if (!dateStr) return new Date().toISOString();

        // Check if already ISO format
        if (dateStr.includes('T') && dateStr.includes('Z')) {
            return dateStr;
        }

        // Handle relative dates (Indonesian)
        if (dateStr.includes('hari') || dateStr.includes('jam') || dateStr.includes('menit') || dateStr.includes('detik')) {
            return new Date().toISOString();
        }

        // Try to parse as date
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

function isNewChapter(dateStr) {
    try {
        const chapterDate = new Date(formatDate(dateStr));
        const now = new Date();
        const diffDays = Math.floor((now - chapterDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    } catch (error) {
        return false;
    }
}

// ===== Export =====
module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    getChapterPages,
    searchManga,
    getPopularManga
};