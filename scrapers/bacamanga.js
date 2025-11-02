// ===== BacaManga Scraper (Madara theme variants) =====
const cheerio = require('cheerio');
const { pickImage } = require('../scraperUtils');
const { fetchWithScraperAPI, withRetry } = require('../utils/httpClient');

const BASE_URLS = [
    'https://bacamanga.cc',
    'https://komikindo.ch'
];

// ===== Public API =====
async function getMangaList(page = 1) {
    for (const base of BASE_URLS) {
        const urls = buildListUrls(base, page);
        for (const url of urls) {
            try {
                const html = await fetchPage(url);
                const list = parseList(html, base);
                if (list.length) {
                    return list;
                }
            } catch (error) {
                console.warn(`BacaManga getMangaList warning (${url}):`, error.message);
            }
        }
    }

    return [];
}

async function getMangaDetail(mangaId) {
    try {
        const detail = await fetchDetailDocument(mangaId);
        if (!detail.$) return null;

        const { $, url, base } = detail;

        const title = cleanText($('.entry-title, .post-title h1').first().text());
        if (!title) return null;

        const altTitle = cleanText(
            $('.alternative, .alter, .summary__alternate-name')
                .first()
                .text()
                .replace(/Alternative\s*:?\s*/i, '')
        );

        const cover = normalizeUrl(
            pickImage($('.thumb img, .summary_image img, .summary__thumbnail img').first()),
            base
        );

        const rating =
            cleanText($('.rating-prc .num, .summary-content .post-total-rating').first().text()) ||
            '8.0';

        const status = formatStatus(findInfo($, ['Status', 'Status Manga', 'Status Rilis']) || 'Ongoing');

        const type = findInfo($, ['Jenis', 'Type', 'Format']) || 'Manga';

        const author = findInfo($, ['Pengarang', 'Author', 'Penulis']) || 'Unknown';
        const artist = findInfo($, ['Artist', 'Seniman']) || author;

        const genres = [];
        $('.mgen a, .genres a, .genre a, .summary__content a').each((_, el) => {
            const text = cleanText($(el).text());
            if (text) genres.push(text);
        });

        const description =
            cleanText(
                $(
                    '.entry-content[itemprop="description"], .summary__content, .description-summary, .summary, .entry-content'
                )
                    .first()
                    .text()
            ) || '';

        return {
            id: extractSlug(url, base),
            title,
            altTitle,
            cover,
            rating,
            status,
            type,
            author,
            artist,
            genres,
            description,
            source: 'bacamanga',
            url
        };
    } catch (error) {
        console.error('BacaManga getMangaDetail error:', error.message);
        return null;
    }
}

async function getChapters(mangaId) {
    try {
        console.log('[BacaManga] getChapters called for:', mangaId);
        const detail = await fetchDetailDocument(mangaId);

        if (!detail.$) {
            console.warn('[BacaManga] Failed to load detail page for:', mangaId);
            return [];
        }

        const { $, base } = detail;
        const chapters = [];

        const selectors = [
            '#chapterlist li',
            '.eplister ul li',
            '.cl ul li',
            'ul.main li',
            '.list-scrollbar ul li',
            '#chapter-section .wp-manga-chapter',
            '.chapter-list li',
            '.chapters li'
        ];

        const foundElements = $(selectors.join(',')).length;
        console.log(`[BacaManga] Found ${foundElements} chapter elements`);

        $(selectors.join(',')).each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a').first();
            if (!$link.length) return;

            const chapterUrl = normalizeUrl($link.attr('href') || '', base);
            if (!chapterUrl) return;

            const title = cleanText(
                $link.find('.chapternum').text() ||
                    $link.find('.chapter-name').text() ||
                    $link.text()
            );

            const chapterId = extractChapterId(chapterUrl, base);
            const number = extractChapterNumber(title);
            const dateText = cleanText(
                $el
                    .find('.chapterdate, .chapter-date, .releasedate, .chapter-release-date time')
                    .first()
                    .text()
            );

            if (!chapterId || !title) return;

            chapters.push({
                id: chapterId,
                title,
                number,
                date: formatDate(dateText),
                url: chapterUrl,
                isNew: isNewChapter(dateText)
            });
        });

        console.log(`[BacaManga] Extracted ${chapters.length} chapters`);
        return chapters;
    } catch (error) {
        console.error('[BacaManga] getChapters error:', error.message);
        return [];
    }
}

async function getChapterPages(chapterId) {
    try {
        const candidates = [];
        if (chapterId.startsWith('http')) {
            candidates.push(chapterId);
        } else {
            for (const base of BASE_URLS) {
                candidates.push(`${base}/${chapterId}/`);
                candidates.push(`${base}/${chapterId}`);
            }
        }

        for (const url of candidates) {
            try {
                const html = await fetchPage(url, { render: true });
                if (!html || html.length < 400) continue;

                const $ = cheerio.load(html);
                const pages = [];

                $('#readerarea img, .reading-content img, #Baca_Komik img')
                    .add('.wp-manga-chapter-img')
                    .each((index, element) => {
                        try {
                            const $img = $(element);
                            const src = pickImage($img);
                            if (!src) return;
                            const normalized = normalizeUrl(src);
                            if (!normalized || normalized.includes('loading') || normalized.includes('lazy')) return;

                            pages.push({
                                page: pages.length + 1,
                                url: normalized,
                                highQuality: normalized,
                                lowQuality: normalized
                            });
                        } catch (err) {
                            console.error('Error parsing page image in getChapterPages (bacamanga):', err);
                        }
                    });

                if (pages.length) return pages;
            } catch (error) {
                console.warn(`BacaManga getChapterPages warning (${url}):`, error.message);
            }
        }

        return [];
    } catch (error) {
        console.error('BacaManga getChapterPages error:', error.message);
        return [];
    }
}

async function searchManga(query) {
    if (!query) return [];

    for (const base of BASE_URLS) {
        const url = `${base}/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
        try {
            const html = await fetchPage(url);
            const results = parseList(html, base);
            if (results.length) return results;
        } catch (error) {
            console.warn(`BacaManga search warning (${url}):`, error.message);
        }
    }

    return [];
}

async function getPopularManga(limit = 20) {
    try {
        const list = await getMangaList(1);
        return list.slice(0, limit);
    } catch (error) {
        console.error('BacaManga getPopularManga error:', error.message);
        return [];
    }
}

// ===== Helpers =====
function buildListUrls(base, page) {
    const urls = new Set();
    const add = url => {
        if (url) urls.add(url.trim());
    };

    if (page <= 1) {
        add(`${base}/manga/`);
        add(`${base}/daftar-komik/`);
        add(`${base}/`);
    }

    add(`${base}/manga/?page=${page}`);
    add(`${base}/manga/page/${page}/`);
    add(`${base}/daftar-komik/page/${page}/`);
    add(`${base}/manga/?page=${page}&order=update`);
    add(`${base}/manga/page/${page}/?order=update`);
    add(`${base}/manga/?page=${page}&m_orderby=latest`);
    add(`${base}/manga/page/${page}/?m_orderby=latest`);
    add(`${base}/?page=${page}`);
    add(`${base}/page/${page}/`);

    return Array.from(urls);
}

async function fetchPage(url, extraOptions = {}) {
    return withRetry(() =>
        fetchWithScraperAPI(url, {
            premium: true,
            country_code: 'id',
            ...extraOptions
        })
    );
}

async function fetchDetailDocument(mangaId) {
    const candidates = [];

    if (mangaId.startsWith('http')) {
        candidates.push(mangaId);
    } else {
        const clean = mangaId.replace(/^\/|\/$/g, '');
        const paths = ['manga', 'komik', 'comic', 'series'];
        for (const base of BASE_URLS) {
            for (const path of paths) {
                candidates.push(`${base}/${path}/${clean}/`);
            }
        }
    }

    for (const url of candidates) {
        try {
            const html = await fetchPage(url);
            if (html && html.length >= 400) {
                const base = deriveBase(url);
                return { url, base, $: cheerio.load(html) };
            }
        } catch (error) {
            console.warn(`BacaManga fetchDetailDocument warning (${url}):`, error.message);
        }
    }

    const fallback = candidates[0] || '';
    return { url: fallback, base: deriveBase(fallback), $: null };
}

function parseList(html, base) {
    if (!html || typeof html !== 'string' || html.length < 400) {
        return [];
    }

    const $ = cheerio.load(html);
    const seen = new Set();
    return collectMangaCards($, seen, base);
}

function collectMangaCards($, seen, base) {
    const entries = [];
    const selectors = [
        '.listupd .bs',
        '.listupd .bsx',
        '.listupd .animepost',
        '.list-update .postbody',
        '.list-manga .manga-item',
        '.c-tabs-item__content .item-summary',
        '.search-content .post',
        '.search-content .bs',
        '.page-content-listing .page-item-detail'
    ];

    selectors.forEach(selector => {
        $(selector).each((_, element) => {
            const mapped = mapCard($, $(element), seen, base);
            if (mapped) entries.push(mapped);
        });
    });

    return entries;
}

function mapCard($, $element, seen, base) {
    if (!$element || !$element.length) return null;

    let $link = $element.find('.bsx a').first();
    if (!$link.length) $link = $element.find('.thumb a').first();
    if (!$link.length) $link = $element.find('.animposx > a').first();
    if (!$link.length) $link = $element.find('.item-thumb a').first();
    if (!$link.length) $link = $element.find('.item-summary a').first();
    if (!$link.length) $link = $element.find('a').first();
    if (!$link.length) return null;

    const href = $link.attr('href') || '';
    const url = normalizeUrl(href, base);
    const id = extractSlug(url || href, base);
    if (!id || seen.has(id)) return null;
    seen.add(id);

    const title = cleanText($link.attr('title') || $link.text());
    if (!title) return null;

    const cover = normalizeUrl(pickImage($element.find('img').first()), base);

    const rating =
        cleanText($element.find('.numscore, .rating, .score, .post-total-rating').first().text()) ||
        '8.0';

    const latestText = cleanText(
        $element
            .find(
                '.adds .lsch a, .lsch a, .latest-chap a, .chapter a, .epxs a, .epxs, .chapter, .latest-chap, .chapter-item, .list-chapter .chapter'
            )
            .first()
            .text()
    );
    const latestChapter = extractChapterNumber(latestText);

    const status = formatStatus(
        cleanText($element.find('.status, .mstat, .status-value').first().text()) || 'Ongoing'
    );

    const type =
        cleanText($element.find('.type, .typeflag, .series-type').first().text()) ||
        'Manga';

    return {
        id,
        title,
        cover,
        rating,
        latestChapter,
        status,
        type,
        source: 'bacamanga',
        url
    };
}

function findInfo($, labels = []) {
    if (!labels.length) return '';
    const selectors = ['.tsinfo .imptdt', '.post-content_item', '.summary-content .post-content_item'];
    const searchLabels = labels.map(label => label.toLowerCase());

    for (const selector of selectors) {
        let result = '';
        $(selector).each((_, el) => {
            const text = cleanText($(el).text());
            if (!text) return;

            const lowered = text.toLowerCase();
            if (searchLabels.some(label => lowered.includes(label))) {
                result =
                    cleanText($(el).find('a, span, i').last().text()) ||
                    cleanText(text.replace(/^[^:]+:\s*/, ''));
                return false;
            }
        });
        if (result) return result;
    }

    return '';
}

function normalizeUrl(src, base = BASE_URLS[0]) {
    if (!src) return '';
    const trimmed = src.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `${base}${trimmed}`;
    return `${base}/${trimmed}`;
}

function extractSlug(url, base = BASE_URLS[0]) {
    if (!url) return '';
    try {
        const parsed = new URL(url, base);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (!parts.length) return '';
        if (parts[0].toLowerCase() === 'manga' || parts[0].toLowerCase() === 'komik') {
            return parts[1] || '';
        }
        return parts.pop() || '';
    } catch (error) {
        const match = url.match(/\/(manga|komik)\/([^\/]+)/i);
        if (match && match[2]) return match[2];
        const parts = url.split('/').filter(Boolean);
        return parts.pop() || '';
    }
}

function extractChapterId(url, base = BASE_URLS[0]) {
    if (!url) return '';
    try {
        const parsed = new URL(url, base);
        const parts = parsed.pathname.split('/').filter(Boolean);
        return parts.pop() || '';
    } catch (error) {
        const parts = url.split('/').filter(Boolean);
        return parts.pop() || url;
    }
}

function extractChapterNumber(text) {
    if (!text) return 0;
    const match = text.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    const lower = status.toLowerCase();
    if (lower.includes('ongoing') || lower.includes('berlanjut')) return 'Ongoing';
    if (
        lower.includes('completed') ||
        lower.includes('tamat') ||
        lower.includes('selesai') ||
        lower.includes('end')
    ) {
        return 'Completed';
    }
    if (lower.includes('hiatus')) return 'Hiatus';
    if (lower.includes('cancel')) return 'Cancelled';
    return status || 'Unknown';
}

function cleanText(text = '') {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    const lower = dateStr.toLowerCase();
    if (
        lower.includes('ago') ||
        lower.includes('lalu') ||
        lower.includes('hari') ||
        lower.includes('jam') ||
        lower.includes('menit') ||
        lower.includes('detik')
    ) {
        return new Date().toISOString();
    }

    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }

    return new Date().toISOString();
}

function isNewChapter(dateStr) {
    try {
        const parsed = new Date(formatDate(dateStr));
        const diffDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
    } catch (error) {
        return false;
    }
}

function deriveBase(url) {
    if (!url) return BASE_URLS[0];
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
        return BASE_URLS[0];
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
