// ===== Maid.my.id Scraper (Madara theme focused on /manga) =====
const cheerio = require('cheerio');
const { fetchWithScraperAPI, withRetry } = require('../utils/httpClient');

const BASE_URL = 'https://www.maid.my.id';

// ===== Public API =====
async function getMangaList(page = 1) {
    const urls = buildListUrls(page);

    for (const url of urls) {
        try {
            const html = await fetchPage(url);
            const list = parseList(html);
            if (list.length) {
                return list;
            }
        } catch (error) {
            console.warn(`Maid getMangaList warning (${url}):`, error.message);
        }
    }

    return [];
}

async function getMangaDetail(mangaId) {
    try {
        const { url, $ } = await fetchDetailDocument(mangaId);
        if (!$) return null;

        const title = cleanText($('.entry-title').first().text());
        if (!title) return null;

        const altTitle = cleanText(
            $('.alternative, .alter, .summary__alternate-name')
                .first()
                .text()
                .replace(/Alternative\s*:?\s*/i, '')
        );

        const cover = normalizeUrl(
            pickImage($('.thumb img, .summary_image img, .c-figure__image img').first())
        );

        const rating =
            cleanText($('.rating-prc .num, .summary-content .post-total-rating').first().text()) ||
            '8.0';

        const status = formatStatus(
            findInfo($, ['Status', 'Status Rilis', 'Status Manga']) || 'Ongoing'
        );

        const type =
            findInfo($, ['Jenis', 'Type', 'Format']) ||
            'Manga';

        const author =
            findInfo($, ['Pengarang', 'Author', 'Penulis']) ||
            'Unknown';

        const artist =
            findInfo($, ['Artist', 'Seniman']) ||
            author;

        const genres = [];
        $('.mgen a, .genres a, .genre a, .summary-content a').each((_, el) => {
            const text = cleanText($(el).text());
            if (text) genres.push(text);
        });

        const description =
            cleanText(
                $('.entry-content[itemprop="description"], .description-summary .summary__content, .summary__content, .entry-content, .description p')
                    .first()
                    .text()
            ) || '';

        return {
            id: extractSlug(url),
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
            source: 'maid',
            url
        };
    } catch (error) {
        console.error('Maid getMangaDetail error:', error.message);
        return null;
    }
}

async function getChapters(mangaId) {
    try {
        const { $ } = await fetchDetailDocument(mangaId);
        if (!$) return [];

        const chapters = [];
        $('#chapterlist li, .eplister ul li, ul.main li').each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a').first();
            if (!$link.length) return;

            const chapterUrl = normalizeUrl($link.attr('href') || '');
            if (!chapterUrl) return;

            const title = cleanText(
                $link.find('.chapternum').text() || $link.find('.chapter-name').text() || $link.text()
            );
            const chapterId = extractChapterId(chapterUrl);
            const number = extractChapterNumber(title);
            const dateText = cleanText(
                $el.find('.chapterdate, .chapter-date, .releasedate').first().text()
            );

            chapters.push({
                id: chapterId,
                title: title || `Chapter ${number || 0}`,
                number,
                date: formatDate(dateText),
                url: chapterUrl,
                isNew: isNewChapter(dateText)
            });
        });

        chapters.sort((a, b) => {
            if (a.number && b.number && a.number !== b.number) {
                return a.number - b.number;
            }
            return a.title.localeCompare(b.title);
        });

        return chapters;
    } catch (error) {
        console.error('Maid getChapters error:', error.message);
        return [];
    }
}

async function getChapterPages(chapterId) {
    const candidates = [];

    if (chapterId.startsWith('http')) {
        candidates.push(chapterId);
    } else {
        const cleanId = chapterId.replace(/^\/|\/$/g, '');
        const paths = ['', 'chapter', 'manga', 'comic', 'komik', 'series'];
        for (const path of paths) {
            if (!path) {
                candidates.push(`${BASE_URL}/${cleanId}/`);
            } else {
                candidates.push(`${BASE_URL}/${path}/${cleanId}/`);
            }
        }
    }

    for (const url of candidates) {
        try {
            const html = await fetchPage(url, { render: true });
            if (!html || html.length < 400) continue;

            const $ = cheerio.load(html);
            const pages = [];

            $('#readerarea img, .reader-area img, .reading-content img, .entry-content img, #chapter img').each(
                (index, img) => {
                    const src = normalizeUrl(pickImage($(img)));
                    if (!src || src.includes('loading')) return;

                    pages.push({
                        page: index + 1,
                        url: src,
                        highQuality: src,
                        lowQuality: src
                    });
                }
            );

            if (pages.length) {
                return pages;
            }

            const matchImages =
                html.match(/https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp)/gi) || [];
            if (matchImages.length) {
                return matchImages.map((img, index) => ({
                    page: index + 1,
                    url: img,
                    highQuality: img,
                    lowQuality: img
                }));
            }
        } catch (error) {
            console.error('Maid getChapterPages error:', error.message);
        }
    }

    return [];
}

async function searchManga(query) {
    try {
        if (!query) return [];
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
        const html = await fetchPage(url);
        return parseList(html);
    } catch (error) {
        console.error('Maid searchManga error:', error.message);
        return [];
    }
}

async function getPopularManga(limit = 20) {
    try {
        const list = await getMangaList(1);
        return list.slice(0, limit);
    } catch (error) {
        console.error('Maid getPopularManga error:', error.message);
        return [];
    }
}

// ===== Helpers =====
function buildListUrls(page) {
    const urls = new Set();
    const add = (url) => {
        if (!url) return;
        const trimmed = url.trim();
        if (!trimmed) return;
        urls.add(trimmed);
    };

    if (page <= 1) {
        add(`${BASE_URL}/manga/`);
        add(`${BASE_URL}/`);
    }

    add(`${BASE_URL}/manga/?page=${page}`);
    add(`${BASE_URL}/manga/page/${page}/`);
    add(`${BASE_URL}/manga/?page=${page}&order=update`);
    add(`${BASE_URL}/manga/page/${page}/?order=update`);
    add(`${BASE_URL}/manga/?page=${page}&m_orderby=latest`);
    add(`${BASE_URL}/manga/page/${page}/?m_orderby=latest`);
    add(`${BASE_URL}/?page=${page}`);
    add(`${BASE_URL}/page/${page}/`);

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
        const paths = ['manga', 'comic', 'komik', 'series'];
        for (const path of paths) {
            candidates.push(`${BASE_URL}/${path}/${clean}/`);
        }
    }

    for (const url of candidates) {
        try {
            const html = await fetchPage(url);
            if (html && html.length >= 400) {
                return { url, $: cheerio.load(html) };
            }
        } catch (error) {
            console.warn(`Maid fetchDetailDocument warning (${url}):`, error.message);
        }
    }

    return { url: candidates[0] || '', $: null };
}

function parseList(html) {
    if (!html || typeof html !== 'string' || html.length < 400) {
        return [];
    }
    const $ = cheerio.load(html);
    const seen = new Set();
    return collectMangaCards($, seen);
}

function collectMangaCards($, seen) {
    const entries = [];
    const selectors = [
        '.listupd .bs',
        '.listupd .bsx',
        '.listupd .animepost',
        '.listupd li',
        '.flexbox3-item',
        '.flexbox3-content',
        '.c-tabs-item__content .item-summary',
        '.search-content .post',
        '.search-content .bs',
        '.page-content-listing .page-item-detail'
    ];

    selectors.forEach(selector => {
        $(selector).each((_, element) => {
            const mapped = mapCard($, $(element), seen);
            if (mapped) entries.push(mapped);
        });
    });

    return entries;
}

function mapCard($, $element, seen) {
    if (!$element || !$element.length) return null;

    let $link = $element.find('.bsx a').first();
    if (!$link.length) $link = $element.find('.thumb a').first();
    if (!$link.length) $link = $element.find('.item-thumb a').first();
    if (!$link.length) $link = $element.find('.item-summary a').first();
    if (!$link.length) $link = $element.find('a').first();
    if (!$link.length) return null;

    const href = $link.attr('href') || '';
    const url = normalizeUrl(href);
    const id = extractSlug(url || href);
    if (!id || seen.has(id)) return null;
    seen.add(id);

    const title = cleanText($link.attr('title') || $link.text());
    if (!title) return null;

    const cover = normalizeUrl(pickImage($element.find('img').first()));

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
        source: 'maid',
        url
    };
}

function pickImage($img) {
    if (!$img || !$img.length) return '';

    const attrs = ['data-src', 'data-lazy-src', 'data-original', 'data-thumbnail', 'src'];
    for (const attr of attrs) {
        const value = $img.attr(attr);
        if (value && value.trim()) {
            return value.trim();
        }
    }

    const srcset = $img.attr('data-srcset') || $img.attr('srcset');
    if (srcset) {
        const parts = srcset
            .split(',')
            .map(part => part.trim().split(' ')[0])
            .filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
    }

    return '';
}

function normalizeUrl(src) {
    if (!src) return '';
    const trimmed = src.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `${BASE_URL}${trimmed}`;
    return `${BASE_URL}/${trimmed}`;
}

function extractSlug(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url, BASE_URL);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (!parts.length) return '';
        if (parts[0].toLowerCase() === 'manga') {
            return parts[1] || '';
        }
        return parts.pop() || '';
    } catch (error) {
        const match = url.match(/\/manga\/([^\/]+)/i);
        if (match && match[1]) return match[1];
        const parts = url.split('/').filter(Boolean);
        return parts.pop() || '';
    }
}

function extractChapterId(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url, BASE_URL);
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
    const lower = (status || '').toLowerCase();
    if (!lower) return 'Unknown';
    if (lower.includes('ongoing') || lower.includes('berlanjut') || lower.includes('current')) {
        return 'Ongoing';
    }
    if (
        lower.includes('completed') ||
        lower.includes('complete') ||
        lower.includes('tamat') ||
        lower.includes('selesai')
    ) {
        return 'Completed';
    }
    if (lower.includes('hiatus')) return 'Hiatus';
    if (lower.includes('cancel')) return 'Cancelled';
    return status || 'Unknown';
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

// ===== Export =====
module.exports = {
    getMangaList,
    getMangaDetail,
    getChapters,
    getChapterPages,
    searchManga,
    getPopularManga
};
